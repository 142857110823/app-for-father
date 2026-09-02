from __future__ import annotations

import math
from collections import Counter, defaultdict

import numpy as np
from sklearn.linear_model import LogisticRegression

try:
    from lightgbm import LGBMClassifier
except ImportError as exc:  # pragma: no cover - dependency availability is probed in task context
    LGBMClassifier = None
    _LIGHTGBM_IMPORT_ERROR = exc
else:
    _LIGHTGBM_IMPORT_ERROR = None

try:
    import pandas as pd
except ImportError:  # pragma: no cover - optional dependency
    pd = None


__all__ = [
    "fit_logistic_baseline",
    "fit_lightgbm_baseline",
    "fit_conditional_markov_approximation",
    "predict_model",
]


META_COLUMNS = {"draw_id", "draw_index", "draw_date", "number", "is_drawn"}
GAP_BINS = ((0, 0), (1, 1), (2, 3), (4, 7), (8, 15), (16, 31), (32, math.inf))
MOMENTUM_BINS = (0, 1, 2, 3)
MARKOV_WINDOW = 10
SMOOTHING = 1.0


def _require_split(split):
    required = {"draws", "samples", "matrix", "labels", "feature_names", "candidate_numbers", "draw_count", "sample_count"}
    missing = sorted(required - set(split))
    if missing:
        raise ValueError(f"split is missing required keys: {', '.join(missing)}")
    if int(split["draw_count"]) <= 0 or int(split["sample_count"]) <= 0:
        raise ValueError("split must contain at least one draw")
    if len(split["candidate_numbers"]) != 49:
        raise ValueError("split must contain exactly 49 candidate numbers")
    if int(split["sample_count"]) != int(split["draw_count"]) * 49:
        raise ValueError("split sample_count must equal draw_count * 49")
    if not split["feature_names"]:
        raise ValueError("split must include feature_names")
    if any(name in META_COLUMNS for name in split["feature_names"]):
        raise ValueError("feature_names contains metadata columns")


def _prepare_xy(split):
    _require_split(split)
    X = np.asarray(split["matrix"], dtype=float)
    y = np.asarray(split["labels"], dtype=int)
    if X.ndim != 2 or X.shape[0] == 0:
        raise ValueError("split matrix must be a non-empty 2D array")
    if X.shape[0] != y.shape[0]:
        raise ValueError("split matrix and labels must have the same length")
    return X, y


def _chunk_predictions(probabilities, draw_count):
    values = np.asarray(probabilities, dtype=float)
    if values.ndim != 1 or values.size != draw_count * 49:
        raise ValueError("predictions must contain exactly 49 scores per draw")
    rows = values.reshape(draw_count, 49).tolist()
    for row in rows:
        for index, value in enumerate(row):
            if not math.isfinite(value):
                raise ValueError(f"prediction at position {index} is not finite")
            if value < 0.0 or value > 1.0:
                raise ValueError("predictions must be bounded to [0, 1]")
    return rows


def _fit_common_metadata(split, model_type, estimator, random_state=None, extra=None):
    metadata = {
        "model_type": model_type,
        "estimator": estimator,
        "feature_names": tuple(split["feature_names"]),
        "candidate_numbers": tuple(split["candidate_numbers"]),
        "train_draw_count": int(split["draw_count"]),
        "train_sample_count": int(split["sample_count"]),
        "random_state": random_state,
    }
    if extra:
        metadata.update(extra)
    return metadata


def fit_logistic_baseline(train_split, random_state=20260902):
    X, y = _prepare_xy(train_split)
    if pd is not None:
        X = pd.DataFrame(X, columns=train_split["feature_names"])
    estimator = LogisticRegression(
        C=1.0,
        solver="lbfgs",
        max_iter=1000,
        random_state=random_state,
    )
    estimator.fit(X, y)
    return _fit_common_metadata(train_split, "logistic_l2", estimator, random_state=random_state)


def fit_lightgbm_baseline(train_split, random_state=20260902):
    if LGBMClassifier is None:
        raise ImportError("lightgbm is required for fit_lightgbm_baseline") from _LIGHTGBM_IMPORT_ERROR
    X, y = _prepare_xy(train_split)
    if pd is not None:
        X = pd.DataFrame(X, columns=train_split["feature_names"])
    estimator = LGBMClassifier(
        objective="binary",
        n_estimators=200,
        learning_rate=0.05,
        num_leaves=31,
        min_child_samples=20,
        subsample=1.0,
        colsample_bytree=1.0,
        reg_alpha=0.0,
        reg_lambda=0.0,
        random_state=random_state,
        n_jobs=1,
        deterministic=True,
        force_col_wise=True,
        verbosity=-1,
    )
    estimator.fit(X, y)
    return _fit_common_metadata(
        train_split,
        "lightgbm_binary_classifier",
        estimator,
        random_state=random_state,
        extra={
            "tree_family": "lightgbm",
            "ranker_status": "binary_classifier_only",
        },
    )


def _gap_bin(gap):
    for index, (lower, upper) in enumerate(GAP_BINS):
        if lower <= gap <= upper:
            return index
    return len(GAP_BINS) - 1


def _momentum_bin(count):
    if count <= 0:
        return 0
    if count == 1:
        return 1
    if count == 2:
        return 2
    return 3


def _history_state(history_draws):
    last_seen = {number: None for number in range(1, 50)}
    exposure_counts = Counter({number: 0 for number in range(1, 50)})
    for draw_index, truth_numbers in enumerate(history_draws):
        for number in truth_numbers:
            last_seen[number] = draw_index
            exposure_counts[number] += 1
    return last_seen, exposure_counts


