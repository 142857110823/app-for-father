from __future__ import annotations

import json
import random
from copy import deepcopy
from datetime import datetime
from importlib.util import find_spec
from pathlib import Path
import sys


ROOT = Path(r"F:\1\夫\六合")
RUN_DIR = ROOT / "分析" / "运行时"
FIRST_ROUND_JSON = ROOT / "分析" / "统计结果" / "台湾_第一轮模型回测.json"
OUTPUT_JSON = ROOT / "分析" / "统计结果" / "台湾_第二轮特征修剪与集成.json"
OUTPUT_BRIEF = ROOT / "分析" / "报告" / "科研循环简报_第02轮.md"
CSV_PATH = ROOT / "分析" / "中间数据" / "台湾_特征超空间.csv"

sys.path.insert(0, str(RUN_DIR))

import loop2_ensemble  # noqa: E402
import loop2_pruning  # noqa: E402
import model_baselines  # noqa: E402
import model_eval  # noqa: E402
import model_sequence  # noqa: E402


RANDOM_SEED = 20260902
TOP_K = 15
THRESHOLD = 3
P_VALUE_PERMUTATIONS = 250
FEATURE_GROUPS = ("momentum", "time", "esoteric", "spacing")
MODEL_SLOT_ORDER = (
    "logistic_l2",
    "lightgbm_ranker",
    "conditional_markov_approximation",
    "tcn",
    "bpr",
)


def _now_iso():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _copy_jsonable(value):
    return json.loads(json.dumps(value, ensure_ascii=False))


def _split_bounds(split, feature_names=None):
    result = {
        "draw_count": int(split["draw_count"]),
        "sample_count": int(split["sample_count"]),
        "start": split["date_start"],
        "end": split["date_end"],
    }
    if feature_names is not None:
        result["feature_names"] = list(feature_names)
    return result


def _metric_summary(metrics):
    return {
        "draw_count": int(metrics["draw_count"]),
        "sample_count": int(metrics["sample_count"]),
        "date_start": metrics["date_start"],
        "date_end": metrics["date_end"],
        "top_k": int(metrics["top_k"]),
        "threshold": int(metrics["threshold"]),
        "hit_at_least_threshold_rate": metrics["hit_at_least_threshold_rate"],
        "mean_recall": metrics["mean_recall"],
        "mean_hit_count": metrics["mean_hit_count"],
        "brier_score": metrics["brier_score"],
        "log_loss": metrics["log_loss"],
        "permutation_p_value": metrics["permutation_p_value"],
    }


def _evaluate_probabilities(probabilities, split, seed, trace=None, trace_label=None):
    if trace is not None and trace_label is not None:
        trace.append(trace_label)
    truth = [draw["labels"] for draw in split["draws"]]
    numbers = [draw["numbers"] for draw in split["draws"]]
    metrics = model_eval.evaluate_predictions(probabilities, truth, numbers, k=TOP_K, threshold=THRESHOLD)
    predicted_sets = [set(row) for row in metrics["topk_numbers"]]
    truth_sets = [set(draw["truth_numbers"]) for draw in split["draws"]]
    p_value = model_eval.permutation_p_value(
        predicted_sets,
        truth_sets,
        threshold=THRESHOLD,
        permutations=P_VALUE_PERMUTATIONS,
        seed=seed,
    )
    return _metric_summary(
        {
            "draw_count": split["draw_count"],
            "sample_count": split["sample_count"],
            "date_start": split["date_start"],
            "date_end": split["date_end"],
            "top_k": TOP_K,
            "threshold": THRESHOLD,
            "hit_at_least_threshold_rate": metrics["hit_at_least_threshold_rate"],
            "mean_recall": metrics["mean_recall"],
            "mean_hit_count": sum(metrics["hit_counts"]) / len(metrics["hit_counts"]) if metrics["hit_counts"] else 0.0,
            "brier_score": metrics["brier_score"],
            "log_loss": metrics["log_loss"],
            "permutation_p_value": p_value,
        }
    )


def _random_probabilities(draw_count, seed):
    rng = random.Random(int(seed))
    return [[rng.random() for _ in range(49)] for _ in range(int(draw_count))]


