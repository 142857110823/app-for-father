from __future__ import annotations

import math
from copy import deepcopy

import numpy as np

try:
    from xgboost import XGBRegressor
except ImportError as exc:  # pragma: no cover - dependency is environment-specific
    XGBRegressor = None
    _XGBOOST_IMPORT_ERROR = exc
else:
    _XGBOOST_IMPORT_ERROR = None


NUM_CANDIDATES = 49
DEFAULT_WEIGHTED_BLEND = 0.5


def _require_matrix(name, matrix):
    if not isinstance(matrix, (list, tuple)):
        raise ValueError(f"{name} must be a sequence of probability rows")
    rows = [list(row) for row in matrix]
    if not rows:
        raise ValueError(f"{name} must not be empty")
    for row_index, row in enumerate(rows):
        if len(row) != NUM_CANDIDATES:
            raise ValueError(f"{name}[{row_index}] must contain exactly 49 probabilities")
        for value in row:
            value = float(value)
            if not math.isfinite(value):
                raise ValueError(f"{name} contains a non-finite probability")
            if value < 0.0 or value > 1.0:
                raise ValueError(f"{name} contains a probability outside [0, 1]")
    return [[float(value) for value in row] for row in rows]


def _normalize_weights(weights, count):
    if weights is None:
        weights = [1.0] * count
    if not isinstance(weights, (list, tuple)):
        raise ValueError("weights must be a sequence")
    if len(weights) != count:
        raise ValueError("weights must match the number of probability matrices")
    normalized = [float(weight) for weight in weights]
    if any((not math.isfinite(weight)) or weight < 0.0 for weight in normalized):
        raise ValueError("weights must be finite and non-negative")
    total = sum(normalized)
    if total <= 0.0:
        raise ValueError("weights must sum to a value greater than 0")
    return [weight / total for weight in normalized]


def soft_vote(probability_matrices, weights=None):
    matrices = [_require_matrix(f"probability_matrices[{index}]", matrix) for index, matrix in enumerate(probability_matrices)]
    if not matrices:
        raise ValueError("probability_matrices must not be empty")
    row_count = len(matrices[0])
    for matrix in matrices[1:]:
        if len(matrix) != row_count:
            raise ValueError("all probability matrices must have the same number of periods")
    normalized_weights = _normalize_weights(weights, len(matrices))
    blended = []
    for row_index in range(row_count):
        row = []
        for candidate_index in range(NUM_CANDIDATES):
            value = sum(matrix[row_index][candidate_index] * weight for matrix, weight in zip(matrices, normalized_weights))
            row.append(min(max(value, 0.0), 1.0))
        blended.append(row)
    return blended


def _validation_ranking(model_factory_payload):
    selection_rule = model_factory_payload.get("selection_rule", {})
    ranking = selection_rule.get("ranking")
    if ranking:
        return [str(slot) for slot in ranking]
    models = model_factory_payload.get("models", {})
    if not models:
        raise ValueError("model_factory_payload is missing models")
    ranked = sorted(
        models,
        key=lambda slot: (
            -float(models[slot]["validation"]["mean_recall"]),
            -float(models[slot]["validation"]["hit_at_least_threshold_rate"]),
            float(models[slot]["validation"]["log_loss"]),
            float(models[slot]["validation"]["brier_score"]),
            str(slot),
        ),
    )
    return ranked


def build_top_three_slots(model_factory_payload):
    if not isinstance(model_factory_payload, dict):
        raise ValueError("model_factory_payload must be a dictionary")
    ranking = _validation_ranking(model_factory_payload)
    if len(ranking) < 3:
        raise ValueError("model_factory_payload must contain at least three ranked slots")
    models = model_factory_payload.get("models", {})
    top_three = []
    for rank, slot in enumerate(ranking[:3], start=1):
        model = models.get(slot)
        if model is None:
            raise ValueError(f"missing model entry for slot: {slot}")
        validation = deepcopy(model.get("validation", {}))
        if not validation:
            raise ValueError(f"missing validation metrics for slot: {slot}")
        top_three.append(
            {
                "slot": slot,
                "rank": rank,
                "validation_metrics": validation,
                "basis": "validation_ranking_only",
            }
        )
    return {
        "ranking_source": "validation_ranking",
        "top_three_slots": top_three,
        "selection_rule": deepcopy(model_factory_payload.get("selection_rule", {})),
    }


def _require_split(split):
    required = {"draws", "samples", "matrix", "labels", "feature_names", "candidate_numbers", "draw_count", "sample_count"}
    if not isinstance(split, dict):
        raise ValueError("split must be a dictionary")
    missing = sorted(required - set(split))
    if missing:
        raise ValueError(f"split is missing required keys: {', '.join(missing)}")
    draw_count = int(split["draw_count"])
    sample_count = int(split["sample_count"])
    if draw_count <= 0 or sample_count <= 0:
        raise ValueError("split must contain at least one draw")
    if sample_count != draw_count * NUM_CANDIDATES:
        raise ValueError("split sample_count must equal draw_count * 49")
    if len(split["candidate_numbers"]) != NUM_CANDIDATES:
        raise ValueError("split must contain exactly 49 candidate numbers")
    return draw_count, sample_count


