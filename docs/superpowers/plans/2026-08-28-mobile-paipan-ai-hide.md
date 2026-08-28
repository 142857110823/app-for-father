# 手机端排盘修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复手机端【智能解读】不可用提示、【排盘结果】未严格三列、字号不可调导致重叠的问题。

**Architecture:** 在 `public/index.html` 中通过媒体查询强制手机端左/中/右三列布局、新增字号切换类、增加静态部署检测并隐藏智能解读面板；同步到根目录与 `docs/`。

**Tech Stack:** HTML/CSS/JS（单文件 SPA），Playwright 视觉审查。

---

### Task 1: 静态部署下隐藏【智能解读】面板

**Files:**
- Modify: `public/index.html`（JS/CSS）
- Test: `scripts/audit-t6.js` 或浏览器 DevTools

- [ ] **Step 1: 添加静态环境检测函数**
  在 JS 中新增 `isStaticHost()`：当 `location.hostname` 以 `github.io` 结尾，或 `location.protocol === "https:"` 且非 `localhost` 时返回 `true`。

- [ ] **Step 2: 控制面板显示**
  在 `renderInterpretation()` 调用前检查：静态环境下设置 `#ai-interpret { display:none !important; }` 并不调用请求；本地环境下移除隐藏并正常请求。

- [ ] **Step 3: 验证**
  在 `142857110823.github.io` 上确认面板不可见；在 `localhost:8090` 启动服务后确认面板可见。

### Task 2: 手机端宫位严格左/中/右三列布局

**Files:**
- Modify: `public/index.html`（CSS）
- Test: `scripts/audit-t6.js`

- [ ] **Step 1: 修改 ≤540px 媒体查询**
  - `.palace-tri` 改为 `flex-direction:row`。
  - `.palace-col-left` 宽度自适应，放置神/星/门。
  - `.palace-col-mid` 宽度自适应，放置灵/天/人/地。
  - `.palace-col-right` 固定宽度 28–32px，`flex-shrink:0`，竖向排列。

- [ ] **Step 2: 右列标签样式**
  - `.pc-tg`、`.pc-jq` 保持 `writing-mode:vertical-rl`。
  - `.pc-yj`、`.pc-rp` 小字号右对齐，允许换行。
  - 所有列设置 `min-width:0` 与 `overflow-wrap:anywhere`。

- [ ] **Step 3: 视觉审查**
  运行 `node scripts/audit-t6.js`，确认 375px 下无重叠/截断。

### Task 3: 字号大小调节

**Files:**
- Modify: `public/index.html`（JS/CSS）
- Test: 浏览器手动切换 + 视觉审查

- [ ] **Step 1: 添加字号类**
  在 CSS 中定义：
  - `.plate-fs-sm`：手机端基础字号再降 1px。
  - `.plate-fs-md`：默认。
  - `.plate-fs-lg`：基础字号升 1px。

- [ ] **Step 2: 工具栏添加按钮**
  在「排盘结果」按钮区（收藏/上局/下局/导出附近）增加 `A- / A+` 按钮，点击循环切换 `#plate-table` 的字号类。

- [ ] **Step 3: 同步与验证**
  同步 `index.html`、`docs/index.html`；在 375px、390px、414px 三个视口下切换字号，确认无重叠。
