# 排盘 UI/算法调整实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按用户最新要求调整排盘结果页：统一黑色、补充基础信息、删除智能解读与宫位弹窗中的生旺死绝/六合/天盘各宫之干、同时输出阳遁/阴遁并支持切换、重命名宫位左/中列标签。

**Architecture:** 后端算法层增加 `forceDun` 参数以强制计算阳遁或阴遁；前端在每次排盘时同时拿到两套结果，通过 `curData.activeDun` 切换渲染；UI 层直接修改 `public/index.html` 的渲染函数与样式。

**Tech Stack:** HTML/CSS/JS, lunar-javascript, esbuild 打包, Node.js 单元测试。

---

## 文件变更总览

| 文件 | 操作 | 说明 |
|---|---|---|
| `algorithm/qimen.js` | 修改 | `fullPaiPan` 支持可选 `forceDun` 参数 |
| `algorithm/pillars.js` | 修改 | `fullPaiPanFromTime` 同时返回阳遁/阴遁两套结果 |
| `algorithm/browser-entry.js` | 修改 | 导出新的双遁计算函数 |
| `public/algorithm.bundle.js` | 重新生成 | `npm run build:browser` |
| `public/index.html` | 大量修改 | 渲染、交互、样式 |
| `tests/qimen-core.test.js` | 新增断言 | 验证双遁输出 |

---

## Task 1：算法层支持强制阳遁/阴遁

**Files:**
- Modify: `algorithm/qimen.js`

- [ ] **Step 1：修改 `fullPaiPan` 函数签名与开局计算**

找到 `function fullPaiPan(pillarArr, dayGan, isNight, extraContext) {`，改为：

```javascript
function fullPaiPan(pillarArr, dayGan, isNight, extraContext, forceDun) {
  const pan = determinePan(pillarArr);
  if (forceDun === '阳遁' || forceDun === '阴遁') {
    pan.dun = forceDun;
    pan.ju = determineJu(forceDun, pan.ganSum, pan.zhiSum);
  }
  // ... 后续代码不变
```

- [ ] **Step 2：导出 `determineJu`**

确保 `module.exports` 中已包含 `determineJu`（当前已有，无需新增）。

- [ ] **Step 3：运行算法单元测试**

```bash
node algorithm/qimen.js
```

Expected：输出示例① 阳遁-5局、示例② 阴遁-5局，不报错。

---

## Task 2：`fullPaiPanFromTime` 同时返回两套结果

**Files:**
- Modify: `algorithm/pillars.js`
- Modify: `algorithm/browser-entry.js`

- [ ] **Step 1：在 `fullPaiPanFromTime` 内分别计算阳遁、阴遁**

在 `const result = corePaiPan(...)` 之后、return 之前加入：

```javascript
  const yangResult = corePaiPan(pillarArr, dayGan, night, { lunarMonth, lunarDay, shiZhi, paiJuMonthDays: riPaiMonthDays }, '阳遁');
  const yinResult  = corePaiPan(pillarArr, dayGan, night, { lunarMonth, lunarDay, shiZhi, paiJuMonthDays: riPaiMonthDays }, '阴遁');
```

- [ ] **Step 2：在返回值中加入 `yangResult` / `yinResult`**

```javascript
  return {
    input: { year, month, day, hour, minute },
    pillars,
    pillarArr,
    pan: {
      pan: result.pan,
      dun: result.dun,
      ju: result.ju,
      ganSum: result.ganSum,
      zhiSum: result.zhiSum
    },
    guiShen: result.guiShen,
    palaces: result.palaces,
    layout: result.layout,
    luoshuCoords: result.luoshuCoords,
    calibrated: result.calibrated,
    lunarMonth,
    lunarDay,
    shiZhi,
    paiJuMonth: riPaiMonth,
    paiJuMonthDays: riPaiMonthDays,
    extraContext: { lunarMonth, lunarDay, shiZhi, paiJuMonthDays: riPaiMonthDays },
    yangResult: { pan: { pan: yangResult.pan, dun: yangResult.dun, ju: yangResult.ju }, guiShen: yangResult.guiShen, palaces: yangResult.palaces },
    yinResult:  { pan: { pan: yinResult.pan,  dun: yinResult.dun,  ju: yinResult.ju  }, guiShen: yinResult.guiShen,  palaces: yinResult.palaces  }
  };
```

- [ ] **Step 3：更新 `browser-entry.js` 导出**

保持 `fullPaiPan` / `fullPaiPanFromTime` 导出即可，浏览器端直接调用 `fullPaiPanFromTime`。

---

## Task 3：重新打包浏览器算法包

**Files:**
- Regenerate: `public/algorithm.bundle.js`

