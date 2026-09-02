from __future__ import annotations

import itertools
import json
import math
from collections import OrderedDict
from copy import deepcopy
from datetime import date
from pathlib import Path

import model_baselines
import model_eval


ROOT = Path(r"F:\1\夫\六合")
TOPOLOGY_PATH = ROOT / "分析" / "统计结果" / "台湾_第一轮特征拓扑.json"
RANDOM_SEED = 20260902
ANALYSIS_START = date(2006, 1, 1)
ANALYSIS_END = date(2026, 7, 31)
TRAIN_START = date(2007, 1, 1)
TRAIN_END = date(2015, 12, 31)
VALIDATION_START = date(2016, 1, 1)
VALIDATION_END = date(2020, 12, 31)
META_COLUMNS = {"draw_id", "draw_index", "draw_date", "number", "is_drawn"}
DEFAULT_GROUP_ORDER = ("momentum", "time", "esoteric", "spacing")
WUXING_EXPANSION = ("wuxing_bin__木", "wuxing_bin__火", "wuxing_bin__土", "wuxing_bin__金", "wuxing_bin__水")


def _load_topology():
    payload = json.loads(TOPOLOGY_PATH.read_text(encoding="utf-8"))
    field_groups = payload["field_groups"]
    group_feature_map = OrderedDict()
    for group_name in DEFAULT_GROUP_ORDER:
        fields = list(field_groups[group_name])
        expanded = []
        for field in fields:
            if field == "wuxing_bin":
                expanded.extend(WUXING_EXPANSION)
            else:
                expanded.append(field)
        group_feature_map[group_name] = expanded
    return payload, group_feature_map


TOPOLOGY, GROUP_FEATURE_MAP = _load_topology()
ALL_GROUPS = list(GROUP_FEATURE_MAP)
ALL_FEATURE_NAMES = [name for group in ALL_GROUPS for name in GROUP_FEATURE_MAP[group]]


def _parse_date(value):
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _validate_groups(selected_groups):
    if selected_groups is None:
        groups = list(ALL_GROUPS)
    else:
        groups = [str(group) for group in selected_groups]
    if not groups:
        raise ValueError("selected_groups must not be empty")
    unknown = [group for group in groups if group not in GROUP_FEATURE_MAP]
    if unknown:
        raise ValueError(f"unknown feature groups: {', '.join(unknown)}")
    if len(set(groups)) != len(groups):
        raise ValueError("selected_groups contains duplicates")
    ordered = [group for group in ALL_GROUPS if group in groups]
    return ordered


def _validate_feature_names(feature_names):
    names = [str(name) for name in feature_names]
    if not names:
        raise ValueError("feature_names must not be empty")
    if any(name in META_COLUMNS for name in names):
        raise ValueError("feature_names contains metadata columns")
    if len(set(names)) != len(names):
        raise ValueError("feature_names contains duplicates")
    unknown = [name for name in names if name not in ALL_FEATURE_NAMES]
    if unknown:
        raise ValueError(f"unknown feature names: {', '.join(unknown)}")
    return names


def _subset_draws(draws, start_date, end_date):
    start_date = _parse_date(start_date)
    end_date = _parse_date(end_date)
    return [draw for draw in draws if start_date <= _parse_date(draw["draw_date"]) <= end_date]


def _project_draws(draws, feature_names):
    samples = []
    matrix = []
    labels = []
    for draw in draws:
        for candidate in draw["candidates"]:
            features = candidate["features"]
            vector = [float(features[name]) for name in feature_names]
            samples.append(
                {
                    "draw_index": draw["draw_index"],
                    "draw_id": draw["draw_id"],
                    "draw_date": draw["draw_date"],
                    "number": candidate["number"],
                    "label": candidate["label"],
                    "features": {name: float(features[name]) for name in feature_names},
                    "feature_vector": vector,
                }
            )
            matrix.append(vector)
            labels.append(int(candidate["label"]))
    return {
        "draws": draws,
        "samples": samples,
        "matrix": matrix,
        "labels": labels,
        "feature_names": list(feature_names),
        "candidate_numbers": list(range(1, 50)),
        "draw_count": len(draws),
        "sample_count": len(samples),
        "date_start": draws[0]["draw_date"].isoformat() if draws else None,
        "date_end": draws[-1]["draw_date"].isoformat() if draws else None,
    }


def _empty_split_from(draws, feature_names):
    return _project_draws(draws, feature_names)


