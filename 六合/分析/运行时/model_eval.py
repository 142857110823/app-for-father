import csv
import math
import random
from collections import defaultdict
from datetime import date
from pathlib import Path


ANALYSIS_START = date(2006, 1, 1)
ANALYSIS_END = date(2026, 7, 31)
TRAIN_START = date(2007, 1, 1)
TRAIN_END = date(2015, 12, 31)
VALIDATION_START = date(2016, 1, 1)
VALIDATION_END = date(2020, 12, 31)
TEST_START = date(2021, 1, 1)
TEST_END = date(2026, 7, 31)

META_COLUMNS = {"draw_id", "draw_index", "draw_date", "number", "is_drawn"}
WUXING_LEVELS = ("木", "火", "土", "金", "水")
INT_COLUMNS = {
    "draw_index",
    "number",
    "is_drawn",
    "jiazi_index",
    "stem_index",
    "branch_index",
    "he_partner_stem",
    "he_partner_branch",
    "he_sum",
    "luoshu_palace",
}
BASE_FEATURE_COLUMNS = (
    "momentum_freq_1",
    "momentum_freq_5",
    "momentum_freq_10",
    "momentum_freq_30",
    "momentum_freq_100",
    "exp_decay_30",
    "misses",
    "year_sin",
    "year_cos",
    "month_sin",
    "month_cos",
    "day_sin",
    "day_cos",
    "weekday_sin",
    "weekday_cos",
    "iso_week_sin",
    "iso_week_cos",
    "previous_spacing_1",
    "previous_spacing_2",
    "previous_spacing_3",
    "previous_spacing_4",
    "previous_spacing_5",
    "jiazi_index",
    "stem_index",
    "branch_index",
    "he_partner_stem",
    "he_partner_branch",
    "he_sum",
    "luoshu_palace",
)


def _parse_date(value):
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _parse_value(key, value):
    if key == "draw_date":
        return _parse_date(value)
    if key == "draw_id":
        return str(value)
    if key == "wuxing_bin":
        return str(value)
    if key in INT_COLUMNS:
        return int(float(value))
    if value in ("", None):
        return 0.0
    return float(value)


def load_feature_rows(path, start_date=ANALYSIS_START, end_date=ANALYSIS_END):
    path = Path(path)
    start_date = _parse_date(start_date)
    end_date = _parse_date(end_date)
    rows = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for raw_row in csv.DictReader(handle):
            draw_date = _parse_date(raw_row["draw_date"])
            if draw_date < start_date or draw_date > end_date:
                continue
            row = {key: _parse_value(key, value) for key, value in raw_row.items()}
            rows.append(row)
    rows.sort(key=lambda row: (row["draw_index"], row["number"]))
    return rows


def _encode_features(row):
    encoded = {name: float(row.get(name, 0.0)) for name in BASE_FEATURE_COLUMNS}
    wuxing = str(row.get("wuxing_bin", ""))
    for level in WUXING_LEVELS:
        encoded[f"wuxing_bin__{level}"] = 1.0 if wuxing == level else 0.0
    return encoded


def _feature_vector(feature_map):
    return [float(feature_map[name]) for name in feature_map]


def build_draw_dataset(rows):
    grouped = defaultdict(list)
    for row in rows:
        grouped[int(row["draw_index"])].append(row)

    draws = []
    samples = []
    feature_names = list(BASE_FEATURE_COLUMNS) + [f"wuxing_bin__{level}" for level in WUXING_LEVELS]
    for draw_index in sorted(grouped):
        group = sorted(grouped[draw_index], key=lambda row: int(row["number"]))
        if len(group) != 49:
            raise ValueError(f"draw_index {draw_index} does not contain 49 candidates")
        numbers = [int(row["number"]) for row in group]
        if numbers != list(range(1, 50)):
            raise ValueError(f"draw_index {draw_index} does not contain candidate numbers 1..49")
        first = group[0]
        labels = [int(row["is_drawn"]) for row in group]
        candidates = []
        for row in group:
            features = _encode_features(row)
            candidate = {
                "number": int(row["number"]),
                "label": int(row["is_drawn"]),
                "features": features,
                "feature_vector": _feature_vector(features),
            }
            candidates.append(candidate)
            samples.append(
                {
                    "draw_index": draw_index,
                    "draw_id": first["draw_id"],
                    "draw_date": first["draw_date"],
                    "number": int(row["number"]),
                    "label": int(row["is_drawn"]),
                    "features": features,
                    "feature_vector": candidate["feature_vector"],
                }
            )
        draws.append(
            {
                "draw_index": draw_index,
                "draw_id": first["draw_id"],
                "draw_date": first["draw_date"],
                "truth_numbers": tuple(int(row["number"]) for row in group if int(row["is_drawn"]) == 1),
                "numbers": numbers,
                "labels": labels,
                "candidates": candidates,
            }
        )

    return {
        "rows": rows,
        "feature_names": feature_names,
        "candidate_numbers": list(range(1, 50)),
        "draws": draws,
        "samples": samples,
    }


def _subset_draws(draws, start_date, end_date):
    start_date = _parse_date(start_date)
    end_date = _parse_date(end_date)
    subset = [draw for draw in draws if start_date <= draw["draw_date"] <= end_date]
    return subset


