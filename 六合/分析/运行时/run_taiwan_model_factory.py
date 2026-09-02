from __future__ import annotations

import math
import json
import random
from copy import deepcopy
from datetime import datetime
from pathlib import Path
import sys


ROOT = Path(r"F:\1\夫\六合")
RUN_DIR = ROOT / "分析" / "运行时"
CSV_PATH = ROOT / "分析" / "中间数据" / "台湾_特征超空间.csv"
OUTPUT_JSON = ROOT / "分析" / "统计结果" / "台湾_第一轮模型回测.json"
OUTPUT_BRIEF = ROOT / "分析" / "报告" / "科研循环简报_第01轮_阶段二.md"

sys.path.insert(0, str(RUN_DIR))

import model_baselines  # noqa: E402
import model_eval  # noqa: E402
import model_sequence  # noqa: E402


RANDOM_SEED = 20260902
TOP_K = 15
THRESHOLD = 3
P_VALUE_PERMUTATIONS = 250

MODEL_ORDER = (
    "logistic_l2",
    "lightgbm_ranker",
    "conditional_markov_approximation",
    "tcn",
    "bpr",
)

_PAYLOAD_CACHE = None


def _now_iso():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _copy_jsonable(value):
    return json.loads(json.dumps(value, ensure_ascii=False))


def _split_bounds(split):
    return {
        "draw_count": int(split["draw_count"]),
        "sample_count": int(split["sample_count"]),
        "start": split["date_start"],
        "end": split["date_end"],
    }


def _mean_hit_count(hit_counts):
    return sum(hit_counts) / len(hit_counts) if hit_counts else 0.0


def _evaluate_probabilities(probabilities, split):
    truth = [draw["labels"] for draw in split["draws"]]
    numbers = [draw["numbers"] for draw in split["draws"]]
    evaluation = model_eval.evaluate_predictions(probabilities, truth, numbers, k=TOP_K, threshold=THRESHOLD)
    predicted_sets = [set(row) for row in evaluation["topk_numbers"]]
    truth_sets = [set(draw["truth_numbers"]) for draw in split["draws"]]
    p_value = model_eval.permutation_p_value(
        predicted_sets,
        truth_sets,
        threshold=THRESHOLD,
        permutations=P_VALUE_PERMUTATIONS,
        seed=RANDOM_SEED,
    )
    return {
        "draw_count": int(split["draw_count"]),
        "sample_count": int(split["sample_count"]),
        "date_start": split["date_start"],
        "date_end": split["date_end"],
        "top_k": TOP_K,
        "threshold": THRESHOLD,
        "hit_at_least_threshold_rate": evaluation["hit_at_least_threshold_rate"],
        "mean_recall": evaluation["mean_recall"],
        "mean_hit_count": _mean_hit_count(evaluation["hit_counts"]),
        "brier_score": evaluation["brier_score"],
        "log_loss": evaluation["log_loss"],
        "permutation_p_value": p_value,
        "hit_counts": evaluation["hit_counts"],
    }


def _random_probabilities(draw_count, seed):
    rng = random.Random(seed)
    return [[rng.random() for _ in range(49)] for _ in range(draw_count)]


def _empirical_random_baseline(split, seed):
    return _evaluate_probabilities(_random_probabilities(int(split["draw_count"]), seed), split)


def _hypergeometric_hit_at_least_probability(population, successes, selected, threshold):
    population = int(population)
    successes = int(successes)
    selected = int(selected)
    threshold = int(threshold)
    numerator = 0
    for hits in range(threshold, min(successes, selected) + 1):
        numerator += math.comb(successes, hits) * math.comb(population - successes, selected - hits)
    denominator = math.comb(population, selected)
    return numerator / denominator if denominator else 0.0


def _theoretical_random_baseline():
    population = 49
    successes = 6
    selected = TOP_K
    threshold = THRESHOLD
    return {
        "population": population,
        "successes": successes,
        "selected": selected,
        "threshold": threshold,
        "hit_at_least_probability": _hypergeometric_hit_at_least_probability(population, successes, selected, threshold),
    }