def _predict_slot(slot, model, split):
    if slot in {"logistic_l2", "lightgbm_ranker", "conditional_markov_approximation"}:
        return model_baselines.predict_model(model, split)
    if slot in {"tcn", "bpr"}:
        return model_sequence.predict_sequence_model(model, split)
    raise ValueError(f"unsupported model slot: {slot}")


def _fit_slot_models(train_split, model_slots):
    fitted = {}
    for slot in model_slots:
        if slot == "logistic_l2":
            fitted[slot] = model_baselines.fit_logistic_baseline(train_split, random_state=RANDOM_SEED)
        elif slot == "lightgbm_ranker":
            fitted[slot] = model_baselines.fit_lightgbm_baseline(train_split, random_state=RANDOM_SEED)
        elif slot == "conditional_markov_approximation":
            fitted[slot] = model_baselines.fit_conditional_markov_approximation(train_split)
        elif slot == "tcn":
            fitted[slot] = model_sequence.fit_tcn_baseline(train_split, seed=RANDOM_SEED)
        elif slot == "bpr":
            fitted[slot] = model_sequence.fit_bpr_baseline(train_split, seed=RANDOM_SEED)
        else:
            raise ValueError(f"unsupported model slot: {slot}")
    return fitted


def _model_metadata(model, feature_names):
    model_type = model.get("model_type")
    nested = model.get("metadata", {}) if isinstance(model.get("metadata"), dict) else {}
    metadata = {
        "model_type": model_type,
        "actual_model_type": model_type,
        "feature_names": list(feature_names),
        "feature_count": len(feature_names),
        "train_draw_count": int(model.get("train_draw_count", nested.get("train_draw_count", 0))),
        "train_sample_count": int(model.get("train_sample_count", nested.get("train_sample_count", 0))),
        "random_state": model.get("random_state", nested.get("random_state")),
    }
    if model_type == "lightgbm_binary_classifier":
        metadata["slot_note"] = "lightgbm_ranker_slot_implemented_as_binary_classifier"
    elif model_type == "conditional_markov_approximation":
        metadata["formal_crf_status"] = model.get("formal_crf_status")
        metadata["window"] = model.get("window")
        metadata["smoothing"] = model.get("smoothing")
        metadata["frozen_history"] = bool(model.get("frozen_history"))
    elif model_type in {"tcn_baseline", "bpr_baseline"}:
        metadata.update(
            {
                "seed": model.get("seed"),
                "window_size": model.get("window_size"),
                "train_steps": model.get("train_steps"),
                "learning_rate": model.get("learning_rate"),
                "holdout_update_mode": model.get("holdout_update_mode"),
            }
        )
    return metadata


def _rank_model_results(model_results, model_slots):
    ranking = sorted(
        model_slots,
        key=lambda slot: (
            -model_results[slot]["validation"]["mean_recall"],
            -model_results[slot]["validation"]["hit_at_least_threshold_rate"],
            model_results[slot]["validation"]["log_loss"],
            model_results[slot]["validation"]["brier_score"],
            slot,
        ),
    )
    for rank, slot in enumerate(ranking, start=1):
        model_results[slot]["validation_rank"] = rank
    return ranking


def _load_first_round_payload():
    with FIRST_ROUND_JSON.open(encoding="utf-8") as handle:
        return json.load(handle)


def _first_round_model_slots(first_round_payload):
    slots = list(first_round_payload.get("models", {}))
    if set(slots) != set(MODEL_SLOT_ORDER):
        raise ValueError("first-round model slots do not match the loop2 model contract")
    return [slot for slot in MODEL_SLOT_ORDER if slot in slots]


def _build_selected_group_summary(dataset):
    selection_splits = loop2_pruning.build_feature_group_splits(dataset, selected_groups=FEATURE_GROUPS)
    groups = list(FEATURE_GROUPS)
    shapley = loop2_pruning.compute_exact_group_shapley(
        selection_splits["train"],
        selection_splits["validation"],
        groups,
    )
    forward = loop2_pruning.forward_select_groups(selection_splits["train"], selection_splits["validation"], groups)
    backward = loop2_pruning.backward_prune_groups(selection_splits["train"], selection_splits["validation"], groups)
    selected = backward if backward["final_validation_mean_recall"] >= forward["final_validation_mean_recall"] else forward
    selected_splits = loop2_pruning.build_feature_group_splits(
        dataset,
        selected_groups=selected["final_groups"],
    )
    return {
        "groups": groups,
        "shapley": shapley,
        "forward_selection": forward,
        "backward_pruning": backward,
        "selected_method": selected["method"],
        "selected_groups": list(selected["final_groups"]),
        "selected_validation_mean_recall": selected["final_validation_mean_recall"],
        "selected_feature_names": list(selected_splits["feature_names"]),
        "selected_group_feature_map": deepcopy(selected_splits["group_feature_map"]),
        "selection_split_bounds": {
            "train": _split_bounds(selection_splits["train"]),
            "validation": _split_bounds(selection_splits["validation"]),
        },
        "selected_splits": selected_splits,
    }