- [ ] **Step 1：执行打包**

```bash
npm run build:browser
```

Expected：`public/algorithm.bundle.js` 文件时间戳更新，无报错。

---

## Task 4：前端状态管理——阳遁/阴遁切换

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1：新增 `curData.activeDun` 辅助函数**

在 `let curData = null;` 附近加入：

```javascript
function ensureActiveDunData() {
  if (!curData) return;
  if (!curData.activeDun) curData.activeDun = curData.pan.dun;
  const key = curData.activeDun === '阳遁' ? 'yangResult' : 'yinResult';
  const alt = curData[key];
  if (alt) {
    curData.pan = alt.pan;
    curData.guiShen = alt.guiShen;
    curData.palaces = alt.palaces;
  }
}

function setDun(dun) {
  if (!curData || !['阳遁','阴遁'].includes(dun)) return;
  curData.activeDun = dun;
  ensureActiveDunData();
  renderResult();
  renderTraditionalPlate();
  // 同步切换按钮高亮
  const btns = document.querySelectorAll('.dun-toggle-btn');
  btns.forEach(b => {
    b.classList.toggle('active', b.dataset.dun === dun);
  });
}
```

- [ ] **Step 2：修改 `paipan()`，排盘成功后初始化 `activeDun`**

在 `curData = result;` 之后加入：

```javascript
    curData.activeDun = curData.pan.dun;
    ensureActiveDunData();
```

---

## Task 5：在排盘结果上方增加【阳遁 / 阴遁】切换条

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1：在 `dun-info-bar` 与 `traditional-plate` 之间插入切换条 HTML**

找到：
```html
  <div class="dun-info-bar" id="dun-info-bar"></div>

  <div class="traditional-plate" id="traditional-plate">
```

替换为：

```html
  <div class="dun-info-bar" id="dun-info-bar"></div>

  <div class="dun-toggle-bar" id="dun-toggle-bar">
    <button class="dun-toggle-btn" data-dun="阳遁" onclick="setDun('阳遁')">阳遁</button>
    <button class="dun-toggle-btn" data-dun="阴遁" onclick="setDun('阴遁')">阴遁</button>
  </div>

  <div class="traditional-plate" id="traditional-plate">
```

- [ ] **Step 2：在 `<style>` 中加入切换条样式**

在 `.dun-info-bar` 样式附近加入：

```css
.dun-toggle-bar{display:flex;justify-content:center;gap:12px;margin:10px 16px}
.dun-toggle-btn{background:var(--card);border:1px solid var(--line);color:var(--ink);padding:6px 18px;border-radius:20px;font-size:13px;font-family:"STKaiti","KaiTi","楷体",serif;cursor:pointer}
.dun-toggle-btn.active{background:var(--ink);color:#fff;border-color:var(--ink)}
```

- [ ] **Step 3：在 `renderResult()` 中渲染切换条高亮状态**

在 `renderResult()` 函数末尾（`renderTraditionalPlate();` 之前）加入：

```javascript
  const dunBtns = document.querySelectorAll('.dun-toggle-btn');
  dunBtns.forEach(b => b.classList.toggle('active', b.dataset.dun === curData.activeDun));
```

---

## Task 6：【基础信息】补充农历时间 + 当前节气

**Files:**
- Modify: `public/index.html`
- Modify: `algorithm/pillars.js`

- [ ] **Step 1：后端返回农历与节气信息**

在 `algorithm/pillars.js` 的 `fullPaiPanFromTime` 中，return 之前加入：

```javascript
  const lunarYearGZ = lunar.getYearInGanZhi();
  const lunarMonthCN = lunar.getMonthInChinese();
  const lunarDayCN   = lunar.getDayInChinese();
  const lunarHourCN  = lunar.getTimeZhi();
  const prevJq = lunar.getPrevJieQi();
  const nextJq = lunar.getNextJieQi();
  const jieQiInfo = {
    prev: prevJq ? { name: prevJq.getName(), solar: prevJq.getSolar() } : null,
    next: nextJq ? { name: nextJq.getName(), solar: nextJq.getSolar() } : null
  };
```

并在返回值中加入：

```javascript
    lunar: {
      yearGZ: lunarYearGZ,
      month: lunarMonthCN,
      day: lunarDayCN,
      hourZhi: lunarHourCN,
      isLeap: lunar.getMonth() !== lunarMonth // 注意：按实际月份判断闰月需根据库 API 调整
    },
    jieQi: jieQiInfo,
```

> 若 `lunar.getPrevJieQi()` / `getNextJieQi()` 返回的对象方法不同，以 `lunar-javascript` 实际 API 为准；可先用 `console.log` 确认后修正。

