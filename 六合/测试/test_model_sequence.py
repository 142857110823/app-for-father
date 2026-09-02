import math
import random
import sys
import unittest
from copy import deepcopy
from pathlib import Path


ROOT = Path(r"F:\1\夫\六合")
CSV_PATH = ROOT / "分析" / "中间数据" / "台湾_特征超空间.csv"

sys.path.insert(0, str(ROOT / "分析" / "运行时"))

import model_eval  # noqa: E402
import model_sequence  # noqa: E402


class ModelSequenceTests(unittest.TestCase):
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

    def _slice_split(self, split, draw_count):
        sliced = deepcopy(split)
        sliced["draws"] = deepcopy(split["draws"][:draw_count])
        sliced["samples"] = deepcopy(split["samples"][: draw_count * 49])
        sliced["matrix"] = deepcopy(split["matrix"][: draw_count * 49])
        sliced["labels"] = deepcopy(split["labels"][: draw_count * 49])
        sliced["draw_count"] = draw_count
        sliced["sample_count"] = draw_count * 49
        if draw_count:
            sliced["date_start"] = sliced["draws"][0]["draw_date"].isoformat()
            sliced["date_end"] = sliced["draws"][-1]["draw_date"].isoformat()
        else:
            sliced["date_start"] = None
            sliced["date_end"] = None
        return sliced

    def _mutate_labels_at_index(self, split, draw_index):
        mutated = deepcopy(split)
        draw = mutated["draws"][draw_index]
        draw["truth_numbers"] = tuple(range(1, 7))
        draw["labels"] = [1 if number <= 6 else 0 for number in range(1, 50)]
        for candidate in draw["candidates"]:
            candidate["label"] = 1 if candidate["number"] <= 6 else 0
        target_draw_index = draw["draw_index"]
        for sample in mutated["samples"]:
            if sample["draw_index"] == target_draw_index:
                sample["label"] = 1 if sample["number"] <= 6 else 0
        offset = draw_index * 49
        mutated["labels"][offset : offset + 49] = draw["labels"][:]
        return mutated

    def test_tcn_reproducible_and_probabilities_are_bounded(self):
        model = model_sequence.fit_tcn_baseline(self.train_split, seed=20260902)
        repeat = model_sequence.fit_tcn_baseline(self.train_split, seed=20260902)
        validation_probabilities = model_sequence.predict_sequence_model(model, self.validation_split)
        repeat_probabilities = model_sequence.predict_sequence_model(repeat, self.validation_split)

        self.assertEqual(model["model_type"], "tcn_baseline")
        self.assertEqual(model["seed"], 20260902)
        self.assertEqual(model["holdout_update_mode"], "frozen_train_history")
        self._assert_probability_rows(validation_probabilities, self.validation_split["draw_count"])
        self.assertEqual(validation_probabilities, repeat_probabilities)

    def test_tcn_window_does_not_use_target_period_labels(self):
        model = model_sequence.fit_tcn_baseline(self.train_split, seed=20260902)
        original = model_sequence.predict_sequence_model(model, self.validation_split)
        mutated_split = self._mutate_labels_at_index(self.validation_split, 9)
        mutated = model_sequence.predict_sequence_model(model, mutated_split)
        self.assertEqual(original, mutated)

    def test_bpr_reproducible_and_probabilities_are_bounded(self):
        model = model_sequence.fit_bpr_baseline(self.train_split, seed=20260902)
        repeat = model_sequence.fit_bpr_baseline(self.train_split, seed=20260902)
        validation_probabilities = model_sequence.predict_sequence_model(model, self.validation_split)
        repeat_probabilities = model_sequence.predict_sequence_model(repeat, self.validation_split)

        self.assertEqual(model["model_type"], "bpr_baseline")
        self.assertEqual(model["seed"], 20260902)
        self.assertEqual(model["holdout_update_mode"], "frozen_train_history")
        self._assert_probability_rows(validation_probabilities, self.validation_split["draw_count"])
        self.assertEqual(validation_probabilities, repeat_probabilities)

    def test_bpr_window_does_not_use_holdout_period_labels(self):
        model = model_sequence.fit_bpr_baseline(self.train_split, seed=20260902)
        original = model_sequence.predict_sequence_model(model, self.validation_split)
        mutated_split = self._mutate_labels_at_index(self.validation_split, 9)
        mutated = model_sequence.predict_sequence_model(model, mutated_split)
        self.assertEqual(original, mutated)

    def test_bpr_rejects_inconsistent_training_boundary(self):
        bogus_train = deepcopy(self.train_split)
        bogus_train["draws"].append(deepcopy(self.validation_split["draws"][0]))
        with self.assertRaises(ValueError):
            model_sequence.fit_bpr_baseline(bogus_train, seed=20260902)

    def test_negative_sampler_keeps_exact_pair_count_with_replacement(self):
        rng = random.Random(20260902)
        sampled = model_sequence._sample_negatives_with_replacement(rng, [7], 5)
        self.assertEqual(len(sampled), 5)
        self.assertEqual(sampled, [7, 7, 7, 7, 7])

    def test_predict_sequence_model_rejects_empty_short_and_single_period_input(self):
        empty_split = self._slice_split(self.train_split, 0)
        short_split = self._slice_split(self.train_split, 10)
        single_split = self._slice_split(self.validation_split, 1)

        with self.assertRaises(ValueError):
            model_sequence.fit_tcn_baseline(empty_split, seed=20260902)
        with self.assertRaises(ValueError):
            model_sequence.fit_tcn_baseline(short_split, seed=20260902)
        with self.assertRaises(ValueError):
            model_sequence.fit_bpr_baseline(empty_split, seed=20260902)
        with self.assertRaises(ValueError):
            model_sequence.fit_bpr_baseline(short_split, seed=20260902)

        model = model_sequence.fit_tcn_baseline(self.train_split, seed=20260902)
        with self.assertRaises(ValueError):
            model_sequence.predict_sequence_model(model, single_split)

    def test_predict_sequence_model_rejects_broken_split(self):
        model = model_sequence.fit_tcn_baseline(self.train_split, seed=20260902)
        broken_split = dict(self.validation_split)
        broken_split.pop("draws", None)
        with self.assertRaises(ValueError):
            model_sequence.predict_sequence_model(model, broken_split)


if __name__ == "__main__":
    unittest.main()
