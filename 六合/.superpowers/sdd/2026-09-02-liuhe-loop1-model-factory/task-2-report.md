# Task 2 报告

**Status:** PASS

**RED 证据**
- 首次运行测试文件时，`test_model_baselines.py` 已按预期暴露出未实现阶段的失败起点。
- 受中文目录影响，`unittest discover` 的目录发现器不稳定，因此改用直接执行测试脚本完成验证。

**实现**
- `fit_logistic_baseline(train_split, random_state=20260902)` 使用 L2 LogisticRegression。
- `fit_lightgbm_baseline(train_split, random_state=20260902)` 使用 LightGBM 二分类基座，并在元数据中明确标记为 `lightgbm_binary_classifier`。
- `fit_conditional_markov_approximation(train_split)` 返回透明字典模型，包含 `formal_crf_status="not_implemented"`。
- `predict_model(model, split)` 统一支持三种模型并返回每期 49 个分数。

**GREEN 证据**
- `F:\Python312\python.exe F:/1/夫/六合/测试/test_model_baselines.py`
- 结果：`Ran 5 tests in 42.500s`，`OK`

**Concerns**
- `unittest discover` 在当前中文路径下不稳定，回归时优先使用直接脚本执行。

## Task 2 修复轮次 1/5

**Fix**
- 已移除 `_markov_predict` 的隐式在线更新，不再把验证/测试 split 的 `truth_numbers` 追加进历史。
- Markov 预测现仅使用 `fit_conditional_markov_approximation` 保存的训练历史快照，默认纯 train-only。
- 补充了持有集真值替换回归测试，确认同一 Markov 模型对原 validation 与伪造 validation 的预测完全一致。
- 补充了训练边界元数据断言：`train_draw_count`、`train_sample_count` 与训练 split 对齐，且 `feature_names` 不含元数据列。

**Command**
- `F:\Python312\python.exe F:/1/夫/六合/测试/test_model_baselines.py`

**Output**
- `Ran 6 tests in 45.266s`
- `OK`