- [ ] **Step 2：前端渲染农历与节气**

在 `renderResult()` 的 `infoGrid.innerHTML` 中，将：

```html
    <div class="ig-item"><div class="ig-lbl">时辰</div><div class="ig-val">${hourText}</div></div>
```

改为：

```html
    <div class="ig-item"><div class="ig-lbl">时辰</div><div class="ig-val">${hourText}</div></div>
    <div class="ig-item full">
      <div class="ig-lbl">农历</div>
      <div class="ig-val">${curData.lunar ? curData.lunar.yearGZ + '年' + curData.lunar.month + '月' + curData.lunar.day + (curData.lunar.isLeap ? '闰' : '') + ' ' + curData.lunar.hourZhi + '时' : '—'}</div>
    </div>
    <div class="ig-item full" id="jieqi-item" style="display:none">
      <div class="ig-lbl">节气</div>
      <div class="ig-val" id="jieqi-val"></div>
    </div>
```

并在 `renderResult()` 末尾加入节气填充：

```javascript
  const jqEl = document.getElementById('jieqi-item');
  const jqVal = document.getElementById('jieqi-val');
  if (curData.jieQi && jqEl && jqVal) {
    const lines = [];
    if (curData.jieQi.prev) {
      const s = curData.jieQi.prev.solar;
      lines.push(`${curData.jieQi.prev.name}${s.getYear()}年${s.getMonth()}月${s.getDay()}日 ${String(s.getHour()).padStart(2,'0')}:${String(s.getMinute()).padStart(2,'0')}`);
    }
    if (curData.jieQi.next) {
      const s = curData.jieQi.next.solar;
      lines.push(`${curData.jieQi.next.name}${s.getYear()}年${s.getMonth()}月${s.getDay()}日 ${String(s.getHour()).padStart(2,'0')}:${String(s.getMinute()).padStart(2,'0')}`);
    }
    jqVal.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
    jqEl.style.display = 'flex';
  }
```

- [ ] **Step 3：调整 `.info-grid` 样式允许全宽项**

在 `.info-grid` 样式中加入：

```css
.info-grid .ig-item.full{grid-column:1/-1}
```

---

## Task 7：删除【智能解读】模块

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1：删除智能解读 HTML**

删除：

```html
  <!-- 智能解读面板 -->
  <div class="ai-interpret" id="ai-interpret"> ... </div>
```

- [ ] **Step 2：删除/注释相关 JS 函数**

删除或清空以下函数：
- `generateInterpret()`
- `toggleInterpretExpand()`
- `autoGenerateInterpret()`
- 在 `renderResult()` / `paipan()` 中所有调用 `generateInterpret()` 的代码行。

- [ ] **Step 3：删除 `.ai-interpret` 相关 CSS**

删除 `.ai-interpret{...}` 至 `.ai-interpret-loading{...}` 之间的全部样式。

---

## Task 8：删除宫位弹窗中的生旺死绝表、天盘各宫之干、六合关系

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1：移除 palace cell 中 `onclick` 点击弹出生旺死绝的代码**

在 `renderTraditionalPlate()` 中，将中间列四个 span 的 `onclick` 删除：

```html
<span class="pc-ling" title="..." onclick="event.stopPropagation();showShengWang('ling',${cell.idx})">${ling}</span>
```

改为：

```html
<span class="pc-ling" title="神盘">${ling}</span>
```

同理 `pc-tian`、`pc-ren`、`pc-di` 的 `onclick` 全部删除，`title` 相应改为「天盘」「人盘」「地盘」。

- [ ] **Step 2：删除 `showShengWang()` 函数**

删除整个 `function showShengWang(plate, idx) { ... }`。

- [ ] **Step 3：简化 `showPalaceDetail()`，移除三类内容**

在 `showPalaceDetail()` 中：
- 删除「本宫四干 · 映射...」凶格标注块。
- 删除「生旺死绝表 · 整体」块。
- 保留神/星/门知识库说明与综合判定即可。

- [ ] **Step 4：删除/注释相关常量（可选）**

可保留 `SW_STATES`、`TIAN_GAN_WU_HE` 等常量（不暴露给用户即可），但不删除引用它们的函数前先确认无其他调用。

---

## Task 9：重命名宫位左/中列标签

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1：修改 palace cell 中的 title 与悬停语义**

左列（神/星/门）对应的 `title` 改为「灵盘」「星盘」「门盘」；中列四个 title 改为「神盘」「天盘」「人盘」「地盘」。

已在 Task 8 的代码中一并处理。

- [ ] **Step 2：修改 palace detail modal 中的四干标签**