def build_feature_group_splits(dataset, selected_groups=None):
    groups = _validate_groups(selected_groups)
    feature_names = [name for group in groups for name in GROUP_FEATURE_MAP[group]]
    draws = dataset["draws"]
    train_draws = _subset_draws(draws, TRAIN_START, TRAIN_END)
    validation_draws = _subset_draws(draws, VALIDATION_START, VALIDATION_END)
    if not train_draws or not validation_draws:
        raise ValueError("train/validation split must not be empty")
    return {
        "train": _empty_split_from(train_draws, feature_names),
        "validation": _empty_split_from(validation_draws, feature_names),
        "selected_groups": groups,
        "feature_names": feature_names,
        "group_feature_map": {group: list(GROUP_FEATURE_MAP[group]) for group in groups},
    }


def _split_signature(split):
    return (
        split.get("date_start"),
        split.get("date_end"),
        int(split.get("draw_count", 0)),
        tuple(split.get("feature_names", ())),
    )


def _constant_validation_score(train_split, validation_split):
    train_rate = sum(int(label) for label in train_split["labels"]) / len(train_split["labels"])
    draw_count = int(validation_split["draw_count"])
    probabilities = [[train_rate] * 49 for _ in range(draw_count)]
    truth = [draw["labels"] for draw in validation_split["draws"]]
    numbers = [draw["numbers"] for draw in validation_split["draws"]]
    return model_eval.evaluate_predictions(probabilities, truth, numbers)["mean_recall"]


_SCORE_CACHE = {}


def evaluate_group_set(train_split, validation_split, feature_names):
    names = _validate_feature_names(feature_names)
    if int(train_split.get("draw_count", 0)) <= 0 or int(validation_split.get("draw_count", 0)) <= 0:
        raise ValueError("split must not be empty")
    cache_key = (_split_signature(train_split), _split_signature(validation_split), tuple(names))
    if cache_key in _SCORE_CACHE:
        return deepcopy(_SCORE_CACHE[cache_key])

    projected_train = _project_draws(train_split["draws"], names)
    projected_validation = _project_draws(validation_split["draws"], names)
    model = model_baselines.fit_logistic_baseline(projected_train, random_state=RANDOM_SEED)
    train_probabilities = model_baselines.predict_model(model, projected_train)
    validation_probabilities = model_baselines.predict_model(model, projected_validation)
    train_metrics = model_eval.evaluate_predictions(
        train_probabilities,
        [draw["labels"] for draw in projected_train["draws"]],
        [draw["numbers"] for draw in projected_train["draws"]],
    )
    validation_metrics = model_eval.evaluate_predictions(
        validation_probabilities,
        [draw["labels"] for draw in projected_validation["draws"]],
        [draw["numbers"] for draw in projected_validation["draws"]],
    )
    result = {
        "feature_names": list(names),
        "feature_count": len(names),
        "train_metrics": train_metrics,
        "validation_metrics": validation_metrics,
        "validation_mean_recall": validation_metrics["mean_recall"],
    }
    _SCORE_CACHE[cache_key] = deepcopy(result)
    return result


def _subset_key(groups):
    return tuple(group for group in ALL_GROUPS if group in set(groups))


def _evaluate_group_subset(train_split, validation_split, groups):
    groups = _subset_key(groups)
    if not groups:
        return {
            "groups": [],
            "feature_names": [],
            "validation_mean_recall": _constant_validation_score(train_split, validation_split),
            "train_metrics": None,
            "validation_metrics": None,
            "baseline": "train_rate_constant",
        }
    feature_names = [name for group in groups for name in GROUP_FEATURE_MAP[group]]
    scored = evaluate_group_set(train_split, validation_split, feature_names)
    return {
        "groups": list(groups),
        "feature_names": list(feature_names),
        "validation_mean_recall": scored["validation_mean_recall"],
        "train_metrics": scored["train_metrics"],
        "validation_metrics": scored["validation_metrics"],
    }