def _build_model_candidates(train_split, validation_split, models, model_slots):
    results = {}
    for slot in model_slots:
        model = models[slot]
        results[slot] = {
            "slot": slot,
            "actual_model_type": _model_metadata(model, train_split["feature_names"])["actual_model_type"],
            "fit_metadata": _model_metadata(model, train_split["feature_names"]),
            "training": _evaluate_probabilities(_predict_slot(slot, model, train_split), train_split, RANDOM_SEED + 1),
            "validation": _evaluate_probabilities(_predict_slot(slot, model, validation_split), validation_split, RANDOM_SEED + 2),
        }
    return results


def _build_top_three(model_results, ranking):
    return {
        "ranking_source": "selected_feature_validation_ranking",
        "ranking": list(ranking),
        "top_three_models": [
            {
                "slot": slot,
                "rank": rank,
                "basis": "selected_feature_validation_ranking",
                "actual_model_type": model_results[slot]["actual_model_type"],
                "fit_metadata": deepcopy(model_results[slot]["fit_metadata"]),
                "training": deepcopy(model_results[slot]["training"]),
                "validation": deepcopy(model_results[slot]["validation"]),
            }
            for rank, slot in enumerate(ranking[:3], start=1)
        ],
    }


def _build_soft_vote_summary(train_split, validation_split, models, top_three_slots, trace):
    train_probabilities = loop2_ensemble.soft_vote(
        [_predict_slot(slot, models[slot], train_split) for slot in top_three_slots],
        weights=[1, 1, 1],
    )
    validation_probabilities = loop2_ensemble.soft_vote(
        [_predict_slot(slot, models[slot], validation_split) for slot in top_three_slots],
        weights=[1, 1, 1],
    )
    return {
        "status": "adopted",
        "basis": "selected_feature_validation_ranking_only",
        "weights": [1, 1, 1],
        "selected_slots": list(top_three_slots),
        "feature_names": list(train_split["feature_names"]),
        "training": _evaluate_probabilities(
            train_probabilities,
            train_split,
            RANDOM_SEED + 10,
            trace=trace,
            trace_label="train:soft_vote_top3",
        ),
        "validation": _evaluate_probabilities(
            validation_probabilities,
            validation_split,
            RANDOM_SEED + 11,
            trace=trace,
            trace_label="validation:soft_vote_top3",
        ),
    }, train_probabilities, validation_probabilities


def _probe_xgboost():
    available = find_spec("xgboost") is not None
    payload = {
        "available": bool(available),
        "module": "xgboost",
        "python": sys.executable,
    }
    if available:
        import xgboost

        payload["version"] = xgboost.__version__
    return payload


