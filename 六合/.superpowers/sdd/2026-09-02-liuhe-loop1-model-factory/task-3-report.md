# Task 3 报告

**时间** 2026-09-02 12:33:27（Asia/Shanghai）

**完成内容**  
已新增 `分析/运行时/model_sequence.py` 与 `测试/test_model_sequence.py`，实现两个候选序列基线：
TCN 采用小型因果一维卷积，BPR 采用 49 号码隐向量 + 上下文向量的 pairwise logistic loss。两者都只使用 train split，预测输出均为每期 49 个有限 `[0,1]` 概率，并记录窗口长度、seed、步数、学习率等元数据。

**红测证据**  
先运行测试时出现失败，确认序列模型入口尚未通过当前测试流程；随后补实现并重跑通过。

**绿测证据**  
`F:\Python312\python.exe -m unittest test_model_sequence`  
结果：`Ran 6 tests in 51.381s`，`OK`

**覆盖项**  
- TCN 输入窗口不包含目标期标签  
- TCN/BPR 输出形状与概率边界  
- BPR 训练边界一致性检查  
- 固定 seed 可复现  
- 空窗口、短训练集、单期输入明确报错

**说明**  
这是候选基线实现，不宣称生产级深度模型性能。

## 修复轮次 1/5

**时间** 2026-09-02 12:43:54（Asia/Shanghai）

**修复内容**  
- 将 `predict_sequence_model` 的 TCN/BPR 持有集预测改为严格 `frozen_train_history` 模式，只读取 `fit` 时冻结保存的 `history_states`，不再拼接 validation/test 的前序标签或真值。
- 为 TCN/BPR 模型元数据补充 `holdout_update_mode='frozen_train_history'`。
- 新增带放回负样本采样辅助函数，保证 BPR 每个训练期的配对数精确等于 positives 数量，即使 negatives 不足也不下溢。
- 将泄漏测试从“只改最后一期”补强为“改中间期合法标签”，覆盖旧实现读取前序持有集标签的情况；并新增负样本补齐不变量测试。
- 额外补充 BPR 中间期持有集标签不变性测试，和 TCN 一起验证预测不随 validation/test 真值变化而变化。

**执行命令**  
`F:\Python312\python.exe "F:\1\夫\六合\测试\test_model_sequence.py"`

**输出**  
`........`  
`Ran 8 tests in 48.377s`  
`OK`