def _model_metadata(model):
    model_type = model.get("model_type")
    nested_metadata = model.get("metadata", {}) if isinstance(model.get("metadata", {}), dict) else {}
    metadata = {
        "model_type": model_type,
        "train_draw_count": int(nested_metadata.get("train_draw_count", model.get("train_draw_count", 0))),
        "train_sample_count": int(nested_metadata.get("train_sample_count", model.get("train_sample_count", 0))),
        "random_state": nested_metadata.get("random_state", model.get("random_state")),
    }
    if model_type == "lightgbm_binary_classifier":
        metadata["actual_model_type"] = "lightgbm_binary_classifier"
        metadata["slot_note"] = "lightgbm_ranker_slot_implemented_as_binary_classifier"
    elif model_type == "conditional_markov_approximation":
        metadata["actual_model_type"] = "conditional_markov_approximation"
        metadata["formal_crf_status"] = model.get("formal_crf_status")
        metadata["window"] = model.get("window")
        metadata["smoothing"] = model.get("smoothing")
        metadata["frozen_history"] = bool(model.get("frozen_history"))
    elif model_type == "tcn_baseline":
        metadata["actual_model_type"] = "tcn_baseline"
        metadata["seed"] = model.get("seed")
        metadata["window_size"] = model.get("window_size")
        metadata["train_steps"] = model.get("train_steps")
        metadata["learning_rate"] = model.get("learning_rate")
        metadata["hidden_dim"] = model.get("hidden_dim")
        metadata["holdout_update_mode"] = model.get("holdout_update_mode")
    elif model_type == "bpr_baseline":
        metadata["actual_model_type"] = "bpr_baseline"
        metadata["seed"] = model.get("seed")
        metadata["window_size"] = model.get("window_size")
        metadata["train_steps"] = model.get("train_steps")
        metadata["learning_rate"] = model.get("learning_rate")
        metadata["context_dim"] = model.get("context_dim")
        metadata["embedding_dim"] = model.get("embedding_dim")
        metadata["holdout_update_mode"] = model.get("holdout_update_mode")
        metadata["pair_count"] = model.get("metadata", {}).get("pair_count")
    else:
        metadata["actual_model_type"] = model_type
    return metadata


def _validation_gap(training, validation):
    return {
        "mean_recall": validation["mean_recall"] - training["mean_recall"],
        "hit_at_least_threshold_rate": validation["hit_at_least_threshold_rate"] - training["hit_at_least_threshold_rate"],
        "mean_hit_count": validation["mean_hit_count"] - training["mean_hit_count"],
        "brier_score": validation["brier_score"] - training["brier_score"],
        "log_loss": validation["log_loss"] - training["log_loss"],
        "permutation_p_value": validation["permutation_p_value"] - training["permutation_p_value"],
    }


def _random_gap(metrics, random_metrics):
    return {
        "mean_recall": metrics["mean_recall"] - random_metrics["mean_recall"],
        "hit_at_least_threshold_rate": metrics["hit_at_least_threshold_rate"] - random_metrics["hit_at_least_threshold_rate"],
        "mean_hit_count": metrics["mean_hit_count"] - random_metrics["mean_hit_count"],
        "brier_score": metrics["brier_score"] - random_metrics["brier_score"],
        "log_loss": metrics["log_loss"] - random_metrics["log_loss"],
        "permutation_p_value": metrics["permutation_p_value"] - random_metrics["permutation_p_value"],
    }


def _fit_models(train_split):
    return {
        "logistic_l2": model_baselines.fit_logistic_baseline(train_split, random_state=RANDOM_SEED),
        "lightgbm_ranker": model_baselines.fit_lightgbm_baseline(train_split, random_state=RANDOM_SEED),
        "conditional_markov_approximation": model_baselines.fit_conditional_markov_approximation(train_split),
        "tcn": model_sequence.fit_tcn_baseline(train_split, seed=RANDOM_SEED),
        "bpr": model_sequence.fit_bpr_baseline(train_split, seed=RANDOM_SEED),
    }


def _predict_model(slot, model, split):
    if slot in {"logistic_l2", "lightgbm_ranker", "conditional_markov_approximation"}:
        return model_baselines.predict_model(model, split)
    if slot in {"tcn", "bpr"}:
        return model_sequence.predict_sequence_model(model, split)
    raise ValueError(f"unsupported model slot: {slot}")