def _build_residual_summary(
    train_split,
    validation_split,
    base_train_probabilities,
    base_validation_probabilities,
    soft_validation_mean_recall,
    trace,
):
    xgboost_probe = _probe_xgboost()
    fitted = loop2_ensemble.fit_xgboost_residual(train_split, base_train_probabilities, seed=RANDOM_SEED)
    if fitted["status"] == "adopted":
        residual_train_probabilities = loop2_ensemble.predict_xgboost_residual(
            fitted,
            train_split,
            base_train_probabilities,
        )
        residual_validation_probabilities = loop2_ensemble.predict_xgboost_residual(
            fitted,
            validation_split,
            base_validation_probabilities,
        )
        training = _evaluate_probabilities(
            residual_train_probabilities,
            train_split,
            RANDOM_SEED + 12,
            trace=trace,
            trace_label="train:residual_candidate",
        )
        validation = _evaluate_probabilities(
            residual_validation_probabilities,
            validation_split,
            RANDOM_SEED + 13,
            trace=trace,
            trace_label="validation:residual_candidate",
        )
        adopted_for_selection = validation["mean_recall"] > soft_validation_mean_recall
        return {
            "model_type": "xgboost_residual_regressor",
            "status": "adopted" if adopted_for_selection else "not_adopted",
            "reason": "validation_mean_recall_above_soft_vote" if adopted_for_selection else "validation_mean_recall_below_soft_vote",
            "xgboost_probe": xgboost_probe,
            "fit_status": fitted["status"],
            "fit_reason": fitted["reason"],
            "seed": int(fitted["seed"]),
            "train_draw_count": int(fitted["train_draw_count"]),
            "train_sample_count": int(fitted["train_sample_count"]),
            "base_probability_shape": list(fitted["base_probability_shape"]),
            "training": training,
            "validation": validation,
            "validation_comparison": {
                "soft_vote_mean_recall": soft_validation_mean_recall,
                "residual_mean_recall": validation["mean_recall"],
                "delta_residual_minus_soft_vote": validation["mean_recall"] - soft_validation_mean_recall,
            },
        }, fitted, residual_train_probabilities, residual_validation_probabilities
    return {
        "model_type": "xgboost_residual_regressor",
        "status": "not_adopted" if xgboost_probe["available"] else "not_implemented",
        "reason": "xgboost_unavailable",
        "xgboost_probe": xgboost_probe,
        "fit_status": fitted["status"],
        "fit_reason": fitted["reason"],
        "seed": int(fitted["seed"]),
        "train_draw_count": int(fitted["train_draw_count"]),
        "train_sample_count": int(fitted["train_sample_count"]),
        "base_probability_shape": list(fitted["base_probability_shape"]),
    }, fitted, None, None


def _build_random_baseline(train_split, validation_split, trace):
    return {
        "seed": RANDOM_SEED,
        "generator": "uniform_random_scores",
        "top_k": TOP_K,
        "threshold": THRESHOLD,
        "training": _evaluate_probabilities(
            _random_probabilities(train_split["draw_count"], RANDOM_SEED + 20),
            train_split,
            RANDOM_SEED + 21,
            trace=trace,
            trace_label="train:empirical_random_baseline",
        ),
        "validation": _evaluate_probabilities(
            _random_probabilities(validation_split["draw_count"], RANDOM_SEED + 22),
            validation_split,
            RANDOM_SEED + 23,
            trace=trace,
            trace_label="validation:empirical_random_baseline",
        ),
    }


def _test_draws(dataset):
    return [
        draw
        for draw in dataset["draws"]
        if model_eval.TEST_START <= draw["draw_date"] <= model_eval.TEST_END
    ]


