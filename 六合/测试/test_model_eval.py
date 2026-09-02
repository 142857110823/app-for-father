import csv
import math
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(r"F:\1\夫\六合")
CSV_PATH = ROOT / "分析" / "中间数据" / "台湾_特征超空间.csv"

sys.path.insert(0, str(ROOT / "分析" / "运行时"))

import model_eval  # noqa: E402


class ModelEvalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = model_eval.load_feature_rows(CSV_PATH)
        cls.dataset = model_eval.build_draw_dataset(cls.rows)
        cls.splits = model_eval.split_by_date(cls.dataset)

    def test_load_feature_rows_excludes_august_2026(self):
        self.assertTrue(all(row["draw_date"].isoformat()[:7] != "2026-08" for row in self.rows))

    def test_load_feature_rows_can_filter_temp_csv(self):
        fields = [
            "draw_index",
            "draw_id",
            "draw_date",
            "number",
            "is_drawn",
            "momentum_freq_1",
            "wuxing_bin",
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.csv"
            with path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                writer.writerow(
                    {
                        "draw_index": "1",
                        "draw_id": "A",
                        "draw_date": "2026-07-31",
                        "number": "1",
                        "is_drawn": "1",
                        "momentum_freq_1": "0.5",
                        "wuxing_bin": "木",
                    }
                )
                writer.writerow(
                    {
                        "draw_index": "2",
                        "draw_id": "B",
                        "draw_date": "2026-08-01",
                        "number": "2",
                        "is_drawn": "0",
                        "momentum_freq_1": "0.2",
                        "wuxing_bin": "火",
                    }
                )
            filtered = model_eval.load_feature_rows(path)
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["draw_date"].isoformat(), "2026-07-31")

    def test_dataset_rebuilds_49_candidates_per_draw(self):
        first_draw = self.dataset["draws"][0]
        self.assertEqual(len(first_draw["candidates"]), 49)
        self.assertEqual(len(first_draw["labels"]), 49)
        self.assertEqual(sum(first_draw["labels"]), 6)
        self.assertNotIn("is_drawn", first_draw["candidates"][0]["features"])
        self.assertNotIn("draw_id", first_draw["candidates"][0]["features"])
        self.assertNotIn("draw_index", first_draw["candidates"][0]["features"])
        self.assertNotIn("draw_date", first_draw["candidates"][0]["features"])
        self.assertNotIn("number", first_draw["candidates"][0]["features"])

    def test_split_by_date_returns_three_strict_ranges(self):
        self.assertEqual(set(self.splits), {"train", "validation", "test"})
        self.assertEqual(self.splits["train"]["draw_count"], 951)
        self.assertEqual(self.splits["validation"]["draw_count"], 551)
        self.assertEqual(self.splits["test"]["draw_count"], 655)
        self.assertGreaterEqual(self.splits["train"]["date_start"], "2007-01-01")
        self.assertLessEqual(self.splits["train"]["date_end"], "2015-12-31")
        self.assertGreaterEqual(self.splits["validation"]["date_start"], "2016-01-01")
        self.assertLessEqual(self.splits["validation"]["date_end"], "2020-12-31")
        self.assertGreaterEqual(self.splits["test"]["date_start"], "2021-01-01")
        self.assertEqual(self.splits["test"]["date_end"], "2026-07-31")

    def test_topk_ties_break_by_number_ascending(self):
        result = model_eval.evaluate_predictions(
            probabilities=[[0.5] * 49],
            truth=[[1 if number in {4, 1} else 0 for number in range(1, 50)]],
            numbers=[list(range(1, 50))],
            k=2,
            threshold=1,
        )
        self.assertEqual(result["topk_numbers"][0], [1, 2])

    def test_evaluate_predictions_returns_expected_metrics(self):
        probabilities = [
            [0.9 if number <= 15 else 0.1 for number in range(1, 50)],
            [0.8 if 10 <= number <= 24 else 0.05 for number in range(1, 50)],
        ]
        truth = [
            [1 if number in {1, 2, 3, 4, 5, 6} else 0 for number in range(1, 50)],
            [1 if number in {10, 11, 12, 13, 14, 15} else 0 for number in range(1, 50)],
        ]
        numbers = [list(range(1, 50)), list(range(1, 50))]
        result = model_eval.evaluate_predictions(probabilities, truth, numbers, k=2, threshold=1)
        self.assertIn("hit_counts", result)
        self.assertIn("hit_at_least_threshold_rate", result)
        self.assertIn("mean_recall", result)
        self.assertIn("brier_score", result)
        self.assertIn("log_loss", result)
        self.assertEqual(len(result["hit_counts"]), 2)
        self.assertTrue(0 <= result["hit_at_least_threshold_rate"] <= 1)
        self.assertTrue(0 <= result["mean_recall"] <= 1)
        self.assertTrue(math.isfinite(result["brier_score"]))
        self.assertTrue(math.isfinite(result["log_loss"]))

    def test_evaluate_predictions_rejects_non_49_vectors(self):
        with self.assertRaises(ValueError):
            model_eval.evaluate_predictions([[0.1, 0.2]], [[1, 0]], [[1, 2]])

    def test_permutation_p_value_is_deterministic_and_bounded(self):
        predicted_sets = [{1, 2, 3}, {4, 5, 6}]
        truth_sets = [{1, 7, 8}, {4, 9, 10}]
        first = model_eval.permutation_p_value(predicted_sets, truth_sets, threshold=2, permutations=50, seed=20260902)
        second = model_eval.permutation_p_value(predicted_sets, truth_sets, threshold=2, permutations=50, seed=20260902)
        self.assertEqual(first, second)
        self.assertGreaterEqual(first, 0.0)
        self.assertLessEqual(first, 1.0)


if __name__ == "__main__":
    unittest.main()
