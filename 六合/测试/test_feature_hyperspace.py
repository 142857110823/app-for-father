import csv
import json
import math
import sys
import unittest
from pathlib import Path


ROOT = Path(r"F:\1\夫\六合")
sys.path.insert(0, str(ROOT / "分析" / "运行时"))

import build_taiwan_feature_hyperspace as builder  # noqa: E402


CSV_PATH = ROOT / "分析" / "中间数据" / "台湾_特征超空间.csv"
JSON_PATH = ROOT / "分析" / "统计结果" / "台湾_第一轮特征拓扑.json"
RAW_PATH = ROOT / "台湾" / "原始" / "台湾大乐透_开奖历史.csv"


class FeatureHyperspaceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with CSV_PATH.open(encoding="utf-8-sig") as handle:
            cls.rows = list(csv.DictReader(handle))
        cls.topology = json.loads(JSON_PATH.read_text(encoding="utf-8"))

    def test_hypergeometric_baseline_is_exact(self):
        self.assertTrue(
            math.isclose(
                builder.hypergeometric_hit_at_least(49, 6, 15, 3),
                0.25712523677371046,
                rel_tol=0.0,
                abs_tol=1e-15,
            )
        )

    def test_row_count_matches_frozen_long_table(self):
        self.assertEqual(len(self.rows), 2157 * 49)

    def test_first_period_history_features_are_zero(self):
        first_date = min(row["draw_date"] for row in self.rows)
        first_rows = [row for row in self.rows if row["draw_date"] == first_date]
        for row in first_rows:
            for name in (
                "momentum_freq_1",
                "momentum_freq_5",
                "momentum_freq_10",
                "momentum_freq_30",
                "momentum_freq_100",
                "exp_decay_30",
                "misses",
                "previous_spacing_1",
                "previous_spacing_2",
                "previous_spacing_3",
                "previous_spacing_4",
                "previous_spacing_5",
            ):
                if name.startswith("previous_spacing_"):
                    self.assertEqual(float(row[name]), -1.0, name)
                else:
                    self.assertEqual(float(row[name]), 0.0, name)

    def test_time_fields_include_sine_and_cosine(self):
        sample = self.rows[0]
        for field in (
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
        ):
            self.assertIn(field, sample)

    def test_esoteric_and_spacing_fields_exist(self):
        sample = self.rows[0]
        for field in (
            "jiazi_index",
            "stem_index",
            "branch_index",
            "he_partner_stem",
            "he_partner_branch",
            "he_sum",
            "luoshu_palace",
            "wuxing_bin",
            "previous_spacing_1",
            "previous_spacing_2",
            "previous_spacing_3",
            "previous_spacing_4",
            "previous_spacing_5",
            "is_drawn",
        ):
            self.assertIn(field, sample)

    def test_august_2026_is_excluded(self):
        self.assertTrue(all(not row["draw_date"].startswith("2026-08") for row in self.rows))

    def test_is_drawn_matches_source_numbers(self):
        with RAW_PATH.open(encoding="utf-8-sig") as handle:
            raw_rows = list(csv.DictReader(handle))
        verified = [
            row
            for row in raw_rows
            if row["record_status"] == "verified"
            and row["draw_date"] <= "2026-07-31"
        ]
        verified.sort(key=lambda row: (row["draw_date"], row["draw_id"]))
        expected = []
        for row in verified:
            numbers = {int(value) for value in row["numbers"].split("|")}
            expected.extend((row["draw_date"], number, "1" if number in numbers else "0") for number in range(1, 50))
        actual = [
            (row["draw_date"], int(row["number"]), row["is_drawn"])
            for row in self.rows
        ]
        self.assertEqual(actual, expected)


if __name__ == "__main__":
    unittest.main()
