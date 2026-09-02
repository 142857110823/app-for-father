import csv
import json
import math
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

from analyze_taiwan import parse_rows


ROOT = Path(r"F:\1\夫\六合")
RAW_RELATION_PATH = ROOT / "化合关系表.csv"
MID_PATH = ROOT / "分析" / "中间数据" / "台湾_特征超空间.csv"
JSON_PATH = ROOT / "分析" / "统计结果" / "台湾_第一轮特征拓扑.json"
REPORT_PATH = ROOT / "分析" / "报告" / "科研循环简报_第01轮.md"

ANALYSIS_START = date(2006, 1, 1)
ANALYSIS_END = date(2026, 7, 31)
TRAINING_START = date(2007, 1, 1)
TRAINING_END = date(2015, 12, 31)

STEMS = ("甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸")
BRANCHES = ("子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥")
WUXING_BY_LAST_DIGIT = {
    1: "木",
    2: "木",
    3: "火",
    4: "火",
    5: "土",
    6: "土",
    7: "金",
    8: "金",
    9: "水",
    0: "水",
}
STEM_PARTNER_INDEX = {
    0: 5,
    1: 6,
    2: 7,
    3: 8,
    4: 9,
    5: 0,
    6: 1,
    7: 2,
    8: 3,
    9: 4,
}
BRANCH_PARTNER_INDEX = {
    0: 1,
    1: 0,
    2: 11,
    3: 10,
    4: 9,
    5: 8,
    6: 7,
    7: 6,
    8: 5,
    9: 4,
    10: 3,
    11: 2,
}


def hypergeometric_hit_at_least(population, successes, selected, threshold):
    if not all(isinstance(value, int) for value in (population, successes, selected, threshold)):
        raise TypeError("all parameters must be integers")
    if population < 0 or successes < 0 or selected < 0 or threshold < 0:
        raise ValueError("parameters must be non-negative")
    if successes > population or selected > population:
        raise ValueError("successes and selected must not exceed population")
    upper = min(successes, selected)
    if threshold > upper:
        return 0.0
    denominator = math.comb(population, selected)
    total = 0
    for k in range(threshold, upper + 1):
        total += math.comb(successes, k) * math.comb(population - successes, selected - k)
    return total / denominator


def cyclic_pair(value, period):
    angle = 2.0 * math.pi * (value % period) / period
    return math.sin(angle), math.cos(angle)


def build_number_mapping(number):
    if not 1 <= number <= 49:
        raise ValueError("number must be in 1..49")
    jiazi_index = (number - 1) % 60
    stem_index = jiazi_index % 10
    branch_index = jiazi_index % 12
    he_partner_stem = STEM_PARTNER_INDEX[stem_index]
    he_partner_branch = BRANCH_PARTNER_INDEX[branch_index]
    he_partner_number = he_partner_stem + 1 if he_partner_stem >= 0 else he_partner_branch + 1
    wuxing_bin = WUXING_BY_LAST_DIGIT[number % 10]
    return {
        "jiazi_index": jiazi_index,
        "stem_index": stem_index,
        "branch_index": branch_index,
        "he_partner_stem": he_partner_stem,
        "he_partner_branch": he_partner_branch,
        "he_sum": number + he_partner_number,
        "luoshu_palace": ((number - 1) % 9) + 1,
        "wuxing_bin": wuxing_bin,
    }


def load_relation_table(path=RAW_RELATION_PATH):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def compute_mi_from_counts(x_counts, y_counts, joint_counts, total):
    if total <= 0:
        return 0.0, 0.0
    mi = 0.0
    for (x_value, y_value), joint in joint_counts.items():
        if joint <= 0:
            continue
        px = x_counts[x_value] / total
        py = y_counts[y_value] / total
        pxy = joint / total
        mi += pxy * math.log(pxy / (px * py))
    hx = 0.0
    for count in x_counts.values():
        if count:
            p = count / total
            hx -= p * math.log(p)
    hy = 0.0
    for count in y_counts.values():
        if count:
            p = count / total
            hy -= p * math.log(p)
    if hx <= 0.0 or hy <= 0.0:
        return mi, 0.0
    return mi, mi / math.sqrt(hx * hy)


def compute_mutual_information(train_rows, feature_names):
    results = {}
    y_counts = Counter()
    for row in train_rows:
        y_counts[row["is_drawn"]] += 1
    total = len(train_rows)
    for feature_name in feature_names:
        x_counts = Counter()
        joint_counts = Counter()
        for row in train_rows:
            x_value = row[feature_name]
            y_value = row["is_drawn"]
            x_counts[x_value] += 1
            joint_counts[(x_value, y_value)] += 1
        raw_mi, normalized_mi = compute_mi_from_counts(x_counts, y_counts, joint_counts, total)
        results[feature_name] = {
            "raw_mi": raw_mi,
            "normalized_mi": normalized_mi,
            "weight": min(1.0, normalized_mi / 0.05),
            "cardinality": len(x_counts),
        }
    return results


