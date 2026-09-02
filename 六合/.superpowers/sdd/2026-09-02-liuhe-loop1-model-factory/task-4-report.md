# Task 4 Report

**Status:** PASS

**RED 证据**
- 首次运行 `test_model_factory_integration.py` 时，`run_taiwan_model_factory` 尚未实现，按预期失败于模块导入。
- 随后补上统一工厂脚本、结果写入和阶段二简报后，红测点消失。

**实现**
- `run_taiwan_model_factory.py` 统一接入 Task 1-3 的评估、线性、树、条件马尔可夫、TCN 和 BPR 接口。
- JSON 保留五个固定槽位：`logistic_l2`、`lightgbm_ranker`、`conditional_markov_approximation`、`tcn`、`bpr`。
- `lightgbm_ranker` 槽位在 JSON 中明确标注实际模型类型为 `lightgbm_binary_classifier`，未冒充 ranker。
- 每个模型都记录 `training`、`validation`、`final_holdout`、训练/验证差距、随机基线引用和验证排名。
- 统一冻结后只做一次测试集评估，`test_evaluation_calls=1`、`configuration_frozen_before_test=true`。
- 澳门部分仅保留“未生成号码级模型”的边界声明，不改澳门数据。

**GREEN 证据**
- `F:\Python312\python.exe 分析\运行时\run_taiwan_model_factory.py`
- `F:\Python312\python.exe -m unittest test_model_eval test_model_baselines test_model_sequence test_model_factory_integration`
- 结果：`Ran 25 tests in 132.215s`，`OK`

**产物**
- `分析/统计结果/台湾_第一轮模型回测.json`
- `分析/报告/科研循环简报_第01轮_阶段二.md`

**Concerns**
- 当前正式 CRF 仍未实现，`conditional_markov_approximation` 只是透明近似。
- 结果未显示稳定超越随机基线的可复现证据，结论仍应保守。
- `unittest` 在中文路径下对模块名解析不稳，回归优先在 `F:\1\夫\六合\测试` 目录下直接跑模块名。
