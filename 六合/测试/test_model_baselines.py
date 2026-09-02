import math
import sys
import unittest
from collections import Counter, defaultdict
from pathlib import Path
from copy import deepcopy


ROOT = Path(r"F:\1\夫\六合")
CSV_PATH = ROOT / "分析" / "中间数据" / "台湾_特征超空间.csv"

sys.path.insert(0, str(ROOT / "分析" / "运行时"))

import model_eval  # noqa: E402
import model_baselines  # noqa: E402


class ModelBaselineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        rows = model_eval.load_feature_rows(CSV_PATH)
        dataset = model_eval.build_draw_dataset(rows)
        cls.splits = model_eval.split_by_date(dataset)
        cls.train_split = cls.splits["train"]
        cls.validation_split = cls.splits["validation"]
        cls.test_split = cls.splits["test"]

    def _assert_probability_rows(self, probabilities, expected_periods):
        self.assertEqual(len(probabilities), expected_periods)
        for row in probabilities:
            self.assertEqual(len(row), 49)
            for value in row:
                self.assertTrue(math.isfinite(value))
                self.assertGreaterEqual(value, 0.0)
                self.assertLessEqual(value, 1.0)

    def _assert_no_leakage(self, model):
        feature_names = model.get("feature_names", [])
        self.assertNotIn("is_drawn", feature_names)
        self.assertNotIn("draw_id", feature_names)
        self.assertNotIn("draw_index", feature_names)
        self.assertNotIn("draw_date", feature_names)
        self.assertNotIn("number", feature_names)

    def _assert_training_metadata(self, model):
        self.assertEqual(model["train_draw_count"], self.train_split["draw_count"])
        self.assertEqual(model["train_sample_count"], self.train_split["sample_count"])
        self.assertTrue(model["feature_names"])
        self._assert_no_leakage(model)

    def _expected_markov_table(self, draws):
        history_draws = [tuple(sorted(int(number) for number in draw["truth_numbers"])) for draw in draws]
        last_seen = {number: None for number in range(1, 50)}
        conditional_totals = defaultdict(lambda: Counter())
        candidate_positives = Counter()

        for draw_index, truth_numbers in enumerate(history_draws):
            past_draws = history_draws[:draw_index]
            for number in range(1, 50):
                last_seen_index = last_seen[number]
                gap = draw_index if last_seen_index is None else draw_index - last_seen_index - 1
                gap_bin = model_baselines._gap_bin(gap)
                momentum_count = sum(1 for past_truth_numbers in past_draws[-model_baselines.MARKOV_WINDOW:] if number in past_truth_numbers)
                momentum_bin = model_baselines._momentum_bin(momentum_count)
                key = (gap_bin, momentum_bin)
                y = 1 if number in truth_numbers else 0
                conditional_totals[key]["total"] += 1
                conditional_totals[key]["positive"] += y
                candidate_positives[number] += y
            for number in truth_numbers:
                last_seen[number] = draw_index

        total_samples = len(history_draws) * 49
        total_positives = sum(candidate_positives.values())
        overall_rate = total_positives / total_samples if total_samples else 0.0
        expected = {}
        for gap_bin in range(len(model_baselines.GAP_BINS)):
            for momentum_bin in model_baselines.MOMENTUM_BINS:
                key = (gap_bin, momentum_bin)
                stats = conditional_totals.get(key, Counter())
                expected[key] = {
                    "total": int(stats.get("total", 0)),
                    "positive": int(stats.get("positive", 0)),
                    "probability": (
                        (stats.get("positive", 0) + model_baselines.SMOOTHING * overall_rate)
                        / (stats.get("total", 0) + model_baselines.SMOOTHING)
                    ),
                }
        return expected

    def test_logistic_baseline_shape_and_reproducibility(self):
        model = model_baselines.fit_logistic_baseline(self.train_split, random_state=20260902)
        repeat = model_baselines.fit_logistic_baseline(self.train_split, random_state=20260902)
        self._assert_training_metadata(model)
        self._assert_probability_rows(model_baselines.predict_model(model, self.validation_split), self.validation_split["draw_count"])
        self.assertEqual(
            model_baselines.predict_model(model, self.validation_split),
            model_baselines.predict_model(repeat, self.validation_split),
        )

    def test_lightgbm_baseline_shape_and_reproducibility(self):
        model = model_baselines.fit_lightgbm_baseline(self.train_split, random_state=20260902)
        repeat = model_baselines.fit_lightgbm_baseline(self.train_split, random_state=20260902)
        self._assert_training_metadata(model)
        self._assert_probability_rows(model_baselines.predict_model(model, self.test_split), self.test_split["draw_count"])
        self.assertEqual(
            model_baselines.predict_model(model, self.test_split),
            model_baselines.predict_model(repeat, self.test_split),
        )

    def test_conditional_markov_approximation_metadata_and_shape(self):
        model = model_baselines.fit_conditional_markov_approximation(self.train_split)
        self.assertEqual(model["formal_crf_status"], "not_implemented")
        self.assertEqual(model["model_type"], "conditional_markov_approximation")
        self._assert_training_metadata(model)
        self._assert_probability_rows(model_baselines.predict_model(model, self.validation_split), self.validation_split["draw_count"])

    def test_conditional_markov_training_statistics_are_causal(self):
        synthetic_split = {
            "draws": [
                {"truth_numbers": (1, 2, 3, 4, 5, 6)},
                {"truth_numbers": (7, 8, 9, 10, 11, 12)},
                {"truth_numbers": (1, 13, 14, 15, 16, 17)},
                {"truth_numbers": (18, 19, 20, 21, 22, 23)},
            ],
            "samples": [None] * (4 * 49),
            "matrix": [[0.0] for _ in range(4 * 49)],
            "labels": [0] * (4 * 49),
            "feature_names": ["synthetic_feature"],
            "candidate_numbers": list(range(1, 50)),
            "draw_count": 4,
            "sample_count": 4 * 49,
        }
        model = model_baselines.fit_conditional_markov_approximation(synthetic_split)
        expected = self._expected_markov_table(synthetic_split["draws"])

        self.assertTrue(model["frozen_history"])
        self.assertEqual(model["history_draws"], [tuple(sorted(draw["truth_numbers"])) for draw in synthetic_split["draws"]])
        self.assertEqual(set(model["conditional_table"]), set(expected))
        for key, stats in expected.items():
            with self.subTest(key=key):
                actual = model["conditional_table"][key]
                self.assertEqual(actual["total"], stats["total"])
                self.assertEqual(actual["positive"], stats["positive"])
                self.assertAlmostEqual(actual["probability"], stats["probability"], places=12)

    def test_conditional_markov_predictions_ignore_holdout_truth_numbers(self):
        model = model_baselines.fit_conditional_markov_approximation(self.train_split)
        altered_validation = deepcopy(self.validation_split)
        for index, draw in enumerate(altered_validation["draws"]):
            start = (index % 44) + 1
            draw["truth_numbers"] = tuple(range(start, start + 6))
        original = model_baselines.predict_model(model, self.validation_split)
        altered = model_baselines.predict_model(model, altered_validation)
        self.assertEqual(original, altered)

    def test_predict_model_rejects_empty_split(self):
        model = model_baselines.fit_logistic_baseline(self.train_split, random_state=20260902)
        with self.assertRaises(ValueError):
            model_baselines.predict_model(model, {"draws": [], "samples": [], "draw_count": 0})

    def test_predict_model_rejects_missing_feature_columns(self):
        model = model_baselines.fit_logistic_baseline(self.train_split, random_state=20260902)
        broken_split = dict(self.validation_split)
        broken_split.pop("feature_names", None)
        with self.assertRaises(ValueError):
            model_baselines.predict_model(model, broken_split)


if __name__ == "__main__":
    unittest.main()