def _materialize_split(draws, feature_names, candidate_numbers):
    samples = []
    matrix = []
    labels = []
    for draw in draws:
        for candidate in draw["candidates"]:
            samples.append(
                {
                    "draw_index": draw["draw_index"],
                    "draw_id": draw["draw_id"],
                    "draw_date": draw["draw_date"],
                    "number": candidate["number"],
                    "label": candidate["label"],
                    "features": candidate["features"],
                    "feature_vector": candidate["feature_vector"],
                }
            )
            matrix.append(candidate["feature_vector"])
            labels.append(candidate["label"])
    date_start = draws[0]["draw_date"].isoformat() if draws else None
    date_end = draws[-1]["draw_date"].isoformat() if draws else None
    return {
        "draws": draws,
        "samples": samples,
        "matrix": matrix,
        "labels": labels,
        "feature_names": feature_names,
        "candidate_numbers": candidate_numbers,
        "draw_count": len(draws),
        "sample_count": len(samples),
        "date_start": date_start,
        "date_end": date_end,
    }


def split_by_date(dataset):
    draws = dataset["draws"]
    feature_names = dataset["feature_names"]
    candidate_numbers = dataset["candidate_numbers"]
    return {
        "train": _materialize_split(
            _subset_draws(draws, TRAIN_START, TRAIN_END),
            feature_names,
            candidate_numbers,
        ),
        "validation": _materialize_split(
            _subset_draws(draws, VALIDATION_START, VALIDATION_END),
            feature_names,
            candidate_numbers,
        ),
        "test": _materialize_split(
            _subset_draws(draws, TEST_START, TEST_END),
            feature_names,
            candidate_numbers,
        ),
    }


def _validate_predictions(probabilities, truth, numbers):
    if len(probabilities) != len(truth) or len(probabilities) != len(numbers):
        raise ValueError("probabilities, truth, and numbers must have the same period count")
    for index, (prob_row, truth_row, number_row) in enumerate(zip(probabilities, truth, numbers)):
        if len(prob_row) != 49 or len(truth_row) != 49 or len(number_row) != 49:
            raise ValueError(f"period {index} must contain exactly 49 entries")
    return len(probabilities)


def evaluate_predictions(probabilities, truth, numbers, k=15, threshold=3):
    period_count = _validate_predictions(probabilities, truth, numbers)
    hit_counts = []
    topk_numbers = []
    hit_threshold_count = 0
    total_recall = 0.0
    brier_total = 0.0
    log_loss_total = 0.0
    total_cells = period_count * 49
    eps = 1e-15

    for prob_row, truth_row, number_row in zip(probabilities, truth, numbers):
        paired = sorted(
            zip(prob_row, truth_row, number_row),
            key=lambda item: (-float(item[0]), int(item[2])),
        )
        selected = paired[:k]
        selected_numbers = [int(item[2]) for item in selected]
        hits = sum(int(item[1]) for item in selected)
        truth_total = sum(int(value) for value in truth_row)
        hit_counts.append(hits)
        topk_numbers.append(selected_numbers)
        if hits >= threshold:
            hit_threshold_count += 1
        total_recall += hits / truth_total if truth_total else 0.0
        for probability, label in zip(prob_row, truth_row):
            clipped = min(max(float(probability), eps), 1 - eps)
            y = int(label)
            brier_total += (clipped - y) ** 2
            log_loss_total += -(y * math.log(clipped) + (1 - y) * math.log(1 - clipped))

    return {
        "hit_counts": hit_counts,
        "hit_at_least_threshold_rate": hit_threshold_count / period_count if period_count else 0.0,
        "mean_recall": total_recall / period_count if period_count else 0.0,
        "brier_score": brier_total / total_cells if total_cells else 0.0,
        "log_loss": log_loss_total / total_cells if total_cells else 0.0,
        "topk_numbers": topk_numbers,
    }


def _normalize_number_set(values, name):
    normalized = tuple(int(value) for value in values)
    if len(set(normalized)) != len(normalized):
        raise ValueError(f"{name} contains duplicate numbers")
    for value in normalized:
        if value < 1 or value > 49:
            raise ValueError(f"{name} contains numbers outside 1..49")
    return frozenset(normalized)


def permutation_p_value(predicted_sets, truth_sets, threshold=3, permutations=2000, seed=20260902):
    if len(predicted_sets) != len(truth_sets):
        raise ValueError("predicted_sets and truth_sets must have the same length")
    if permutations < 0:
        raise ValueError("permutations must be non-negative")
    normalized_predicted = [
        _normalize_number_set(predicted, f"predicted_sets[{index}]")
        for index, predicted in enumerate(predicted_sets)
    ]
    normalized_truth = [
        _normalize_number_set(truth, f"truth_sets[{index}]")
        for index, truth in enumerate(truth_sets)
    ]
    if len(normalized_predicted) < 2:
        return 1.0
    predicted_sizes = {len(values) for values in normalized_predicted}
    if len(predicted_sizes) != 1:
        raise ValueError("predicted_sets must have a consistent set size")
    rng = random.Random(seed)
    observed = sum(
        1
        for predicted, truth in zip(normalized_predicted, normalized_truth)
        if len(predicted & truth) >= threshold
    )
    ge_count = 0
    for _ in range(permutations):
        permuted_truth = list(normalized_truth)
        rng.shuffle(permuted_truth)
        simulated = 0
        for predicted, truth in zip(normalized_predicted, permuted_truth):
            if len(predicted & truth) >= threshold:
                simulated += 1
        if simulated >= observed:
            ge_count += 1
    return (ge_count + 1) / (permutations + 1)
