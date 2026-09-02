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