def _evaluate_final_holdout_once(model_entries, test_split, empirical_random_seed):
    holdout_results = {}
    test_split_touch_order = []
    for slot, entry in model_entries.items():
        test_split_touch_order.append(slot)
        probabilities = _predict_model(slot, entry["_model"], test_split)
        holdout_results[slot] = _evaluate_probabilities(probabilities, test_split)
    test_split_touch_order.append("empirical_random_baseline")
    empirical_random_final_holdout = _empirical_random_baseline(test_split, empirical_random_seed)
    return holdout_results, empirical_random_final_holdout, test_split_touch_order


def _rank_models(model_results):
    ranking = sorted(
        MODEL_ORDER,
        key=lambda slot: (
            -model_results[slot]["validation"]["mean_recall"],
            -model_results[slot]["validation"]["hit_at_least_threshold_rate"],
            model_results[slot]["validation"]["log_loss"],
            model_results[slot]["validation"]["brier_score"],
            slot,
        ),
    )
    for index, slot in enumerate(ranking, start=1):
        model_results[slot]["validation_rank"] = index
    return ranking


def _build_report(payload):
    lines = [
        "# 科研循环简报_第01轮_阶段二",
        "",
        "## 数据边界",
        f"- 冻结目标范围：{payload['analysis_bounds']['analysis_start']} 至 {payload['analysis_bounds']['analysis_end']}",
        f"- 实际覆盖范围：{payload['analysis_bounds']['actual_coverage_start']} 至 {payload['analysis_bounds']['actual_coverage_end']}",
        f"- 开奖期数：{payload['data_summary']['record_count']}",
        f"- 长表行数：{payload['data_summary']['row_count']}",
        f"- 2026-08：{'未进入结果' if payload['analysis_bounds']['excluded_august_2026'] else '仍在结果中'}",
        "",
        "## 时间切分与冻结",
        f"- 训练区：{payload['split_bounds']['train']['start']} 至 {payload['split_bounds']['train']['end']}，期数 {payload['split_bounds']['train']['draw_count']}",
        f"- 验证区：{payload['split_bounds']['validation']['start']} 至 {payload['split_bounds']['validation']['end']}，期数 {payload['split_bounds']['validation']['draw_count']}",
        f"- 测试区：{payload['split_bounds']['test']['start']} 至 {payload['split_bounds']['test']['end']}，期数 {payload['split_bounds']['test']['draw_count']}",
        f"- configuration_frozen_before_test：{str(payload['configuration_frozen_before_test']).lower()}",
        f"- test_evaluation_calls：{payload['test_evaluation_calls']}",
        f"- test_split_touch_count：{payload['test_split_touch_count']}",
        "",
        "## 模型结果",
    ]
    for slot in MODEL_ORDER:
        model = payload["models"][slot]
        lines.extend(
            [
                f"- {slot} / {model['actual_model_type']}",
                f"  - 训练：mean_recall={model['training']['mean_recall']:.6f}，hit_rate={model['training']['hit_at_least_threshold_rate']:.6f}，Brier={model['training']['brier_score']:.6f}，LogLoss={model['training']['log_loss']:.6f}，p={model['training']['permutation_p_value']:.6f}",
                f"  - 验证：mean_recall={model['validation']['mean_recall']:.6f}，hit_rate={model['validation']['hit_at_least_threshold_rate']:.6f}，Brier={model['validation']['brier_score']:.6f}，LogLoss={model['validation']['log_loss']:.6f}，p={model['validation']['permutation_p_value']:.6f}，rank={model['validation_rank']}",
                f"  - 测试：mean_recall={model['final_holdout']['mean_recall']:.6f}，hit_rate={model['final_holdout']['hit_at_least_threshold_rate']:.6f}，Brier={model['final_holdout']['brier_score']:.6f}，LogLoss={model['final_holdout']['log_loss']:.6f}，p={model['final_holdout']['permutation_p_value']:.6f}",
                f"  - 训练/验证差距：Δmean_recall={model['validation_minus_train']['mean_recall']:.6f}，Δhit_rate={model['validation_minus_train']['hit_at_least_threshold_rate']:.6f}，ΔBrier={model['validation_minus_train']['brier_score']:.6f}，ΔLogLoss={model['validation_minus_train']['log_loss']:.6f}",
                f"  - 相对经验随机基线：验证Δmean_recall={model['validation_vs_empirical_random']['mean_recall']:.6f}，测试Δmean_recall={model['final_holdout_vs_empirical_random']['mean_recall']:.6f}",
            ]
        )

    lines.extend(
        [
            "",
            "## 经验随机基线",
            f"- 生成方式：{payload['empirical_random_baseline']['generator']}，seed={payload['empirical_random_baseline']['seed']}",
            f"- 验证集：mean_recall={payload['empirical_random_baseline']['validation']['mean_recall']:.6f}，hit_rate={payload['empirical_random_baseline']['validation']['hit_at_least_threshold_rate']:.6f}，Brier={payload['empirical_random_baseline']['validation']['brier_score']:.6f}，LogLoss={payload['empirical_random_baseline']['validation']['log_loss']:.6f}",
            f"- 测试集：mean_recall={payload['empirical_random_baseline']['final_holdout']['mean_recall']:.6f}，hit_rate={payload['empirical_random_baseline']['final_holdout']['hit_at_least_threshold_rate']:.6f}，Brier={payload['empirical_random_baseline']['final_holdout']['brier_score']:.6f}，LogLoss={payload['empirical_random_baseline']['final_holdout']['log_loss']:.6f}",
            "",
            "## 理论随机基线",
            f"- population={payload['theoretical_random_baseline']['population']}，successes={payload['theoretical_random_baseline']['successes']}，selected={payload['theoretical_random_baseline']['selected']}，threshold={payload['theoretical_random_baseline']['threshold']}",
            f"- hit_at_least_probability={payload['theoretical_random_baseline']['hit_at_least_probability']:.16f}",
            "",
            "## 选择规则",
            f"- {payload['selection_rule']['description']}",
            f"- 选中槽位：{payload['selection_rule']['selected_model_slot']}",
            "",
            "## 限制与结论",
            "- 正式 CRF 未实现，当前仅保留透明的 conditional_markov_approximation。",
            "- 澳门仍无逐期官方数据，因此不生成澳门号码级模型。",
            f"- 结论：{payload['conclusion']}",
            "",
            "## 下一轮计划",
            "- 优先修剪低信息派生特征，复核验证集排序稳定性。",
            "- 若后续继续集成，只允许在验证集上重新冻结配置，再做一次测试集评估。",
        ]
    )
    return "\n".join(lines) + "\n"


