# Task 1 Report

## Status

COMPLETE

## RED

命令：

```powershell
F:\Python312\python.exe -m unittest 测试\test_model_eval.py
```

结果：

`ModuleNotFoundError: No module named 'model_eval'`

## GREEN

命令：

```powershell
F:\Python312\python.exe -m unittest 测试\test_model_eval.py
```

结果：

- `Ran 8 tests in 8.281s`
- `OK`
- 49 候选重组通过
- 2026-08 已排除
- 训练/验证/测试切分通过
- Top-K 平局按号码升序
- 置换检验固定种子

## Modified Files

- `分析/运行时/model_eval.py`
- `测试/test_model_eval.py`
- `.superpowers/sdd/2026-09-02-liuhe-loop1-model-factory/task-1-report.md`
- `work-flow.md`

## Concerns

- 仅完成统一评估核心，尚未接入 Task 2 及后续模型。
- 当前评估器按 49 维输入契约工作，未来模型实现必须沿用该约束。

## Repair Round 1/5

### Fixes

- 将 `permutation_p_value` 从逐期 Monte Carlo 抽号改为固定集合内容与大小的配对置换。
- 置换过程仅随机打乱 `truth_sets` 的期次配对顺序，保留每期集合内容不变。
- 增加集合合法性校验、重复号码校验、`1..49` 范围校验，以及期数小于 2 时返回 `1.0`。
- 补充 Brier 与 Log Loss 的手算真值断言。
- 补充强配对与打乱配对的回归测试。

### Verification

命令：

```powershell
F:\Python312\python.exe -m unittest 测试\test_model_eval.py
```

结果：

- `Ran 9 tests in 8.221s`
- `OK`
