import math
import sys
import unittest
from copy import deepcopy
from pathlib import Path
from unittest import mock


ROOT = Path(r"F:\1\夫\六合")
CSV_PATH = ROOT / "分析" / "中间数据" / "台湾_特征超空间.csv"

sys.path.insert(0, str(ROOT / "分析" / "运行时"))

import model_eval  # noqa: E402
import loop2_pruning  # noqa: E402


class Loop2PruningTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        rows = model_eval.load_feature_rows(CSV_PATH)
        cls.dataset = model_eval.build_draw_dataset(rows)
        cls.grouped = loop2_pruning.build_feature_group_splits(cls.dataset)
        cls.train_split = cls.grouped["train"]
        cls.validation_split = cls.grouped["validation"]

    def test_build_feature_group_splits_does_not_touch_test_split(self):
        with mock.patch.object(model_eval, "split_by_date", side_effect=AssertionError("must not touch test split")):
            grouped = loop2_pruning.build_feature_group_splits(self.dataset, selected_groups=["momentum", "time"])
        self.assertEqual(grouped["selected_groups"], ["momentum", "time"])
        self.assertIn("momentum_freq_1", grouped["feature_names"])
        self.assertNotIn("draw_id", grouped["feature_names"])

    def test_build_feature_group_splits_rejects_empty_unknown_and_metadata(self):
        with self.assertRaises(ValueError):
            loop2_pruning.build_feature_group_splits(self.dataset, selected_groups=[])
        with self.assertRaises(ValueError):
            loop2_pruning.build_feature_group_splits(self.dataset, selected_groups=["unknown"])

    def test_evaluate_group_set_rejects_empty_and_metadata_columns(self):
        with self.assertRaises(ValueError):
            loop2_pruning.evaluate_group_set(self.train_split, self.validation_split, [])
        with self.assertRaises(ValueError):
            loop2_pruning.evaluate_group_set(self.train_split, self.validation_split, ["draw_id"])
        with self.assertRaises(ValueError):
            loop2_pruning.evaluate_group_set(self.train_split, self.validation_split, ["not_a_feature"])

    def test_evaluate_group_set_runs_and_returns_validation_metrics(self):
        result = loop2_pruning.evaluate_group_set(
            self.train_split,
            self.validation_split,
            self.grouped["feature_names"],
        )
        self.assertIn("train_metrics", result)
        self.assertIn("validation_metrics", result)
        self.assertIn("validation_mean_recall", result)
        self.assertNotIn("test_metrics", result)
        self.assertTrue(math.isfinite(result["validation_mean_recall"]))
        self.assertGreaterEqual(result["validation_mean_recall"], 0.0)
        self.assertLessEqual(result["validation_mean_recall"], 1.0)

    def test_exact_group_shapley_is_reproducible_and_covers_all_groups(self):
        groups = ["momentum", "time", "esoteric", "spacing"]
        first = loop2_pruning.compute_exact_group_shapley(self.train_split, self.validation_split, groups)
        second = loop2_pruning.compute_exact_group_shapley(self.train_split, self.validation_split, groups)
        self.assertEqual(first, second)
        self.assertEqual(set(first["groups"]), set(groups))
        self.assertEqual(set(first["shapley_values"]), set(groups))
        self.assertEqual(len(first["subset_scores"]), 16)
        self.assertEqual(first["baseline_score"], second["baseline_score"])

    def test_forward_and_backward_paths_record_candidates_and_scores(self):
        groups = ["momentum", "time", "esoteric", "spacing"]
        forward = loop2_pruning.forward_select_groups(self.train_split, self.validation_split, groups)
        backward = loop2_pruning.backward_prune_groups(self.train_split, self.validation_split, groups)
        for payload in (forward, backward):
            self.assertIn("steps", payload)
            self.assertIn("final_groups", payload)
            self.assertIn("final_validation_mean_recall", payload)
            for step in payload["steps"]:
                self.assertIn("candidates", step)
                self.assertTrue(step["candidates"])
                self.assertTrue(all("validation_mean_recall" in candidate for candidate in step["candidates"]))

    def test_evaluate_group_set_is_not_mutated_by_inputs(self):
        feature_names = deepcopy(self.grouped["feature_names"])
        result = loop2_pruning.evaluate_group_set(self.train_split, self.validation_split, feature_names)
        self.assertEqual(feature_names, self.grouped["feature_names"])
        self.assertEqual(result["feature_names"], self.grouped["feature_names"])


if __name__ == "__main__":
    unittest.main()
