# Task 2 Report - 阶段五集成与残差候选

## 实现内容

- 新增 `分析/运行时/loop2_ensemble.py`
- 新增 `测试/test_loop2_ensemble.py`
- 实现 `soft_vote(probability_matrices, weights=None)`
- 实现 `build_top_three_slots(model_factory_payload)`
- 实现 `fit_xgboost_residual(train_split, base_probabilities, seed=20260902)`
- 实现 `predict_xgboost_residual(model, split, base_probabilities)`
- 实现 `blend_residual_probabilities(base_probabilities, residual_probabilities, strength=...)`

## 结果

- `soft_vote` 已校验期数一致、每期 49 概率、权重非负且总和大于 0
- `build_top_three_slots` 只读取 validation 排序，不访问测试指标
- `fit_xgboost_residual` 在当前环境返回 `status=not_implemented`、`reason=xgboost_unavailable`
- `predict_xgboost_residual` 会拒绝未采用的残差模型
- `blend_residual_probabilities` 返回逐位凸组合并保持 `[0,1]`

## 测试

命令：

```text
F:\Python312\python.exe -m unittest 测试.test_model_eval 测试.test_model_baselines 测试.test_model_sequence 测试.test_loop2_pruning 测试.test_loop2_ensemble
```

结果：

```text
.........
...
.
..
.
.
.
...
.
....
...
.........
----------------------------------------------------------------------
Ran 38 tests in 239.276s

OK
```

## 修复说明

- 本次仅补充报告，不改实现代码或其他文件
- 当前环境中 `xgboost` 不可用，`fit_xgboost_residual` 因而返回 `not_implemented`
- 这只是该智能体运行环境的现象，最终统一运行器会重新探测依赖并按实际环境决定是否采用

## 残差采用状态

- 未采用
- 原因：当前环境未安装 `xgboost`
- 采用分支已用 fake 回归器单测覆盖，确认训练目标是训练期 residual，而不是回写标签

## 风险

- 残差候选在本机只能返回 `not_implemented`
- 若后续补齐 `xgboost`，仍需再跑一次真实拟合与预测回归
- 本任务未生成第二轮最终 JSON，符合 brief 范围

## 追加 stdout