在 `showPalaceDetail()` 的 `fourGan` 数组中：

```javascript
  const fourGan = [
    { k: 'lingGan', n: '神盘' },
    { k: 'tianGan', n: '天盘' },
    { k: 'renPan', n: '人盘' },
    { k: 'diGan', n: '地盘' }
  ];
```

- [ ] **Step 3：PDF 导出中的标签（PDF 当前仅显示值，无文本标签；如后续需要，同步此命名）**

PDF 模板中当前没有显示「灵盘/神盘」文字标签，仅使用 class 名，可保持不变。

---

## Task 10：【排盘结果】统一黑色

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1：plate cell 文字颜色统一为黑色系**

将相关 CSS：

```css
.pc-shen{font-size:var(--pf-shen);font-weight:700;color:var(--gold);letter-spacing:1px;font-family:"STKaiti","KaiTi","楷体",serif}
.pc-ling{font-size:var(--pf-ling);font-weight:700;color:#6b4e00;font-family:"STKaiti","KaiTi","楷体",serif}
.pc-men.m-吉,.pc-men.m-生,...{color:#2e7d32}
.pc-men.m-大凶,.pc-men.m-死,...{color:#c62828}
```

统一改为：

```css
.pc-shen{font-size:var(--pf-shen);font-weight:700;color:var(--ink);letter-spacing:1px;font-family:"STKaiti","KaiTi","楷体",serif}
.pc-ling{font-size:var(--pf-ling);font-weight:700;color:var(--ink);font-family:"STKaiti","KaiTi","楷体",serif}
.pc-men.m-吉,.pc-men.m-生,.pc-men.m-开,.pc-men.m-玄,.pc-men.m-天,.pc-men.m-从,.pc-men.m-休,.pc-men.m-景,
.pc-men.m-大凶,.pc-men.m-死,.pc-men.m-伤,.pc-men.m-冲,.pc-men.m-惊,
.pc-men.m-杜,.pc-men.m-大吉,.pc-men.m-凶,.pc-men.m-中{color:var(--ink)}
```

- [ ] **Step 2：右列天罡/月局/节气/日排保留暗金色（用户未要求改右列）**

`pc-tg`、`pc-yj`、`pc-jq`、`pc-rp` 的 `#b8860b` 颜色保持不变。

- [ ] **Step 3：四柱天干的金色保留（用户未要求改四柱）**

`.pillar-row .pillar .gz .gan{color:var(--gold)}` 保持不变。

---

## Task 11：验证与测试

**Files:**
- Modify: `tests/qimen-core.test.js`

- [ ] **Step 1：新增双遁输出断言**

在 `tests/qimen-core.test.js` 中加入：

```javascript
test('同一时辰同时输出阳遁与阴遁两套结果', () => {
  const result = fullPaiPanFromTime(2026, 8, 14, 14, 22);
  assert.ok(result.yangResult, '应返回 yangResult');
  assert.ok(result.yinResult, '应返回 yinResult');
  assert.equal(result.yangResult.pan.dun, '阳遁');
  assert.equal(result.yinResult.pan.dun, '阴遁');
  assert.notEqual(result.yangResult.pan.ju, result.yinResult.pan.ju, '阳遁局数与阴遁局数应不同');
});
```

- [ ] **Step 2：运行全部测试**

```bash
npm run test:school
```

Expected：所有测试通过。

- [ ] **Step 3：本地启动并人工审查**

```bash
npm start
```

打开 `http://localhost:8090/`，进行一次排盘，检查：
1. 排盘结果上方出现「阳遁 / 阴遁」切换按钮，默认高亮自然遁。
2. 点击切换后，表格内容按另一套结果刷新。
3. 基础信息中显示农历、节气。
4. 页面无「智能解读」区域。
5. 点击宫位不再弹出生旺死绝表 / 六合关系 / 天盘各宫之干。
6. 表格内文字颜色统一为黑色（右列暗金保留）。
7. 手机端（≤540px）无布局错乱。

---

## Task 12：提交与记录

- [ ] **Step 1：提交代码**

```bash
git add algorithm/qimen.js algorithm/pillars.js algorithm/browser-entry.js public/algorithm.bundle.js public/index.html tests/qimen-core.test.js docs/superpowers/plans/2026-08-29-paipan-ui-overhaul.md
git commit -m "feat: 排盘结果UI/算法调整：双遁切换、黑色统一、删除智能解读与弹窗表格、补充农历节气"
```

- [ ] **Step 2：更新 `work-flow.md`**

按项目规范追加记录。

- [ ] **Step 3：推送到远程**

```bash
git push origin master
```

（若网络仍中断，记录失败原因并稍后重试。）
