import math
import sys
import unittest
from pathlib import Path


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

    def test_logistic_baseline_shape_and_reproducibility(self):
        model = model_baselines.fit_logistic_baseline(self.train_split, random_state=20260902)
        repeat = model_baselines.fit_logistic_baseline(self.train_split, random_state=20260902)
        self._assert_no_leakage(model)
        self._assert_probability_rows(model_baselines.predict_model(model, self.validation_split), self.validation_split["draw_count"])
        self.assertEqual(
            model_baselines.predict_model(model, self.validation_split),
            model_baselines.predict_model(repeat, self.validation_split),
        )

    def test_lightgbm_baseline_shape_and_reproducibility(self):
        model = model_baselines.fit_lightgbm_baseline(self.train_split, random_state=20260902)
        repeat = model_baselines.fit_lightgbm_baseline(self.train_split, random_state=20260902)
        self._assert_no_leakage(model)
        self._assert_probability_rows(model_baselines.predict_model(model, self.test_split), self.test_split["draw_count"])
        self.assertEqual(
            model_baselines.predict_model(model, self.test_split),
            model_baselines.predict_model(repeat, self.test_split),
        )

    def test_conditional_markov_approximation_metadata_and_shape(self):
        model = model_baselines.fit_conditional_markov_approximation(self.train_split)
        self.assertEqual(model["formal_crf_status"], "not_implemented")
        self.assertEqual(model["model_type"], "conditional_markov_approximation")
        self._assert_no_leakage(model)
        self._assert_probability_rows(model_baselines.predict_model(model, self.validation_split), self.validation_split["draw_count"])

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