```text
test_dataset_rebuilds_49_candidates_per_draw (����.test_model_eval.ModelEvalTests.test_dataset_rebuilds_49_candidates_per_draw) ... ok
test_evaluate_predictions_rejects_non_49_vectors (����.test_model_eval.ModelEvalTests.test_evaluate_predictions_rejects_non_49_vectors) ... ok
test_evaluate_predictions_returns_expected_metrics (����.test_model_eval.ModelEvalTests.test_evaluate_predictions_returns_expected_metrics) ... ok
test_load_feature_rows_can_filter_temp_csv (����.test_model_eval.ModelEvalTests.test_load_feature_rows_can_filter_temp_csv) ... ok
test_load_feature_rows_excludes_august_2026 (����.test_model_eval.ModelEvalTests.test_load_feature_rows_excludes_august_2026) ... ok
test_permutation_p_value_distinguishes_pairing_strength (����.test_model_eval.ModelEvalTests.test_permutation_p_value_distinguishes_pairing_strength) ... ok
test_permutation_p_value_is_deterministic_and_bounded (����.test_model_eval.ModelEvalTests.test_permutation_p_value_is_deterministic_and_bounded) ... ok
test_split_by_date_returns_three_strict_ranges (����.test_model_eval.ModelEvalTests.test_split_by_date_returns_three_strict_ranges) ... ok
test_topk_ties_break_by_number_ascending (����.test_model_eval.ModelEvalTests.test_topk_ties_break_by_number_ascending) ... ok
test_conditional_markov_approximation_metadata_and_shape (����.test_model_baselines.ModelBaselineTests.test_conditional_markov_approximation_metadata_and_shape) ... ok
test_conditional_markov_predictions_ignore_holdout_truth_numbers (����.test_model_baselines.ModelBaselineTests.test_conditional_markov_predictions_ignore_holdout_truth_numbers) ... ok
test_conditional_markov_training_statistics_are_causal (����.test_model_baselines.ModelBaselineTests.test_conditional_markov_training_statistics_are_causal) ... ok
test_lightgbm_baseline_shape_and_reproducibility (����.test_model_baselines.ModelBaselineTests.test_lightgbm_baseline_shape_and_reproducibility) ... ok
test_logistic_baseline_shape_and_reproducibility (����.test_model_baselines.ModelBaselineTests.test_logistic_baseline_shape_and_reproducibility) ... ok
test_predict_model_rejects_empty_split (����.test_model_baselines.ModelBaselineTests.test_predict_model_rejects_empty_split) ... ok
test_predict_model_rejects_missing_feature_columns (����.test_model_baselines.ModelBaselineTests.test_predict_model_rejects_missing_feature_columns) ... ok
test_bpr_rejects_inconsistent_training_boundary (����.test_model_sequence.ModelSequenceTests.test_bpr_rejects_inconsistent_training_boundary) ... ok
test_bpr_reproducible_and_probabilities_are_bounded (����.test_model_sequence.ModelSequenceTests.test_bpr_reproducible_and_probabilities_are_bounded) ... ok
test_bpr_window_does_not_use_holdout_period_labels (����.test_model_sequence.ModelSequenceTests.test_bpr_window_does_not_use_holdout_period_labels) ... ok
test_negative_sampler_keeps_exact_pair_count_with_replacement (����.test_model_sequence.ModelSequenceTests.test_negative_sampler_keeps_exact_pair_count_with_replacement) ... ok
test_predict_sequence_model_rejects_broken_split (����.test_model_sequence.ModelSequenceTests.test_predict_sequence_model_rejects_broken_split) ... ok
test_predict_sequence_model_rejects_empty_short_and_single_period_input (����.test_model_sequence.ModelSequenceTests.test_predict_sequence_model_rejects_empty_short_and_single_period_input) ... ok
test_tcn_reproducible_and_probabilities_are_bounded (����.test_model_sequence.ModelSequenceTests.test_tcn_reproducible_and_probabilities_are_bounded) ... ok
test_tcn_window_does_not_use_target_period_labels (����.test_model_sequence.ModelSequenceTests.test_tcn_window_does_not_use_target_period_labels) ... ok
test_build_feature_group_splits_does_not_touch_test_split (����.test_loop2_pruning.Loop2PruningTests.test_build_feature_group_splits_does_not_touch_test_split) ... ok
test_build_feature_group_splits_rejects_empty_unknown_and_metadata (����.test_loop2_pruning.Loop2PruningTests.test_build_feature_group_splits_rejects_empty_unknown_and_metadata) ... ok
test_evaluate_group_set_is_not_mutated_by_inputs (����.test_loop2_pruning.Loop2PruningTests.test_evaluate_group_set_is_not_mutated_by_inputs) ... ok
test_evaluate_group_set_rejects_empty_and_metadata_columns (����.test_loop2_pruning.Loop2PruningTests.test_evaluate_group_set_rejects_empty_and_metadata_columns) ... ok
test_evaluate_group_set_runs_and_returns_validation_metrics (����.test_loop2_pruning.Loop2PruningTests.test_evaluate_group_set_runs_and_returns_validation_metrics) ... ok
test_exact_group_shapley_is_reproducible_and_covers_all_groups (����.test_loop2_pruning.Loop2PruningTests.test_exact_group_shapley_is_reproducible_and_covers_all_groups) ... ok
test_forward_and_backward_paths_record_candidates_and_scores (����.test_loop2_pruning.Loop2PruningTests.test_forward_and_backward_paths_record_candidates_and_scores) ... ok
test_blend_residual_probabilities_clips_and_validates_strength (����.test_loop2_ensemble.Loop2EnsembleTests.test_blend_residual_probabilities_clips_and_validates_strength) ... ok
test_build_top_three_slots_uses_validation_ranking_only (����.test_loop2_ensemble.Loop2EnsembleTests.test_build_top_three_slots_uses_validation_ranking_only) ... ok
test_fit_xgboost_residual_returns_not_implemented_when_dependency_missing (����.test_loop2_ensemble.Loop2EnsembleTests.test_fit_xgboost_residual_returns_not_implemented_when_dependency_missing) ... ok
test_fit_xgboost_residual_uses_residual_targets_and_is_reproducible (����.test_loop2_ensemble.Loop2EnsembleTests.test_fit_xgboost_residual_uses_residual_targets_and_is_reproducible) ... ok
test_predict_xgboost_residual_rejects_non_adopted_models (����.test_loop2_ensemble.Loop2EnsembleTests.test_predict_xgboost_residual_rejects_non_adopted_models) ... ok
test_soft_vote_normalizes_weights_and_preserves_shape (����.test_loop2_ensemble.Loop2EnsembleTests.test_soft_vote_normalizes_weights_and_preserves_shape) ... ok
test_soft_vote_rejects_invalid_inputs (����.test_loop2_ensemble.Loop2EnsembleTests.test_soft_vote_rejects_invalid_inputs) ... ok

----------------------------------------------------------------------
Ran 38 tests in 254.034s

OK
```
