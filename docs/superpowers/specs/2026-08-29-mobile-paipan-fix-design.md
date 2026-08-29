# 2026-08-29 手机端排盘结果页修复设计文档

## 1. 问题清单（用户确认）

| 编号 | 问题 | 现象 | 来源定位 |
|---|---|---|---|
| P1 | 十三宫布局错乱 | 手机端最下方一行疑似出现 5 个宫位，4×4 标准布局被破坏 | `renderTraditionalPlate()` 生成的 table 在移动端 colspan/rowspan 渲染不一致；或中宫跨行失效 |
| P2 | A-/A+ 按钮换行 | dun-info-bar 在手机窄屏下换行，A-/A+ 被挤到第二行 | `.dun-info-bar{flex-wrap:wrap}` + chip 尺寸过大 |
| P3 | 出生地点重复 | 显示“北京市 北京市 东城区” | 地址拼接逻辑未对同名省/市去重 |
| P4 | 天罡/月局/节气被隐藏 | 手机端右侧只剩天罡和日期，缺失月局、节气 | `@media(max-width:540px)` 中 `.pc-yj,.pc-jq{display:none}` |
| P5 | dun-chip 字号过大 | 值符/值使/驿马/空亡/A-/A+ 字号需要缩小 | `.dun-chip` 默认字号 12px，未做手机端降级 |
| P6 | 遁局信息字号过大 | “阴盘·*遁·*局”字号需要缩小 | `.rh-sub` 默认 12px，在手机端显得偏大 |

## 2. 修复方案（方案 A：保守修复）

### 2.1 十三宫布局错乱（P1）
- **不动 table 结构**，在生成 HTML 时显式添加 `<colgroup>` 定义 4 列等宽，帮助移动端浏览器正确解析列数。
- 给 `#plate-table` 增加 `table-layout:fixed;width:100%`，并给每列 `<col>` 设置 `width:25%`。
- 验证每行实际渲染列数为 4。

### 2.2 A-/A+ 按钮换行（P2）
- 在 `@media (max-width:540px)` 中：
  - `.dun-info-bar` 改为 `flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;`（允许横向滑动，避免换行）。
  - `.dun-chip` padding 从 `6px 11px` 降至 `4px 8px`，gap 从 8px 降至 5px。
  - 隐藏滚动条。

### 2.3 出生地点重复（P3）
- 在显示地址的函数中，对省/市/区三级去重（例如省级和市级同为“北京市”时只保留一个）。
- 输出格式：`{province} {city} {district}`，同名相邻项合并。

### 2.4 天罡/月局/节气显示（P4）
- 在手机端不再隐藏 `.pc-yj` 和 `.pc-jq`。
- 调整右列宽度从 20px 到 26px，允许竖排或缩小字号显示月局、节气。
- 月局/节气使用 `writing-mode:vertical-rl;text-orientation:upright` 竖排，节省水平空间。
- 确保不与其他列重叠。

### 2.5 dun-chip 字号（P5）
- 在手机端 `.dun-chip` 字号降至 11px，`.dun-chip .dc-label` 降至 10px。

### 2.6 遁局信息字号（P6）
- 在手机端 `.result-header .rh-sub` 字号降至 11px。

## 3. 代码改动位置

- `public/index.html`：
  - `renderTraditionalPlate()`：添加 `<colgroup>`。
  - CSS 区域：修改 `@media(max-width:540px)` 内的 `.dun-info-bar`、`.dun-chip`、`.palace-col-right`、`.pc-yj`、`.pc-jq`、`.rh-sub` 样式。
  - 地址显示逻辑：去重函数。
- 同步到 `index.html`（根目录）和 `docs/index.html`。

## 4. 验证标准

- 手机端（iPhone 375–414px 宽度模拟）打开 `https://142857110823.github.io/app-for-father/`，排盘结果页：
  - dun-info-bar 所有 chip 在一行，可横向滑动但不换行。
  - 十三宫表格每行 4 列，中宫 2×2，无错位。
  - 基础信息地址不重复。
  - 每个宫位右列显示天罡、月局、节气、日排信息。
  - 字号整体缩小，无重叠/截断。