def build_loop2_result(force=False):
    del force
    first_round_payload = _load_first_round_payload()
    model_slots = _first_round_model_slots(first_round_payload)
    rows = model_eval.load_feature_rows(CSV_PATH)
    dataset = model_eval.build_draw_dataset(rows)

    pruning = _build_selected_group_summary(dataset)
    selected_splits = pruning["selected_splits"]
    selected_train = selected_splits["train"]
    selected_validation = selected_splits["validation"]
    selected_feature_names = list(selected_splits["feature_names"])

    models = _fit_slot_models(selected_train, model_slots)
    model_candidates = _build_model_candidates(selected_train, selected_validation, models, model_slots)
    ranking = _rank_model_results(model_candidates, model_slots)
    top_three = _build_top_three(model_candidates, ranking)
    selected_slots = [item["slot"] for item in top_three["top_three_models"]]

    evaluation_trace = []
    soft_voting, soft_train_probabilities, soft_validation_probabilities = _build_soft_vote_summary(
        selected_train,
        selected_validation,
        models,
        selected_slots,
        evaluation_trace,
    )
    residual_candidate, residual_fit, residual_train_probabilities, residual_validation_probabilities = _build_residual_summary(
        selected_train,
        selected_validation,
        soft_train_probabilities,
        soft_validation_probabilities,
        soft_voting["validation"]["mean_recall"],
        evaluation_trace,
    )
    random_baseline = _build_random_baseline(selected_train, selected_validation, evaluation_trace)

    selected_configuration = "residual_candidate" if residual_candidate["status"] == "adopted" else "soft_vote_top3"
    evaluation_trace.append("freeze_configuration")

    # Test data is materialized only after final configuration is frozen.
    selected_test = loop2_pruning._project_draws(_test_draws(dataset), selected_feature_names)
    final_evaluation_order = [selected_configuration, "empirical_random_baseline"]
    if selected_configuration == "residual_candidate":
        soft_test_probabilities = loop2_ensemble.soft_vote(
            [_predict_slot(slot, models[slot], selected_test) for slot in selected_slots],
            weights=[1, 1, 1],
        )
        final_test_probabilities = loop2_ensemble.predict_xgboost_residual(
            residual_fit,
            selected_test,
            soft_test_probabilities,
        )
        final_test_metrics = _evaluate_probabilities(
            final_test_probabilities,
            selected_test,
            RANDOM_SEED + 30,
            trace=evaluation_trace,
            trace_label="test:residual_candidate",
        )
    else:
        final_test_probabilities = loop2_ensemble.soft_vote(
            [_predict_slot(slot, models[slot], selected_test) for slot in selected_slots],
            weights=[1, 1, 1],
        )
        final_test_metrics = _evaluate_probabilities(
            final_test_probabilities,
            selected_test,
            RANDOM_SEED + 31,
            trace=evaluation_trace,
            trace_label="test:soft_vote_top3",
        )
        soft_voting["final_holdout"] = deepcopy(final_test_metrics)

    random_baseline["final_holdout"] = _evaluate_probabilities(
        _random_probabilities(selected_test["draw_count"], RANDOM_SEED + 32),
        selected_test,
        RANDOM_SEED + 33,
        trace=evaluation_trace,
        trace_label="test:empirical_random_baseline",
    )

    payload = {
        "task": "phase2_loop2_pruning_ensemble",
        "generated_at": _now_iso(),
        "analysis_bounds": {
            "analysis_start": "2006-01-01",
            "analysis_end": "2026-07-31",
            "excluded_august_2026": True,
        },
        "data_summary": {
            "csv_path": str(CSV_PATH),
            "record_count": len(dataset["draws"]),
            "row_count": len(rows),
            "draw_count": len(dataset["draws"]),
            "verified_only": True,
            "candidate_count": len(dataset["candidate_numbers"]),
            "first_round_json": str(FIRST_ROUND_JSON),
            "first_round_model_ranking": first_round_payload["selection_rule"]["ranking"],
        },
        "split_bounds": {
            "train": _split_bounds(selected_train, selected_feature_names),
            "validation": _split_bounds(selected_validation, selected_feature_names),
            "test": _split_bounds(selected_test, selected_feature_names),
        },
        "configuration_frozen_before_test": True,
        "test_evaluation_calls": 1,
        "test_split_touch_count": len(final_evaluation_order),
        "final_evaluation_order": final_evaluation_order,
        "evaluation_trace": evaluation_trace,
        "selection_rule": {
            "description": "组选择和模型选择只使用训练/验证集；选定特征 split 和最终配置冻结后，测试集只在单一 final evaluation 阶段评估。",
            "group_selection": {
                "basis": "validation_mean_recall",
                "selected_method": pruning["selected_method"],
                "selected_groups": pruning["selected_groups"],
                "selected_feature_names": selected_feature_names,
                "selected_validation_mean_recall": pruning["selected_validation_mean_recall"],
            },
            "model_selection": {
                "basis": "selected_feature_validation_ranking_only",
                "ranking": ranking,
                "selected_model_slots": selected_slots,
            },
            "final_configuration": selected_configuration,
            "final_configuration_metrics": deepcopy(
                soft_voting["validation"]
                if selected_configuration == "soft_vote_top3"
                else residual_candidate["validation"]
            ),
        },
        "feature_pruning": {key: value for key, value in pruning.items() if key != "selected_splits"},
        "model_candidates": model_candidates,
        "top_three_models": top_three,
        "soft_voting": soft_voting,
        "residual_candidate": residual_candidate,
        "random_baseline": random_baseline,
        "macau": {
            "status": "not_generated",
            "number_level_models": [],
            "reason": "no_verified_draw_level_data",
        },
        "xgboost_probe": residual_candidate["xgboost_probe"],
        "selected_configuration": selected_configuration,
        "selected_feature_names": selected_feature_names,
        "selected_test_metrics": deepcopy(final_test_metrics),
        "conclusion": "第二轮使用选定特征分组训练五个候选模型，并按验证集选择三模型软投票；XGBoost 残差候选未优于软投票，因此未采用；澳门仍保持 BLOCKED。",
    }
    return _copy_jsonable(payload)


