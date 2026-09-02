# Task 3 Report - 修复轮次 1

## Critical 修复

1. `feature_pruning.selected_groups` 先通过训练/验证选择，再用 `build_feature_group_splits(dataset, selected_groups=...)` 重建训练和验证 split；测试 split 在冻结后用同一组特征投影。五个候选模型、前三模型和 soft vote 均使用 24 个选定特征。
2. soft vote、残差候选和随机基线的测试评估全部移动到 `freeze_configuration` 之后。测试阶段只执行一个 final evaluation 阶段，`test_evaluation_calls=1`，最终顺序与实际一致。

## Commands And Complete Stdout

### 主环境探测

Command:
`F:\Python312\python.exe -c "import xgboost, sys; print(sys.executable); print(xgboost.__version__)"`

stdout:
```text
F:\Python312\python.exe
3.2.0
```

### TDD RED

Command:
`F:\Python312\python.exe -m unittest 测试.test_loop2_integration.Loop2IntegrationTests.test_build_result_has_freeze_flags_selection_and_blocked_macau`

stdout:
```text
Ran 1 test in 91.350s
FAILED (errors=1)
KeyError: 'selected_feature_names'
```

该失败复现了旧实现只把修剪结果写入摘要、没有作为模型训练输入的 Critical。

### 集成测试

Command:
`F:\Python312\python.exe -m unittest 测试.test_loop2_integration`

stdout:
```text
Ran 4 tests in 172.892s
OK
```

### 第二轮运行器

Command:
`F:\Python312\python.exe F:\1\夫\六合\分析\运行时\run_taiwan_loop2.py`

stdout:
```text
JSON: F:\1\夫\六合\分析\统计结果\台湾_第二轮特征修剪与集成.json
BRIEF: F:\1\夫\六合\分析\报告\科研循环简报_第02轮.md
selected_configuration=soft_vote_top3
selected_groups=momentum,esoteric,spacing
test_evaluation_calls=1
final_evaluation_order=soft_vote_top3,empirical_random_baseline
xgboost_available=True
```

### 完整 Python 回归

Command:
`F:\Python312\python.exe -m unittest 测试.test_model_eval 测试.test_model_baselines 测试.test_model_sequence 测试.test_loop2_pruning 测试.test_loop2_ensemble 测试.test_model_factory_integration 测试.test_loop2_integration`

stdout:
```text
Ran 44 tests in 376.629s
OK
```

### 工作簿生成

Command:
`node F:\1\夫\六合\分析\运行时\build_blocked_workbooks.mjs`

stdout:
```text
Inspect result written to file: F:\1\夫\六合\输出\台湾大乐透_2006-2026_历史与统计分析.xlsx.inspect.ndjson
Inspect result written to file: F:\1\夫\六合\输出\澳门白鸽票_2006-2026_历史与统计分析.xlsx.inspect.ndjson
[
  {
    "product": "台湾大乐透",
    "output": "F:\\1\\夫\\六合\\输出\\台湾大乐透_2006-2026_历史与统计分析.xlsx",
    "rawRows": 2157,
    "sourceRows": 26,
    "sheetCount": 10,
    "renderCount": 12
  },
  {
    "product": "澳门白鸽票",
    "output": "F:\\1\\夫\\六合\\输出\\澳门白鸽票_2006-2026_历史与统计分析.xlsx",
    "rawRows": 0,
    "sourceRows": 10,
    "sheetCount": 10,
    "renderCount": 10
  }
]
```

### 工作簿结构验证

Command:
`node F:\1\夫\六合\测试\test_liuhe_workbooks.mjs`

stdout:
```text
test_liuhe_workbooks: PASS
```

### 范围冻结验证

Command:
`node F:\1\夫\六合\测试\test_scope_freeze.mjs`

stdout:
```text
PASS: 6 份治理文件已通过范围冻结检查
```

## Actual Result

- 研究范围为 `2006-01-01 至 2026-07-31`，明确排除 2026 年 8 月。
- 选定分组为 `momentum / esoteric / spacing`，选定特征数量为 24。
- 五个模型候选的实际输入特征数量均为 24。
- 第二轮验证排序为 `logistic_l2 / conditional_markov_approximation / tcn / bpr / lightgbm_ranker`。
- 最终配置为 `soft_vote_top3`。
- `xgboost 3.2.0` 在 `F:\Python312\python.exe` 中可导入；残差候选训练成功，但验证 `mean_recall=0.309135` 低于 soft vote 的 `0.321537`，因此 `status=not_adopted`，原因为 `validation_mean_recall_below_soft_vote`。
- `evaluation_trace` 为：
  `train:soft_vote_top3 -> validation:soft_vote_top3 -> train:residual_candidate -> validation:residual_candidate -> train:empirical_random_baseline -> validation:empirical_random_baseline -> freeze_configuration -> test:soft_vote_top3 -> test:empirical_random_baseline`
- 选定配置测试 `mean_recall=0.30483460559796444`；随机基线测试 `mean_recall=0.3002544529262086`。
- 台湾 XLSX 已读入第二轮摘要；澳门 XLSX 保持 `BLOCKED`、`status=not_generated`、`number_level_models=[]`，未加入号码级结果。
- 未修改台湾或澳门原始 CSV。

## Concerns

- 第二轮模型排名和指标依赖第一轮模型槽位契约及台湾 verified 特征长表；输入变更后必须重新生成第二轮 JSON、简报和台湾 XLSX。
- 测试集只用于冻结后的 final evaluation，未用于组选择、模型排序或残差采用决策。
- 本轮残差候选未采用，不应在后续文档中写成已部署校正模型。