def draw_spacing(draw_numbers):
    sorted_numbers = sorted(draw_numbers)
    gaps = [right - left for left, right in zip(sorted_numbers, sorted_numbers[1:])]
    return gaps


def build_feature_rows(draws):
    draw_records = []
    for index, draw in enumerate(draws):
        draw_records.append(
            {
                "draw_index": index,
                "draw_id": draw["draw_id"],
                "draw_date": draw["draw_date"],
                "draw_ordinal": draw["draw_date"].toordinal(),
                "numbers": set(draw["numbers"]),
                "sorted_numbers": tuple(sorted(draw["numbers"])),
            }
        )

    rows = []
    spacing_transition = [[0 for _ in range(5)] for _ in range(5)]
    previous_spacing_summary = {
        "first_period_filled_with": -1,
        "fields": [f"previous_spacing_{index}" for index in range(1, 6)],
    }
    for index, draw in enumerate(draw_records):
        history = draw_records[:index]
        previous_spacing = [-1] * 5
        if index > 0:
            previous_spacing = draw_spacing(draw_records[index - 1]["sorted_numbers"])
            previous_spacing = [
                value if value > 0 else 1 for value in previous_spacing
            ]
            for left, right in zip(previous_spacing, previous_spacing[1:]):
                left_bin = min(5, max(1, int(left)))
                right_bin = min(5, max(1, int(right)))
                spacing_transition[left_bin - 1][right_bin - 1] += 1

        history_sets = [record["numbers"] for record in history]
        history_count = len(history_sets)
        for number in range(1, 50):
            number_mapping = build_number_mapping(number)
            is_drawn = int(number in draw["numbers"])
            if history_count == 0:
                momentum = {window: 0.0 for window in (1, 5, 10, 30, 100)}
                exp_decay_30 = 0.0
                misses = 0.0
            else:
                momentum = {}
                for window in (1, 5, 10, 30, 100):
                    start = max(0, history_count - window)
                    window_slice = history_sets[start:]
                    count = sum(number in record for record in window_slice)
                    momentum[window] = count / max(1, len(window_slice))
                exp_decay_30 = 0.0
                last_seen = None
                for past_index, past_numbers in enumerate(history_sets):
                    if number in past_numbers:
                        age = history_count - past_index
                        exp_decay_30 += math.exp(-age / 30.0)
                        last_seen = past_index
                misses = float(history_count if last_seen is None else history_count - 1 - last_seen)
            year_sin, year_cos = cyclic_pair(draw["draw_date"].year % 60, 60)
            month_sin, month_cos = cyclic_pair(draw["draw_date"].month, 12)
            day_sin, day_cos = cyclic_pair(draw["draw_date"].day, 31)
            weekday_sin, weekday_cos = cyclic_pair(draw["draw_date"].weekday(), 7)
            iso_week_sin, iso_week_cos = cyclic_pair(draw["draw_date"].isocalendar().week, 53)
            row = {
                "draw_index": index,
                "draw_id": draw["draw_id"],
                "draw_date": draw["draw_date"].isoformat(),
                "number": number,
                "is_drawn": str(is_drawn),
                "momentum_freq_1": f"{momentum[1]:.12f}",
                "momentum_freq_5": f"{momentum[5]:.12f}",
                "momentum_freq_10": f"{momentum[10]:.12f}",
                "momentum_freq_30": f"{momentum[30]:.12f}",
                "momentum_freq_100": f"{momentum[100]:.12f}",
                "exp_decay_30": f"{exp_decay_30:.12f}",
                "misses": f"{misses:.12f}",
                "year_sin": f"{year_sin:.12f}",
                "year_cos": f"{year_cos:.12f}",
                "month_sin": f"{month_sin:.12f}",
                "month_cos": f"{month_cos:.12f}",
                "day_sin": f"{day_sin:.12f}",
                "day_cos": f"{day_cos:.12f}",
                "weekday_sin": f"{weekday_sin:.12f}",
                "weekday_cos": f"{weekday_cos:.12f}",
                "iso_week_sin": f"{iso_week_sin:.12f}",
                "iso_week_cos": f"{iso_week_cos:.12f}",
                "previous_spacing_1": f"{float(previous_spacing[0]):.12f}",
                "previous_spacing_2": f"{float(previous_spacing[1]):.12f}",
                "previous_spacing_3": f"{float(previous_spacing[2]):.12f}",
                "previous_spacing_4": f"{float(previous_spacing[3]):.12f}",
                "previous_spacing_5": f"{float(previous_spacing[4]):.12f}",
                **number_mapping,
            }
            rows.append(row)

    train_rows = [
        row
        for row in rows
        if TRAINING_START.isoformat() <= row["draw_date"] <= TRAINING_END.isoformat()
    ]
    mi_weights = compute_mutual_information(
        train_rows,
        [
            "jiazi_index",
            "stem_index",
            "branch_index",
            "he_partner_stem",
            "he_partner_branch",
            "he_sum",
            "luoshu_palace",
            "wuxing_bin",
        ],
    )
    spacing_summary = {
        "transition_matrix": spacing_transition,
        "row_total": sum(sum(row) for row in spacing_transition),
        "distribution": {
            str(index + 1): sum(row[index] for row in spacing_transition)
            for index in range(5)
        },
    }
    return rows, mi_weights, spacing_summary, previous_spacing_summary


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "draw_index",
        "draw_id",
        "draw_date",
        "number",
        "is_drawn",
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
        "wuxing_bin",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def build_report(draws, rows, mi_weights, spacing_summary, relation_rows):
    date_min = draws[0]["draw_date"].isoformat()
    date_max = draws[-1]["draw_date"].isoformat()
    training_rows = [
        row
        for row in rows
        if TRAINING_START.isoformat() <= row["draw_date"] <= TRAINING_END.isoformat()
    ]
    first_period_rows = [row for row in rows if row["draw_date"] == date_min]
    report = f"""# 科研循环简报_第01轮

## 本轮特征组合图谱

- 冻结目标范围：2006-01-01 至 2026-07-31
- 实际覆盖范围：{date_min} 至 {date_max}
- 基础开奖期数：{len(draws)}
- 长表数据行数：{len(rows)}
- 2026-08：未进入结果
- 四维特征：统计动量、时间周期、玄学映射、空间间隔
- 关系表：{len(relation_rows)} 条，含天干五合与地支六合

## 随机基线

- `hypergeometric_hit_at_least(49, 6, 15, 3) = {hypergeometric_hit_at_least(49, 6, 15, 3):.17f}`
- 精确随机基线：25.71252367737105%

## 训练期互信息权重

"""
    for name, payload in mi_weights.items():
        report += (
            f"- {name}: raw_mi={payload['raw_mi']:.8f}, "
            f"normalized_mi={payload['normalized_mi']:.8f}, "
            f"weight={payload['weight']:.8f}\n"
        )
    report += f"""
## 间距矩阵摘要

- 行总数：{spacing_summary['row_total']}
- 分箱分布：{spacing_summary['distribution']}
- 首期间距：-1

## 当前发现

- 冻结目标范围自 2006-01-01 起算。
- 由于 2006 年无 `verified` 记录，实际覆盖从 2007-01-02 开始。
- 首期历史动量特征已固定为 0。
- 同一期 49 个号码共享同一期之前的历史特征。
- 训练窗口仅覆盖 2007-01-01 至 2015-12-31。
- 当前未输出任何下一期号码。

## 下一阶段五类模型计划

1. 线性基准
2. 树模型标杆
3. 概率图模型
4. 时序卷积网络
5. 贝叶斯个性化排序

## 风险

- 玄学字段仅为候选变量。
- 互信息权重只来自训练期。
- 当前结果不构成投注建议。
"""
    return report