def _recent_count(history_draws, number, window):
    count = 0
    for truth_numbers in history_draws[-window:]:
        if number in truth_numbers:
            count += 1
    return count


def fit_conditional_markov_approximation(train_split):
    _require_split(train_split)
    history_draws = [tuple(sorted(int(number) for number in draw["truth_numbers"])) for draw in train_split["draws"]]
    last_seen, exposure_counts = _history_state(history_draws)
    conditional_totals = defaultdict(lambda: Counter())
    candidate_totals = Counter()
    candidate_positives = Counter()
    gap_bin_names = {index: f"gap_bin_{index}" for index in range(len(GAP_BINS))}
    momentum_bin_names = {index: f"momentum_bin_{index}" for index in MOMENTUM_BINS}

    for draw_index, truth_numbers in enumerate(history_draws):
        past_draws = history_draws[:draw_index]
        for number in range(1, 50):
            last_seen_index = last_seen[number]
            gap = draw_index if last_seen_index is None else draw_index - last_seen_index - 1
            gap_bin = _gap_bin(gap)
            momentum_count = _recent_count(past_draws, number, MARKOV_WINDOW)
            momentum_bin = _momentum_bin(momentum_count)
            key = (gap_bin, momentum_bin)
            y = 1 if number in truth_numbers else 0
            conditional_totals[key]["total"] += 1
            conditional_totals[key]["positive"] += y
            candidate_totals[number] += 1
            candidate_positives[number] += y
        for number in truth_numbers:
            last_seen[number] = draw_index

    total_samples = train_split["draw_count"] * 49
    total_positives = sum(candidate_positives.values())
    overall_rate = total_positives / total_samples if total_samples else 0.0

    conditional_table = {}
    for gap_bin in range(len(GAP_BINS)):
        for momentum_bin in MOMENTUM_BINS:
            key = (gap_bin, momentum_bin)
            stats = conditional_totals.get(key, Counter())
            conditional_table[key] = {
                "total": int(stats.get("total", 0)),
                "positive": int(stats.get("positive", 0)),
                "probability": (
                    (stats.get("positive", 0) + SMOOTHING * overall_rate)
                    / (stats.get("total", 0) + SMOOTHING)
                ),
            }

    model = _fit_common_metadata(
        train_split,
        "conditional_markov_approximation",
        None,
        random_state=None,
        extra={
            "formal_crf_status": "not_implemented",
            "history_draws": history_draws,
            "candidate_totals": dict(candidate_totals),
            "candidate_positives": dict(candidate_positives),
            "overall_rate": overall_rate,
            "conditional_table": conditional_table,
            "gap_bin_names": gap_bin_names,
            "momentum_bin_names": momentum_bin_names,
            "window": MARKOV_WINDOW,
            "smoothing": SMOOTHING,
        },
    )
    return model


def _predict_estimator(estimator, split):
    if pd is not None:
        X = pd.DataFrame(split["matrix"], columns=split["feature_names"])
    else:  # pragma: no cover - exercised only when pandas is unavailable
        X = np.asarray(split["matrix"], dtype=float)
    if hasattr(estimator, "predict_proba"):
        probabilities = estimator.predict_proba(X)
        if probabilities.ndim == 2 and probabilities.shape[1] >= 2:
            return probabilities[:, 1]
    raw = estimator.predict(X)
    return np.asarray(raw, dtype=float)


def _markov_predict(model, split):
    _require_split(split)
    history = [tuple(draw) for draw in model["history_draws"]]
    probabilities = []
    candidate_totals = model["candidate_totals"]
    candidate_positives = model["candidate_positives"]
    overall_rate = float(model["overall_rate"])
    conditional_table = model["conditional_table"]
    smoothing = float(model["smoothing"])
    for draw in split["draws"]:
        row = []
        for number in range(1, 50):
            past_draws = history[-MARKOV_WINDOW:]
            last_seen_index = None
            for reverse_index, truth_numbers in enumerate(reversed(history)):
                if number in truth_numbers:
                    last_seen_index = len(history) - reverse_index - 1
                    break
            gap = len(history) if last_seen_index is None else len(history) - last_seen_index - 1
            gap_bin = _gap_bin(gap)
            momentum_count = sum(1 for truth_numbers in past_draws if number in truth_numbers)
            momentum_bin = _momentum_bin(momentum_count)
            table_prob = conditional_table[(gap_bin, momentum_bin)]["probability"]
            candidate_total = candidate_totals.get(number, 0)
            candidate_positive = candidate_positives.get(number, 0)
            candidate_rate = (candidate_positive + smoothing * overall_rate) / (candidate_total + smoothing)
            omission_score = 1.0 / (1.0 + gap)
            momentum_score = min(momentum_count / max(1, MARKOV_WINDOW), 1.0)
            score = 0.55 * table_prob + 0.30 * candidate_rate + 0.15 * (0.65 * omission_score + 0.35 * momentum_score)
            row.append(min(max(score, 0.0), 1.0))
        probabilities.append(row)
        history.append(tuple(sorted(int(number) for number in draw["truth_numbers"])))
    return probabilities


def predict_model(model, split):
    if not isinstance(model, dict) or "model_type" not in model:
        raise ValueError("model must be a baseline dictionary with model_type")
    _require_split(split)
    model_type = model["model_type"]
    if model_type in {"logistic_l2", "lightgbm_binary_classifier"}:
        probabilities = _predict_estimator(model["estimator"], split)
        return _chunk_predictions(probabilities, int(split["draw_count"]))
    if model_type == "conditional_markov_approximation":
        return _markov_predict(model, split)
    raise ValueError(f"unsupported model_type: {model_type}")
