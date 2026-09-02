# Task 1 Report - 阶段四特征修剪

## 实现内容

- 新增 `分析/运行时/loop2_pruning.py`
- 新增 `测试/test_loop2_pruning.py`
- 仅使用第一轮拓扑中的四组：`momentum`、`time`、`esoteric`、`spacing`
- 训练/验证只读，不触碰测试 split
- `wuxing_bin` 已展开为 5 个 one-hot 特征，未引入元数据列

## 结果

- 全量四组验证集 `mean_recall = 0.318209316394434`
- 空集哑基线 `mean_recall = 0.30490018148820314`
- Shapley：
  - `momentum = -0.0008822343214358688`
  - `time = -0.001638435168380803`
  - `esoteric = 0.014745916515426402`
  - `spacing = 0.0010838878806211372`
- 前向选择最终组：`["esoteric"]`
- 后向修剪最终组：`["momentum", "esoteric", "spacing"]`

## 测试

命令：

```text
python -m unittest 测试.test_model_eval 测试.test_model_baselines 测试.test_loop2_pruning
```

结果：

```text
Ran 23 tests in 134.525s
OK
```

附加回归：

```text
python -m unittest 测试.test_loop2_pruning
Ran 7 tests in 67.234s
OK
```

## 风险

- 公开接口对空组保持硬错误，Shapley 依赖模块内哑基线，不作为外部契约暴露。
- 目前仅完成阶段四，不含阶段五集成与第二轮统一运行器。