def _require_base_probabilities(base_probabilities, draw_count):
    matrices = _require_matrix("base_probabilities", base_probabilities)
    if len(matrices) != draw_count:
        raise ValueError("base_probabilities must match the split draw_count")
    return matrices


def _flatten_rows(matrix):
    return [value for row in matrix for value in row]


def fit_xgboost_residual(train_split, base_probabilities, seed=20260902):
    draw_count, _ = _require_split(train_split)
    base_matrix = _require_base_probabilities(base_probabilities, draw_count)
    labels = [int(value) for value in train_split["labels"]]
    residual_target = np.asarray(labels, dtype=float) - np.asarray(_flatten_rows(base_matrix), dtype=float)
    if float(np.std(residual_target)) <= 1e-12:
        return {
            "model_type": "xgboost_residual_regressor",
            "status": "not_adopted",
            "reason": "residual_signal_too_small",
            "seed": int(seed),
            "train_draw_count": int(train_split["draw_count"]),
            "train_sample_count": int(train_split["sample_count"]),
            "base_probability_shape": [len(base_matrix), len(base_matrix[0]) if base_matrix else 0],
        }
    if XGBRegressor is None:
        return {
            "model_type": "xgboost_residual_regressor",
            "status": "not_implemented",
            "reason": "xgboost_unavailable",
            "seed": int(seed),
            "train_draw_count": int(train_split["draw_count"]),
            "train_sample_count": int(train_split["sample_count"]),
            "base_probability_shape": [len(base_matrix), len(base_matrix[0]) if base_matrix else 0],
        }

    X = np.asarray(train_split["matrix"], dtype=float)
    y = residual_target
    estimator = XGBRegressor(
        objective="reg:squarederror",
        n_estimators=120,
        learning_rate=0.05,
        max_depth=3,
        subsample=1.0,
        colsample_bytree=1.0,
        reg_alpha=0.0,
        reg_lambda=1.0,
        min_child_weight=1.0,
        random_state=int(seed),
        n_jobs=1,
        tree_method="hist",
        verbosity=0,
    )
    estimator.fit(X, y)
    return {
        "model_type": "xgboost_residual_regressor",
        "status": "adopted",
        "reason": "xgboost_regressor_fitted",
        "seed": int(seed),
        "train_draw_count": int(train_split["draw_count"]),
        "train_sample_count": int(train_split["sample_count"]),
        "base_probability_shape": [len(base_matrix), len(base_matrix[0]) if base_matrix else 0],
        "residual_target_mean": float(np.mean(residual_target)),
        "residual_target_std": float(np.std(residual_target)),
        "estimator": estimator,
    }


def predict_xgboost_residual(model, split, base_probabilities):
    if not isinstance(model, dict) or model.get("model_type") != "xgboost_residual_regressor":
        raise ValueError("model must be an xgboost residual payload")
    if model.get("status") != "adopted":
        raise ValueError(f"residual model is not adopted: {model.get('status')}")
    draw_count, sample_count = _require_split(split)
    base_matrix = _require_base_probabilities(base_probabilities, draw_count)
    if sample_count != draw_count * NUM_CANDIDATES:
        raise ValueError("split must contain 49 candidates per draw")
    estimator = model.get("estimator")
    if estimator is None:
        raise ValueError("residual model is missing an estimator")
    X = np.asarray(split["matrix"], dtype=float)
    residuals = np.asarray(estimator.predict(X), dtype=float)
    if residuals.ndim != 1 or residuals.size != sample_count:
        raise ValueError("estimator must return one residual per candidate")
    blended = np.asarray(_flatten_rows(base_matrix), dtype=float) + residuals
    blended = np.clip(blended, 0.0, 1.0)
    return blended.reshape(draw_count, NUM_CANDIDATES).tolist()


def blend_residual_probabilities(base_probabilities, residual_probabilities, strength=DEFAULT_WEIGHTED_BLEND):
    base_matrix = _require_matrix("base_probabilities", base_probabilities)
    residual_matrix = _require_matrix("residual_probabilities", residual_probabilities)
    if len(base_matrix) != len(residual_matrix):
        raise ValueError("base_probabilities and residual_probabilities must have the same number of periods")
    if not math.isfinite(float(strength)):
        raise ValueError("strength must be finite")
    strength = float(strength)
    if strength < 0.0 or strength > 1.0:
        raise ValueError("strength must be within [0, 1]")
    blended = []
    for base_row, residual_row in zip(base_matrix, residual_matrix):
        row = []
        for base_value, residual_value in zip(base_row, residual_row):
            value = (1.0 - strength) * float(base_value) + strength * float(residual_value)
            row.append(min(max(value, 0.0), 1.0))
        blended.append(row)
    return blended
