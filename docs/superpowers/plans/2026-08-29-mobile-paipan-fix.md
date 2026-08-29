# 手机端排盘结果页修复 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复手机端排盘结果页的 6 处 UI 异常：十三宫布局错乱、A-/A+ 换行、地址重复、天罡/月局/节气隐藏、字号过大。

**Architecture:** 所有改动集中在 `public/index.html`，包括 HTML 生成函数与 CSS 媒体查询，最后同步到根目录和 `docs/`。

**Tech Stack:** HTML5 / CSS3 / Vanilla JavaScript

---

## 文件结构

- **Modify** `public/index.html`：核心实现。
- **Sync to** `index.html`（根目录）和 `docs/index.html`：确保 GitHub Pages 一致。
- **Update** `work-flow.md`：记录修复与验证结果。

---

## Task 1: 修复十三宫表格移动端列数异常

**Files:**
- Modify: `public/index.html`（`renderTraditionalPlate` 函数）

- [ ] **Step 1: 在生成表格时添加 `<colgroup>`**

  定位到 `renderTraditionalPlate` 函数中 `let html = '';` 之前，改为：

  ```js
  const colgroup = '<colgroup><col style="width:25%"><col style="width:25%"><col style="width:25%"><col style="width:25%"></colgroup>';
  let html = colgroup;
  ```

- [ ] **Step 2: 本地验证表格列数**

  操作：
  1. 启动本地服务 `node server.js`。
  2. 访问 `http://localhost:8090/`，生成排盘。
  3. 用 DevTools 模拟 iPhone 宽度（375px）。
  4. 检查 `#plate-table` 每行 `<tr>` 的视觉列数是否为 4。

---

## Task 2: 修复 A-/A+ 按钮换行并缩小字号

**Files:**
- Modify: `public/index.html`（CSS `@media(max-width:540px)`）

- [ ] **Step 3: 修改 dun-info-bar 在手机端不换行并支持横向滚动**

  在 `@media (max-width:540px){` 内添加：

  ```css
  .dun-info-bar{flex-wrap:nowrap;overflow-x:auto;gap:5px;padding:10px 12px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .dun-info-bar::-webkit-scrollbar{display:none}
  .dun-chip{padding:4px 8px;font-size:11px;white-space:nowrap}
  .dun-chip .dc-label{font-size:10px}
  ```

- [ ] **Step 4: 本地验证 dun-info-bar**

  操作：在手机模拟宽度下检查：
  - 所有 chip 在一行。
  - 空间不足时可横向滑动，不出现第二行。
  - 字号已缩小。

---

## Task 3: 修复出生地点重复

**Files:**
- Modify: `public/index.html`（地址拼接逻辑）

- [ ] **Step 5: 查找并修改地址显示函数**

  定位到生成基础信息中“出生地点”的代码（通常在渲染结果页时），找到类似：
  ```js
  document.getElementById('birth-location').textContent = `${province} ${city} ${district}`;
  ```

  改为使用去重拼接：
  ```js
  function formatLocation(parts) {
    const arr = parts.filter(Boolean);
    const result = [];
    for (const p of arr) {
      if (result.length === 0 || result[result.length - 1] !== p) {
        result.push(p);
      }
    }
    return result.join(' ');
  }
  ```

  调用处改为：
  ```js
  document.getElementById('birth-location').textContent = formatLocation([province, city, district]);
  ```

  如果地址在多处使用，统一替换为 `formatLocation`。

- [ ] **Step 6: 本地验证地址去重**

  操作：选择“北京市 北京市 东城区”，检查显示为“北京市 东城区”。

---

## Task 4: 恢复手机端天罡/月局/节气显示

**Files:**
- Modify: `public/index.html`（CSS `@media(max-width:540px)`）

- [ ] **Step 7: 修改右列样式以完整显示四要素**

  在 `@media (max-width:540px){` 内，将：
  ```css
  .palace-col-right{width:20px !important;...}
  .pc-yj,.pc-jq{display:none}
  ```

  改为：
  ```css
  .palace-col-right{width:26px !important;padding:0 2px;gap:2px;justify-content:space-between}
  .pc-yj,.pc-jq{display:block;font-size:var(--pf-yj);line-height:1.1;writing-mode:vertical-rl;text-orientation:upright;white-space:nowrap}
  .pc-jq .jq-col{display:block}
  .pc-tg{font-size:var(--pf-tg);writing-mode:vertical-rl;text-orientation:upright}
  .pc-rp{font-size:var(--pf-rp);line-height:1.1;text-align:right;max-width:26px}
  ```

- [ ] **Step 8: 调整字号变量**

  确保手机端字号变量足够小：
  ```css
  #plate-table{--pf-shen:9px;--pf-xing:9px;--pf-men:9px;--pf-ling:9px;--pf-tian:9px;--pf-ren:9px;--pf-di:9px;--pf-tg:7px;--pf-yj:6px;--pf-jq:5px;--pf-rp:6px}
  ```

- [ ] **Step 9: 本地验证右列信息**

  操作：在手机模拟宽度下检查每个宫位右列是否显示天罡、月局、节气、日排，且无重叠。

---

## Task 5: 缩小遁局信息字号

**Files:**
- Modify: `public/index.html`（CSS `@media(max-width:540px)`）

- [ ] **Step 10: 添加 rh-sub 手机端字号**

  在 `@media (max-width:540px){` 内添加：
  ```css
  .result-header .rh-sub{font-size:11px}
  ```

---

## Task 6: 同步三处入口文件并推送验证

**Files:**
- Sync: `public/index.html` → `index.html`
- Sync: `public/index.html` → `docs/index.html`

- [ ] **Step 11: 同步入口文件**

  命令：
  ```powershell
  Copy-Item -Path public/index.html -Destination index.html -Force
  Copy-Item -Path public/index.html -Destination docs/index.html -Force
  ```

- [ ] **Step 12: 提交并推送**

  命令：
  ```bash
  git add public/index.html index.html docs/index.html
  git commit -m "fix(mobile): 手机端排盘结果页布局与字号修复"
  git push origin master
  ```

- [ ] **Step 13: 线上验证**

  操作：
  1. 等待 GitHub Pages 部署（约 1–3 分钟）。
  2. 用手机或 DevTools 模拟手机访问 `https://142857110823.github.io/app-for-father/`。
  3. 检查 6 处问题是否修复。

- [ ] **Step 14: 更新 work-flow.md**

  追加条目，记录本次修复与验证结果。

---

## Self-Review Checklist

1. **Spec coverage**
   - P1 十三宫布局：Step 1 ✓
   - P2 A-/A+ 换行：Step 3 ✓
   - P3 地址重复：Step 5 ✓
   - P4 天罡/月局/节气：Step 7 ✓
   - P5 dun-chip 字号：Step 3 ✓
   - P6 遁局字号：Step 10 ✓
2. **Placeholder scan**：无 TBD/TODO。
3. **Type consistency**：`formatLocation` 返回字符串，与 `textContent` 用法一致。
