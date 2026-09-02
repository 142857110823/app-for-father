import json
import sys
import unittest
from pathlib import Path


ROOT = Path(r"F:\1\夫\六合")
OUTPUT_JSON = ROOT / "分析" / "统计结果" / "台湾_第一轮模型回测.json"
OUTPUT_BRIEF = ROOT / "分析" / "报告" / "科研循环简报_第01轮_阶段二.md"

sys.path.insert(0, str(ROOT / "分析" / "运行时"))

import run_taiwan_model_factory  # noqa: E402


class ModelFactoryIntegrationTests(unittest.TestCase):
    def test_build_result_contains_required_model_slots_and_freeze_flags(self):
        result = run_taiwan_model_factory.build_model_factory_result()

        self.assertEqual(
            set(result["models"]),
            {
                "logistic_l2",
                "lightgbm_ranker",
                "conditional_markov_approximation",
                "tcn",
                "bpr",
            },
        )
        self.assertTrue(result["configuration_frozen_before_test"])
        self.assertEqual(result["test_evaluation_calls"], 1)
        self.assertEqual(result["test_split_touch_count"], 6)
        self.assertEqual(
            result["final_evaluation_order"],
            [
                "logistic_l2",
                "lightgbm_ranker",
                "conditional_markov_approximation",
                "tcn",
                "bpr",
                "empirical_random_baseline",
            ],
        )
        self.assertEqual(result["analysis_bounds"]["analysis_end"], "2026-07-31")
        self.assertLessEqual(result["split_bounds"]["test"]["end"], "2026-07-31")
        self.assertEqual(result["macau"]["number_level_models"], [])
        self.assertEqual(result["data_summary"]["record_count"], 2157)
        self.assertEqual(result["data_summary"]["row_count"], 105693)
        self.assertAlmostEqual(
            result["theoretical_random_baseline"]["hit_at_least_probability"],
            0.2571252367737104,
            places=16,
        )

        for slot, model in result["models"].items():
            with self.subTest(slot=slot):
                self.assertIn("training", model)
                self.assertIn("validation", model)
                self.assertIn("final_holdout", model)
                self.assertIn("selection_gap", model)
                self.assertIn("empirical_random_baseline", model)
                self.assertIn("validation_vs_empirical_random", model)
                self.assertIn("final_holdout_vs_empirical_random", model)
                self.assertIn("permutation_p_value", model["validation"])
                self.assertIn("permutation_p_value", model["final_holdout"])
                self.assertLessEqual(model["final_holdout"]["date_end"], "2026-07-31")
                self.assertIn("final_holdout", model["empirical_random_baseline"])

        self.assertEqual(result["models"]["lightgbm_ranker"]["actual_model_type"], "lightgbm_binary_classifier")

    def test_run_writes_json_and_brief_without_forbidden_content(self):
        result = run_taiwan_model_factory.run_model_factory()

        self.assertTrue(OUTPUT_JSON.exists())
        self.assertTrue(OUTPUT_BRIEF.exists())

        with OUTPUT_JSON.open(encoding="utf-8") as handle:
            persisted = json.load(handle)

        self.assertEqual(persisted["test_evaluation_calls"], 1)
        self.assertTrue(persisted["configuration_frozen_before_test"])
        self.assertEqual(persisted["split_bounds"]["test"]["end"], "2026-07-31")
        self.assertEqual(persisted["test_split_touch_count"], 6)
        self.assertEqual(
            persisted["final_evaluation_order"],
            [
                "logistic_l2",
                "lightgbm_ranker",
                "conditional_markov_approximation",
                "tcn",
                "bpr",
                "empirical_random_baseline",
            ],
        )
        self.assertEqual(persisted["data_summary"]["record_count"], 2157)
        self.assertEqual(persisted["data_summary"]["row_count"], 105693)
        self.assertAlmostEqual(
            persisted["theoretical_random_baseline"]["hit_at_least_probability"],
            0.2571252367737104,
            places=16,
        )
        self.assertEqual(result["models"]["lightgbm_ranker"]["actual_model_type"], "lightgbm_binary_classifier")

        brief_text = OUTPUT_BRIEF.read_text(encoding="utf-8")
        forbidden = ["下一期号码", "投注组合", "收益承诺"]
        for phrase in forbidden:
            self.assertNotIn(phrase, brief_text)
        self.assertIn("未发现可复现、可泛化的开奖预测证据", brief_text)
        self.assertIn("正式 CRF 未实现", brief_text)
        self.assertIn("理论随机基线", brief_text)
        self.assertIn("经验随机基线", brief_text)


if __name__ == "__main__":
    unittest.main()