def compute_exact_group_shapley(train_split, validation_split, groups):
    groups = _validate_groups(groups)
    if len(groups) != 4:
        raise ValueError("groups must contain exactly four feature groups")
    subset_scores = {}
    for r in range(0, len(groups) + 1):
        for subset in itertools.combinations(groups, r):
            subset_scores[tuple(subset)] = _evaluate_group_subset(train_split, validation_split, subset)
    n = len(groups)
    factorial_n = 24
    shapley = {}
    permutations = []
    for group in groups:
        contribution = 0.0
        for r in range(0, n):
            for subset in itertools.combinations([item for item in groups if item != group], r):
                coalition = tuple(sorted(subset, key=groups.index))
                with_group = tuple(sorted(subset + (group,), key=groups.index))
                weight = (math.factorial(r) * math.factorial(n - r - 1)) / factorial_n
                marginal = subset_scores[with_group]["validation_mean_recall"] - subset_scores[coalition]["validation_mean_recall"]
                contribution += weight * marginal
        shapley[group] = contribution
    for permutation in itertools.permutations(groups):
        prefix = []
        prefix_scores = []
        prev = ()
        prev_score = subset_scores[prev]["validation_mean_recall"]
        marginal_contributions = {}
        for group in permutation:
            prefix.append(group)
            prefix_key = tuple(sorted(prefix, key=groups.index))
            score = subset_scores[prefix_key]["validation_mean_recall"]
            marginal_contributions[group] = score - prev_score
            prefix_scores.append({"groups": list(prefix_key), "validation_mean_recall": score})
            prev_score = score
        permutations.append(
            {
                "order": list(permutation),
                "marginal_contributions": marginal_contributions,
                "prefix_scores": prefix_scores,
            }
        )
    return {
        "groups": list(groups),
        "subset_scores": [
            {
                "groups": list(subset),
                "validation_mean_recall": score["validation_mean_recall"],
            }
            for subset, score in subset_scores.items()
        ],
        "shapley_values": shapley,
        "permutations": permutations,
        "baseline_score": subset_scores[()]["validation_mean_recall"],
    }


def forward_select_groups(train_split, validation_split, groups):
    groups = _validate_groups(groups)
    selected = []
    remaining = list(groups)
    steps = []
    current = _evaluate_group_subset(train_split, validation_split, selected)
    while remaining:
        candidates = []
        best_candidate = None
        for group in remaining:
            trial_groups = list(selected) + [group]
            trial = _evaluate_group_subset(train_split, validation_split, trial_groups)
            candidate = {
                "group": group,
                "groups": trial["groups"],
                "validation_mean_recall": trial["validation_mean_recall"],
            }
            candidates.append(candidate)
            if best_candidate is None or candidate["validation_mean_recall"] > best_candidate["validation_mean_recall"] or (
                candidate["validation_mean_recall"] == best_candidate["validation_mean_recall"]
                and groups.index(candidate["group"]) < groups.index(best_candidate["group"])
            ):
                best_candidate = candidate
        if best_candidate["validation_mean_recall"] <= current["validation_mean_recall"]:
            break
        selected = list(best_candidate["groups"])
        remaining = [group for group in remaining if group not in selected]
        current = {
            "groups": list(selected),
            "validation_mean_recall": best_candidate["validation_mean_recall"],
        }
        steps.append(
            {
                "candidates": candidates,
                "chosen_group": best_candidate["group"],
                "selected_groups": list(selected),
                "validation_mean_recall": best_candidate["validation_mean_recall"],
            }
        )
    return {
        "method": "forward_select_groups",
        "initial_groups": [],
        "initial_validation_mean_recall": _constant_validation_score(train_split, validation_split),
        "steps": steps,
        "final_groups": list(selected),
        "final_validation_mean_recall": current["validation_mean_recall"],
    }


def backward_prune_groups(train_split, validation_split, groups):
    groups = _validate_groups(groups)
    selected = list(groups)
    current = _evaluate_group_subset(train_split, validation_split, selected)
    steps = []
    while len(selected) > 1:
        candidates = []
        best_candidate = None
        remaining_groups = list(selected)
        for group in remaining_groups:
            trial_groups = [item for item in selected if item != group]
            trial = _evaluate_group_subset(train_split, validation_split, trial_groups)
            candidate = {
                "group": group,
                "groups": trial["groups"],
                "validation_mean_recall": trial["validation_mean_recall"],
            }
            candidates.append(candidate)
            if best_candidate is None or candidate["validation_mean_recall"] > best_candidate["validation_mean_recall"] or (
                candidate["validation_mean_recall"] == best_candidate["validation_mean_recall"]
                and groups.index(candidate["group"]) > groups.index(best_candidate["group"])
            ):
                best_candidate = candidate
        if best_candidate["validation_mean_recall"] <= current["validation_mean_recall"]:
            break
        selected = list(best_candidate["groups"])
        current = {
            "groups": list(selected),
            "validation_mean_recall": best_candidate["validation_mean_recall"],
        }
        steps.append(
            {
                "candidates": candidates,
                "removed_group": best_candidate["group"],
                "selected_groups": list(selected),
                "validation_mean_recall": best_candidate["validation_mean_recall"],
            }
        )
    return {
        "method": "backward_prune_groups",
        "initial_groups": list(groups),
        "initial_validation_mean_recall": _evaluate_group_subset(train_split, validation_split, groups)["validation_mean_recall"],
        "steps": steps,
        "final_groups": list(selected),
        "final_validation_mean_recall": current["validation_mean_recall"],
    }
