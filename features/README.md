# features/ — 其他功能目录

> 本目录承载"我的 → 其他"四项功能的算法、规则、测试与 UI 适配层。
> 创建时间：2026-08-24
> 上级文档：`其他功能——总规划.md`

## 目录结构

```
features/
  calendar-core/       公共历法核心（公历/农历/节气/干支/时区/真太阳时/子时边界）
  bazi/                四柱八字
  ziwei/               紫微斗数
  meihua/              梅花易数
  daliuren/            大六壬
  shared/              跨功能复用工具（结果记录、规则版本号、序列化）
```

## 每个功能子目录的最小结构

```
features/<feature>/
  rules/               固定表、口诀、映射、流派参数
  engine/               纯函数算法（无 IO、无 UI、无 AI）
  models/               输入、过程、结果数据结构与校验
  fixtures/             标准案例与来源（≥30 案例；大六壬 ≥50）
  tests/                单元、边界、回归测试（Node.js 原生 test runner）
  ui/                   页面适配层（仅渲染，禁止放算法）
  README.md             规则来源、版本、已知争议、依赖
```

## 统一结果记录格式

```js
{
  feature,              // 'bazi' | 'ziwei' | 'meihua' | 'daliuren'
  input,                // 原始输入
  normalizedInput,      // 标准化输入（含规则选项）
  options,              // { dayBoundary, trueSolarTime, timezone, ... }
  algorithmVersion,     // 算法版本号（ruleset-vN）
  calendarVersion,      // 公共历法核心版本号
  intermediate,         // 关键中间过程
  result,               // 最终结果
  createdAt              // ISO 8601
}
```

## 通用红线

1. 算法纯函数，不依赖浏览器、localStorage、网络。
2. AI 只解释已生成结果，不参与排盘计算。
3. 默认离线优先。
4. 子初 23:00 换日；真太阳时可选且默认关闭。
5. 不输出"百分百准确预测""改命"等承诺性表达。
6. 不做付费、专家认证、社交、云端批命。

## 公共依赖

- `lunar-javascript` (项目现有 ^1.6.11)：仅通过 `calendar-core` 接口复用，其他功能禁止直接 require。
- 算法测试使用 Node.js 原生 `node:test`。

## 版本管理

- 每个功能的规则集（ruleset）必须冻结为 `rules/version.json`，记录版本号、来源、争议参数。
- 公共历法核心版本在 `calendar-core/version.json`。

## 执行顺序（来自总规划）

1. calendar-core
2. bazi
3. meihua
4. ziwei
5. daliuren
6. 入口替换 + UI
7. 回归、构建、部署
