import json
import sys
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(r"F:\1\夫\六合")
RUN_DIR = ROOT / "分析" / "运行时"
OUTPUT_JSON = ROOT / "分析" / "统计结果" / "台湾_第二轮特征修剪与集成.json"
OUTPUT_BRIEF = ROOT / "分析" / "报告" / "科研循环简报_第02轮.md"
WORKBOOK_BUILDER = RUN_DIR / "build_blocked_workbooks.mjs"

sys.path.insert(0, str(RUN_DIR))

import run_taiwan_loop2  # noqa: E402


class Loop2IntegrationTests(unittest.TestCase):
    def test_build_result_has_freeze_flags_selection_and_blocked_macau(self):
        captured = {}
        original_fit = run_taiwan_loop2._fit_slot_models

        def capture_fit(train_split, model_slots):
            captured["feature_names"] = list(train_split["feature_names"])
            return original_fit(train_split, model_slots)

        with mock.patch.object(run_taiwan_loop2, "_fit_slot_models", side_effect=capture_fit):
            result = run_taiwan_loop2.build_loop2_result(force=True)

        self.assertTrue(result["configuration_frozen_before_test"])
        self.assertEqual(result["test_evaluation_calls"], 1)
        self.assertEqual(result["analysis_bounds"]["analysis_end"], "2026-07-31")
        self.assertLessEqual(result["split_bounds"]["test"]["end"], "2026-07-31")
        self.assertEqual(result["feature_pruning"]["selected_method"], "backward_prune_groups")
        self.assertEqual(result["feature_pruning"]["selected_groups"], ["momentum", "esoteric", "spacing"])
        self.assertEqual(captured["feature_names"], result["selected_feature_names"])
        self.assertEqual(result["soft_voting"]["feature_names"], result["selected_feature_names"])
        self.assertEqual(result["split_bounds"]["test"]["feature_names"], result["selected_feature_names"])
        self.assertEqual(
            [item["slot"] for item in result["top_three_models"]["top_three_models"]],
            result["selection_rule"]["model_selection"]["ranking"][:3],
        )
        self.assertEqual(result["soft_voting"]["status"], "adopted")
        self.assertEqual(result["residual_candidate"]["status"], "not_adopted")
        self.assertEqual(result["macau"]["status"], "not_generated")
        self.assertEqual(result["macau"]["number_level_models"], [])

    def test_test_evaluation_is_deferred_until_after_residual_selection_and_freeze(self):
        result = run_taiwan_loop2.build_loop2_result(force=True)

        self.assertEqual(
            result["evaluation_trace"],
            [
                "train:soft_vote_top3",
                "validation:soft_vote_top3",
                "train:residual_candidate",
                "validation:residual_candidate",
                "train:empirical_random_baseline",
                "validation:empirical_random_baseline",
                "freeze_configuration",
                "test:soft_vote_top3",
                "test:empirical_random_baseline",
            ],
        )
        self.assertEqual(result["final_evaluation_order"], ["soft_vote_top3", "empirical_random_baseline"])
        self.assertEqual(result["test_evaluation_calls"], 1)
        self.assertEqual(result["test_split_touch_count"], len(result["final_evaluation_order"]))

    def test_run_writes_json_and_brief_without_forbidden_content(self):
        result = run_taiwan_loop2.run_loop2()

        self.assertTrue(OUTPUT_JSON.exists())
        self.assertTrue(OUTPUT_BRIEF.exists())

        with OUTPUT_JSON.open(encoding="utf-8") as handle:
            persisted = json.load(handle)

        self.assertTrue(persisted["configuration_frozen_before_test"])
        self.assertEqual(persisted["test_evaluation_calls"], 1)
        self.assertEqual(persisted["selected_configuration"], "soft_vote_top3")
        self.assertEqual(persisted["selected_test_metrics"], persisted["soft_voting"]["final_holdout"])
        self.assertEqual(
            persisted["soft_voting"]["validation"],
            persisted["selection_rule"]["final_configuration_metrics"],
        )
        self.assertEqual(persisted["residual_candidate"]["status"], "not_adopted")
        self.assertEqual(result["random_baseline"]["final_holdout"]["mean_recall"], persisted["random_baseline"]["final_holdout"]["mean_recall"])

        brief_text = OUTPUT_BRIEF.read_text(encoding="utf-8")
        for phrase in ("下一期号码", "投注组合", "收益承诺"):
            self.assertNotIn(phrase, brief_text)
        self.assertIn("XGBoost 残差候选未优于软投票，因此未采用", brief_text)
        self.assertIn("澳门仍保持 BLOCKED", brief_text)

    def test_workbook_builder_references_loop2_summary_and_keeps_macau_blocked(self):
        text = WORKBOOK_BUILDER.read_text(encoding="utf-8")
        self.assertIn("台湾_第二轮特征修剪与集成.json", text)
        self.assertIn("BLOCKED", text)
        self.assertIn("number_level_models", text)


if __name__ == "__main__":
    unittest.main()