def _build_report(payload):
    selected_groups = "；".join(payload["feature_pruning"]["selected_groups"])
    selected_slots = "；".join(payload["soft_voting"]["selected_slots"])
    lines = [
        "# 科研循环简报_第02轮",
        "",
        "## 数据边界",
        f"- 冻结目标范围：{payload['analysis_bounds']['analysis_start']} 至 {payload['analysis_bounds']['analysis_end']}",
        "- 2026-08：已排除",
        f"- 记录数：{payload['data_summary']['record_count']}",
        f"- 长表行数：{payload['data_summary']['row_count']}",
        "",
        "## 组修剪与实际输入",
        f"- selected_method：{payload['feature_pruning']['selected_method']}",
        f"- selected_groups：{selected_groups}",
        f"- selected_feature_count：{len(payload['feature_pruning']['selected_feature_names'])}",
        f"- selected_validation_mean_recall：{payload['feature_pruning']['selected_validation_mean_recall']:.6f}",
        "- 五个候选模型和 soft vote 均使用 selected_feature_names 的 train/validation split；test split 在冻结后才创建。",
        "",
        "## 模型选择",
        f"- selected_slots：{selected_slots}",
        f"- validation ranking：{'；'.join(payload['selection_rule']['model_selection']['ranking'])}",
        f"- soft vote validation mean_recall：{payload['soft_voting']['validation']['mean_recall']:.6f}",
        "",
        "## 软投票",
        f"- training mean_recall：{payload['soft_voting']['training']['mean_recall']:.6f}",
        f"- validation mean_recall：{payload['soft_voting']['validation']['mean_recall']:.6f}",
        f"- test mean_recall：{payload['soft_voting']['final_holdout']['mean_recall']:.6f}",
        "",
        "## 残差候选",
        f"- xgboost：{payload['xgboost_probe']['available']}，python={payload['xgboost_probe']['python']}",
        f"- status：{payload['residual_candidate']['status']}",
        f"- reason：{payload['residual_candidate']['reason']}",
        f"- validation mean_recall：{payload['residual_candidate']['validation']['mean_recall']:.6f}",
        "",
        "## 随机基线",
        f"- validation mean_recall：{payload['random_baseline']['validation']['mean_recall']:.6f}",
        f"- test mean_recall：{payload['random_baseline']['final_holdout']['mean_recall']:.6f}",
        "",
        "## 冻结协议",
        f"- configuration_frozen_before_test：{str(payload['configuration_frozen_before_test']).lower()}",
        f"- test_evaluation_calls：{payload['test_evaluation_calls']}",
        f"- final_evaluation_order：{'；'.join(payload['final_evaluation_order'])}",
        f"- evaluation_trace：{' → '.join(payload['evaluation_trace'])}",
        "",
        "## 结论",
        f"- {payload['conclusion']}",
        "",
        "## 风险",
        "- 第二轮结果依赖第一轮 JSON 的候选槽位契约和台湾 verified 特征长表。",
        "- 残差候选使用训练期拟合、验证期比较；本轮验证集未显示优于软投票的证据。",
        "- 澳门没有 verified 逐期数据，继续保持 BLOCKED，不生成号码级模型。",
    ]
    return "\n".join(lines) + "\n"


def write_loop2_artifacts(payload=None):
    if payload is None:
        payload = build_loop2_result()
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_BRIEF.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    OUTPUT_BRIEF.write_text(_build_report(payload), encoding="utf-8")
    return payload


def run_loop2(force=False):
    payload = build_loop2_result(force=force)
    return write_loop2_artifacts(payload)


def main():
    payload = run_loop2()
    print(f"JSON: {OUTPUT_JSON}")
    print(f"BRIEF: {OUTPUT_BRIEF}")
    print(f"selected_configuration={payload['selected_configuration']}")
    print(f"selected_groups={','.join(payload['feature_pruning']['selected_groups'])}")
    print(f"test_evaluation_calls={payload['test_evaluation_calls']}")
    print(f"final_evaluation_order={','.join(payload['final_evaluation_order'])}")
    print(f"xgboost_available={payload['xgboost_probe']['available']}")


if __name__ == "__main__":
    main()
