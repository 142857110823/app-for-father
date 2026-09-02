import json
import math
import sys
import unittest
from copy import deepcopy
from pathlib import Path
from unittest import mock


ROOT = Path(r"F:\1\夫\六合")
CSV_PATH = ROOT / "分析" / "中间数据" / "台湾_特征超空间.csv"
MODEL_FACTORY_JSON = ROOT / "分析" / "统计结果" / "台湾_第一轮模型回测.json"

sys.path.insert(0, str(ROOT / "分析" / "运行时"))

import loop2_ensemble  # noqa: E402
import model_baselines  # noqa: E402
import model_eval  # noqa: E402


class GuardDict(dict):
    def __getitem__(self, key):
        raise AssertionError(f"unexpected access to {key}")


class FakeXGBRegressor:
    instances = []

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.fit_x = None
        self.fit_y = None
        FakeXGBRegressor.instances.append(self)

    def fit(self, X, y):
        self.fit_x = [[float(value) for value in row] for row in X]
        self.fit_y = [float(value) for value in y]
        return self

    def predict(self, X):
        if self.fit_y is None:
            raise AssertionError("predict called before fit")
        return [sum(self.fit_y) / len(self.fit_y)] * len(X)


class Loop2EnsembleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        rows = model_eval.load_feature_rows(CSV_PATH)
        dataset = model_eval.build_draw_dataset(rows)
        splits = model_eval.split_by_date(dataset)
        cls.train_split = splits["train"]
        cls.validation_split = splits["validation"]
        cls.logistic_model = model_baselines.fit_logistic_baseline(cls.train_split, random_state=20260902)
        cls.train_probabilities = model_baselines.predict_model(cls.logistic_model, cls.train_split)
        cls.validation_probabilities = model_baselines.predict_model(cls.logistic_model, cls.validation_split)
        cls.factory_payload = json.loads(MODEL_FACTORY_JSON.read_text(encoding="utf-8"))

    def test_soft_vote_normalizes_weights_and_preserves_shape(self):
        a = [[0.2] * 49, [0.8] * 49]
        b = [[0.6] * 49, [0.4] * 49]
        voted = loop2_ensemble.soft_vote([a, b], weights=[2, 1])
        self.assertEqual(len(voted), 2)
        self.assertEqual(len(voted[0]), 49)
        self.assertTrue(all(math.isclose(value, 0.3333333333333333, rel_tol=1e-12) for value in voted[0]))
        self.assertTrue(all(math.isclose(value, 0.6666666666666666, rel_tol=1e-12) for value in voted[1]))

    def test_soft_vote_rejects_invalid_inputs(self):
        with self.assertRaises(ValueError):
            loop2_ensemble.soft_vote([], weights=None)
        with self.assertRaises(ValueError):
            loop2_ensemble.soft_vote([[[0.1] * 49], [[0.2] * 48]], weights=[1, 1])
        with self.assertRaises(ValueError):
            loop2_ensemble.soft_vote([[[0.1] * 49]], weights=[-1])
        with self.assertRaises(ValueError):
            loop2_ensemble.soft_vote([[[0.1] * 49]], weights=[0])
        with self.assertRaises(ValueError):
            loop2_ensemble.soft_vote([[[1.1] * 49]], weights=[1])

    def test_build_top_three_slots_uses_validation_ranking_only(self):
        payload = deepcopy(self.factory_payload)
        ranking = payload["selection_rule"]["ranking"]
        payload["models"] = {
            slot: {**payload["models"][slot], "final_holdout": GuardDict()} for slot in payload["models"]
        }
        top_three = loop2_ensemble.build_top_three_slots(payload)
        self.assertEqual(top_three["ranking_source"], "validation_ranking")
        self.assertEqual([item["slot"] for item in top_three["top_three_slots"]], ranking[:3])
        self.assertTrue(all(item["basis"] == "validation_ranking_only" for item in top_three["top_three_slots"]))

    def test_fit_xgboost_residual_returns_not_implemented_when_dependency_missing(self):
        with mock.patch.object(loop2_ensemble, "XGBRegressor", None):
            model = loop2_ensemble.fit_xgboost_residual(self.train_split, self.train_probabilities, seed=20260902)
        self.assertEqual(model["status"], "not_implemented")
        self.assertEqual(model["reason"], "xgboost_unavailable")
        self.assertEqual(model["base_probability_shape"], [self.train_split["draw_count"], 49])

    def test_fit_xgboost_residual_uses_residual_targets_and_is_reproducible(self):
        FakeXGBRegressor.instances.clear()
        with mock.patch.object(loop2_ensemble, "XGBRegressor", FakeXGBRegressor):
            first = loop2_ensemble.fit_xgboost_residual(self.train_split, self.train_probabilities, seed=20260902)
            second = loop2_ensemble.fit_xgboost_residual(self.train_split, self.train_probabilities, seed=20260902)
        self.assertEqual(first["status"], "adopted")
        self.assertEqual(second["status"], "adopted")
        self.assertEqual(first["seed"], second["seed"])
        self.assertEqual(len(FakeXGBRegressor.instances), 2)
        expected_target = [
            label - probability
            for label, probability in zip(
                self.train_split["labels"],
                [value for row in self.train_probabilities for value in row],
            )
        ]
        self.assertEqual(len(FakeXGBRegressor.instances[0].fit_x), self.train_split["sample_count"])
        self.assertTrue(all(math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12) for a, b in zip(FakeXGBRegressor.instances[0].fit_y, expected_target)))
        with mock.patch.object(loop2_ensemble, "XGBRegressor", FakeXGBRegressor):
            predicted_first = loop2_ensemble.predict_xgboost_residual(first, self.validation_split, self.validation_probabilities)
            predicted_second = loop2_ensemble.predict_xgboost_residual(second, self.validation_split, self.validation_probabilities)
        self.assertEqual(predicted_first, predicted_second)
        self.assertEqual(len(predicted_first), self.validation_split["draw_count"])
        self.assertEqual(len(predicted_first[0]), 49)
        self.assertTrue(all(0.0 <= value <= 1.0 for row in predicted_first for value in row))

    def test_predict_xgboost_residual_rejects_non_adopted_models(self):
        model = {"model_type": "xgboost_residual_regressor", "status": "not_implemented"}
        with self.assertRaises(ValueError):
            loop2_ensemble.predict_xgboost_residual(model, self.validation_split, self.validation_probabilities)

    def test_blend_residual_probabilities_clips_and_validates_strength(self):
        base = [[0.9] * 49]
        residual = [[0.1] * 49]
        blended = loop2_ensemble.blend_residual_probabilities(base, residual, strength=0.25)
        self.assertTrue(all(math.isclose(value, 0.7, rel_tol=1e-12) for value in blended[0]))
        with self.assertRaises(ValueError):
            loop2_ensemble.blend_residual_probabilities(base, residual, strength=1.5)


if __name__ == "__main__":
    unittest.main()
