# Task 1 Report

## Status

COMPLETE

## RED

命令：

```powershell
F:\Python312\python.exe -m unittest 测试/test_feature_hyperspace.py
```

结果：

`ModuleNotFoundError: No module named 'build_taiwan_feature_hyperspace'`

## GREEN

命令：

```powershell
F:\Python312\python.exe 分析/运行时/build_taiwan_feature_hyperspace.py
F:\Python312\python.exe -m unittest 测试/test_feature_hyperspace.py
```

结果：

- `record_count=2157`
- `row_count=105693`
- `date_min=2007-01-02`
- `date_max=2026-07-31`
- `hypergeometric_hit_at_least(49, 6, 15, 3)=0.2571252367737104`
- `Ran 7 tests in 2.478s`
- `OK`

## Modified Files

- `分析/运行时/build_taiwan_feature_hyperspace.py`
- `测试/test_feature_hyperspace.py`
- `分析/中间数据/台湾_特征超空间.csv`
- `分析/统计结果/台湾_第一轮特征拓扑.json`
- `分析/报告/科研循环简报_第01轮.md`
- `项目指南.md`
- `work-flow.md`
- `.superpowers/sdd/2026-09-02-liuhe-loop1-topology/task-1-report.md`
- `.superpowers/sdd/2026-09-02-liuhe-loop1-topology/task-1-tdd-failure.txt`
- `.superpowers/sdd/2026-09-02-liuhe-loop1-topology/task-1-tdd-pass.txt`

## Self Review

- 只使用了台湾 `verified` 记录，并按 `2007-01-01` 至 `2026-07-31` 冻结范围生成结果。
- 2026-08 未进入输出。
- 首期历史动量特征为 0，首期间距为 -1。
- 互信息权重只用 2007-01-01 至 2015-12-31 的训练期计算。
- 长表行数与 49 候选号码逐行一致。

## Risks

- `he_sum` 属于实验性映射，解释性有限。
- 训练期互信息权重整体很低，当前只适合做候选特征，不可解释为稳定规律。
- 本轮只完成阶段一，不包含后续五类模型的样本外比较。