def main():
    relation_rows = load_relation_table()
    draws = parse_rows(
        start_date=ANALYSIS_START,
        end_date=ANALYSIS_END,
    )
    rows, mi_weights, spacing_summary, previous_spacing_summary = build_feature_rows(draws)
    write_csv(MID_PATH, rows)
    topology = {
        "analysis_bounds": {
            "start_date": ANALYSIS_START.isoformat(),
            "end_date": ANALYSIS_END.isoformat(),
            "training_start": TRAINING_START.isoformat(),
            "training_end": TRAINING_END.isoformat(),
        },
        "coverage_bounds": {
            "frozen_start_date": ANALYSIS_START.isoformat(),
            "actual_start_date": draws[0]["draw_date"].isoformat(),
            "actual_end_date": draws[-1]["draw_date"].isoformat(),
        },
        "record_count": len(draws),
        "row_count": len(rows),
        "date_min": draws[0]["draw_date"].isoformat(),
        "date_max": draws[-1]["draw_date"].isoformat(),
        "random_baseline": {
            "population": 49,
            "successes": 6,
            "selected": 15,
            "threshold": 3,
            "hit_at_least": hypergeometric_hit_at_least(49, 6, 15, 3),
        },
        "field_groups": {
            "momentum": [
                "momentum_freq_1",
                "momentum_freq_5",
                "momentum_freq_10",
                "momentum_freq_30",
                "momentum_freq_100",
                "exp_decay_30",
                "misses",
            ],
            "time": [
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
            ],
            "esoteric": [
                "jiazi_index",
                "stem_index",
                "branch_index",
                "he_partner_stem",
                "he_partner_branch",
                "he_sum",
                "luoshu_palace",
                "wuxing_bin",
            ],
            "spacing": previous_spacing_summary["fields"],
        },
        "mi_weights": mi_weights,
        "spacing_transition": spacing_summary,
        "relation_table": {
            "rows": len(relation_rows),
            "types": sorted({row["类型"] for row in relation_rows}),
        },
    }
    write_json(JSON_PATH, topology)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        build_report(draws, rows, mi_weights, spacing_summary, relation_rows),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "status": "COMPLETE",
                "record_count": len(draws),
                "row_count": len(rows),
                "date_min": draws[0]["draw_date"].isoformat(),
                "date_max": draws[-1]["draw_date"].isoformat(),
                "csv_path": str(MID_PATH),
                "json_path": str(JSON_PATH),
                "report_path": str(REPORT_PATH),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