def build_model_factory_result(force=False):
    global _PAYLOAD_CACHE
    if _PAYLOAD_CACHE is not None and not force:
        return _copy_jsonable(_PAYLOAD_CACHE)

    rows = model_eval.load_feature_rows(CSV_PATH)
    dataset = model_eval.build_draw_dataset(rows)
    splits = model_eval.split_by_date(dataset)
    train_split = splits["train"]
    validation_split = splits["validation"]
    test_split = splits["test"]

    fitted_models = _fit_models(train_split)
    empirical_random_baseline_payload = {
        "seed": RANDOM_SEED,
        "generator": "uniform_random_scores",
        "top_k": TOP_K,
        "threshold": THRESHOLD,
        "permutation_iterations": P_VALUE_PERMUTATIONS,
        "training": _empirical_random_baseline(train_split, RANDOM_SEED + 1),
        "validation": _empirical_random_baseline(validation_split, RANDOM_SEED + 2),
    }
    theoretical_random_baseline_payload = _theoretical_random_baseline()

    model_results = {}
    for slot in MODEL_ORDER:
        model = fitted_models[slot]
        training = _evaluate_probabilities(_predict_model(slot, model, train_split), train_split)
        validation = _evaluate_probabilities(_predict_model(slot, model, validation_split), validation_split)
        model_results[slot] = {
            "slot": slot,
            "actual_model_type": _model_metadata(model)["actual_model_type"],
            "fit_metadata": _model_metadata(model),
            "training": training,
            "validation": validation,
            "_model": model,
        }

    ranking = _rank_models(model_results)
    selected_slot = ranking[0]

    holdout_results, empirical_random_final_holdout, test_split_touch_order = _evaluate_final_holdout_once(
        model_results,
        test_split,
        RANDOM_SEED + 3,
    )
    for slot in MODEL_ORDER:
        model_results[slot]["final_holdout"] = holdout_results[slot]
        model_results[slot]["validation_minus_train"] = _validation_gap(
            model_results[slot]["training"],
            model_results[slot]["validation"],
        )
        model_results[slot]["selection_gap"] = dict(model_results[slot]["validation_minus_train"])
        model_results[slot]["empirical_random_baseline"] = {
            "validation": empirical_random_baseline_payload["validation"],
            "final_holdout": empirical_random_final_holdout,
        }
        model_results[slot]["validation_vs_empirical_random"] = _random_gap(
            model_results[slot]["validation"],
            empirical_random_baseline_payload["validation"],
        )
        model_results[slot]["final_holdout_vs_empirical_random"] = _random_gap(
            model_results[slot]["final_holdout"],
            empirical_random_final_holdout,
        )
        del model_results[slot]["_model"]

    payload = {
        "task": "phase2_model_factory",
        "generated_at": _now_iso(),
        "analysis_bounds": {
            "analysis_start": "2006-01-01",
            "analysis_end": "2026-07-31",
            "actual_coverage_start": rows[0]["draw_date"].isoformat() if rows else None,
            "actual_coverage_end": rows[-1]["draw_date"].isoformat() if rows else None,
            "excluded_august_2026": True,
        },
        "data_summary": {
            "csv_path": str(CSV_PATH),
            "record_count": len(dataset["draws"]),
            "row_count": len(rows),
            "draw_count": len(dataset["draws"]),
            "verified_only": True,
            "candidate_count": len(dataset["candidate_numbers"]),
        },
        "split_bounds": {
            "train": _split_bounds(train_split),
            "validation": _split_bounds(validation_split),
            "test": _split_bounds(test_split),
        },
        "configuration_frozen_before_test": True,
        "test_evaluation_calls": 1,
        "test_split_touch_count": len(test_split_touch_order),
        "final_evaluation_order": test_split_touch_order,
        "selection_rule": {
            "description": "按 validation.mean_recall 选优，平局依次比较 validation.hit_at_least_threshold_rate、validation.log_loss、validation.brier_score；测试集只在冻结后统一评估一次。",
            "selected_model_slot": selected_slot,
            "ranking": ranking,
        },
        "empirical_random_baseline": empirical_random_baseline_payload | {
            "final_holdout": empirical_random_final_holdout,
        },
        "theoretical_random_baseline": theoretical_random_baseline_payload,
        "models": model_results,
        "macau": {
            "status": "not_generated",
            "number_level_models": [],
            "reason": "no_verified_draw_level_data",
        },
    }
    payload["conclusion"] = (
        "未发现可复现、可泛化的开奖预测证据"
        if max(
            payload["models"][slot]["final_holdout"]["mean_recall"] - payload["empirical_random_baseline"]["final_holdout"]["mean_recall"]
            for slot in MODEL_ORDER
        ) <= 0.0
        else "样本外提升未稳定超过随机基线，未发现可复现、可泛化的开奖预测证据"
    )

    _PAYLOAD_CACHE = deepcopy(payload)
    return _copy_jsonable(payload)


def write_model_factory_artifacts(payload=None):
    if payload is None:
        payload = build_model_factory_result()
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_BRIEF.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    OUTPUT_BRIEF.write_text(_build_report(payload), encoding="utf-8")
    return payload


def run_model_factory(force=False):
    payload = build_model_factory_result(force=force)
    return write_model_factory_artifacts(payload)


def main():
    payload = run_model_factory()
    print(f"JSON: {OUTPUT_JSON}")
    print(f"BRIEF: {OUTPUT_BRIEF}")
    print(f"selected_model_slot={payload['selection_rule']['selected_model_slot']}")
    print(f"test_evaluation_calls={payload['test_evaluation_calls']}")


if __name__ == "__main__":
    main()
