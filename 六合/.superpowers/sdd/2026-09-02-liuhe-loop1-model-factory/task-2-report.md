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
