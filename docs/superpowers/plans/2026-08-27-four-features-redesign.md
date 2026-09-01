# 四柱八字 / 紫微斗数 / 梅花易数 / 大六壬 / 我的页面 重做实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将四个命理功能从文字卡片堆砌升级为图形化专业命理工具，并优化我的页面视觉细节，与奇门遁甲主盘风格统一。

**Architecture:** 单页应用，沿用 showPage 机制；算法封装为 `public/features/<name>.js` 纯函数模块；UI 在 `public/index.html` 内联渲染；测试在 `tests/<name>.test.js`；资源同步至 public/、根目录、docs/ 三处入口。

**Tech Stack:** 原生 JavaScript + Express + Node test runner；无新框架引入。

**依据设计文档:** `docs/superpowers/specs/2026-08-27-four-features-redesign.md`

---

## 阶段 1：我的页面优化 + 四柱八字重做

### Task 1.1: 我的页面工具箱副标题优化

**Files:**
- Modify: `f:\1\夫\public\index.html`（#page-profile 工具箱宫格）
- Sync: `f:\1\夫\index.html`、`f:\1\夫\docs\index.html`

- [ ] **Step 1: 工具箱 4 格加入副标题**

修改 `#page-profile` 工具箱 icon-grid，每格增加 `ig-sub` 副标题元素：
```html
<div class="ig-item" onclick="showPage('bazi')">
  <div class="ig-icon dark">八</div>
  <div class="ig-label">四柱八字</div>
  <div class="ig-sub">年月日时 · 藏干十神</div>
</div>
<div class="ig-item" onclick="showPage('ziwei')">
  <div class="ig-icon">紫</div>
  <div class="ig-label">紫微斗数</div>
  <div class="ig-sub">命身宫 · 十四主星</div>
</div>
<div class="ig-item" onclick="showPage('meihua')">
  <div class="ig-icon dark">梅</div>
  <div class="ig-label">梅花易数</div>
  <div class="ig-sub">本互变卦 · 体用生克</div>
</div>
<div class="ig-item" onclick="showPage('daliuren')">
  <div class="ig-icon">壬</div>
  <div class="ig-label">大六壬</div>
  <div class="ig-sub">四课三传 · 天地盘</div>
</div>
```

- [ ] **Step 2: 添加 .ig-sub 样式**

在 `.ig-label` 样式后添加：
```css
.ig-sub{font-size:11px;color:var(--sub);margin-top:2px;letter-spacing:0.5px}
```

- [ ] **Step 3: 同步至三处入口并浏览器审查**

Run: `Copy-Item public\index.html index.html -Force; Copy-Item public\index.html docs\index.html -Force`
启动 server.js，浏览器访问 http://localhost:8090/，切到「我的」页面截图审查。

- [ ] **Step 4: Commit**

```bash
git add public/index.html index.html docs/index.html
git commit -m "feat(profile): 工具箱增加副标题说明"
```

---

### Task 1.2: 四柱八字算法 - 数据表与核心函数

**Files:**
- Create: `f:\1\夫\public\features\bazi.js`（覆盖现有同名文件）
- Test: `f:\1\夫\tests\bazi.test.js`

- [ ] **Step 1: 写测试 - 四柱干支计算**

`tests/bazi.test.js`：
```javascript
const { test } = require('node:test');
const assert = require('node:assert');
const { paiPan } = require('../public/features/bazi.js');

test('四柱八字：1990-05-15 14:30 男命', () => {
  const r = paiPan({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: '男' });
  assert.strictEqual(r.fourPillars.gan.year, '庚');
  assert.strictEqual(r.fourPillars.zhi.year, '午');
  assert.strictEqual(r.fourPillars.gan.month, '辛');
  assert.strictEqual(r.fourPillars.zhi.month, '巳');
  assert.strictEqual(r.fourPillars.gan.day, '庚');
  assert.strictEqual(r.fourPillars.zhi.day, '辰');
  assert.strictEqual(r.fourPillars.gan.time, '癸');
  assert.strictEqual(r.fourPillars.zhi.time, '未');
});

test('藏干：午含丁己', () => {
  const r = paiPan({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: '男' });
  assert.deepStrictEqual(r.hiddenStems.year, ['丁', '己']);
});

test('十神：日主庚，年干庚为比肩', () => {
  const r = paiPan({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: '男' });
  assert.strictEqual(r.tenGods.year, '比肩');
});

test('大运：男阳年顺排，起运约 3 岁', () => {
  const r = paiPan({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: '男' });
  assert.ok(r.daYun.length >= 8);
  assert.strictEqual(r.daYun[0].startAge, 3);
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `node --test tests/bazi.test.js`
Expected: FAIL（函数未实现或导出错误）

- [ ] **Step 3: 实现 bazi.js 核心函数**

`public/features/bazi.js` 包含：
- `TIANGAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']`
- `DIZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']`
- `HIDDEN_STEMS` 地支藏干表（本气/中气/余气，含权重 60%/30%/10%）
- `NAYIN` 六十甲子纳音表
- `TEN_GODS` 十神对照表（基于日干与年月时干关系）
- `SHENSHA_RULES` 神煞规则（天乙/太极/将星/桃花/驿马/亡神等 20+）
- `palaceStrength(month, day, hour)` 日主旺衰计算
- `dayunDirection(yearGan, gender)` 大运顺逆
- `paiPan(input)` 主函数返回完整排盘数据

实现要点：
- 四柱计算：年柱以立春为界，月柱以节气为界，日柱查万年历，时柱由日干起时
- 藏干权重：本气 60%、中气 30%、余气 10%
- 十神：以日干为我，比/劫/食/伤/财/官/印分组
- 大运：阳男阴女顺排，阴男阳女逆排；起运岁数按出生到下一节气天数 ÷ 3

- [ ] **Step 4: 运行测试验证通过**

Run: `node --test tests/bazi.test.js`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add public/features/bazi.js tests/bazi.test.js
git commit -m "feat(bazi): 实现四柱八字核心算法"
```

---

### Task 1.3: 四柱八字 UI 重做 - 四柱方盘表

**Files:**
- Modify: `f:\1\夫\public\index.html`（renderBazi 函数 + CSS）

- [ ] **Step 1: 添加四柱方盘表 CSS**

在 `.fr-card` 样式后添加：
```css
/* 四柱方盘表 */
.bazi-table{width:100%;border-collapse:collapse;font-family:"STKaiti","KaiTi","楷体",serif;background:var(--card);border:1.5px solid var(--ink)}
.bazi-table th,.bazi-table td{border:1px solid var(--line);padding:6px 4px;text-align:center;font-size:13px}
.bazi-table th{background:var(--card-2);color:var(--sub);font-weight:normal;font-size:11px;letter-spacing:1px}
.bazi-table .bt-dayun{color:#a83a3a;font-weight:bold}
.bazi-table .bt-ten-god{color:var(--gold)}
.bazi-table .bt-hidden{font-size:11px;color:var(--sub)}
```

- [ ] **Step 2: 重写 renderBazi 渲染四柱方盘**

替换现有 `renderBazi(r)` 函数：
```javascript
function renderBazi(r) {
  const labels = ['年柱', '月柱', '日柱', '时柱'];
  const keys = ['year', 'month', 'day', 'time'];
  /* 表头 */
  const headerHtml = '<tr><th>项目</th>' + labels.map(l => `<th>${l}</th>`).join('') + '</tr>';
  /* 各行数据 */
  function row(label, getter, cls) {
    return `<tr><th>${label}</th>` + keys.map(k => `<td class="${cls||''}">${getter(k)||'—'}</td>`).join('') + '</tr>';
  }
  const ganRow = row('天干', k => r.fourPillars.gan[k], 'bt-dayun');
  const zhiRow = row('地支', k => r.fourPillars.zhi[k]);
  const tenGodRow = row('十神', k => r.tenGods[k], 'bt-ten-god');
  const hiddenRow = row('藏干', k => (r.hiddenStems[k]||[]).join(' '), 'bt-hidden');
  const nayinRow = row('纳音', k => r.nayin[k]);
  const kongWangRow = row('空亡', k => r.kongWang[k]);
  const diShiRow = row('地势', k => r.diShi[k]);
  const shenShaRow = row('神煞', k => (r.shenSha[k]||[]).join('/'));
  const wangShuaiRow = row('旺衰', k => r.wangShuai[k]);
  return `
    <div class="fr-card">
      <div class="fr-title">四柱方盘</div>
      <table class="bazi-table">
        ${headerHtml}
        ${tenGodRow}
        ${ganRow}
        ${wangShuaiRow}
        ${zhiRow}
        ${hiddenRow}
        ${nayinRow}
        ${kongWangRow}
        ${diShiRow}
        ${shenShaRow}
      </table>
    </div>
  `;
}
```

- [ ] **Step 3: 同步并浏览器审查**

启动 server.js，访问 bazi 页面，输入 1990-05-15 14:30 男，排盘后截图审查方盘表。

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat(bazi): 重做四柱方盘表 UI"
```

---

### Task 1.4: 四柱八字 UI - 五行分布 + 大运时间轴 + 格局卡

**Files:**
- Modify: `f:\1\夫\public\index.html`（renderBazi 续）

- [ ] **Step 1: 五行分布条形图**

在 renderBazi 末尾追加：
```javascript
function wuxingBarHtml(r) {
  const wx = r.wuxing || {};
  const total = Object.values(wx).reduce((a,b)=>a+b, 0) || 1;
  const colors = {金:'#d4af37', 木:'#5a8a3a', 水:'#3a5a8a', 火:'#a83a3a', 土:'#8a6a3a'};
  return '<div class="fr-card"><div class="fr-title">五行分布</div>' +
    Object.keys(colors).map(k => {
      const v = wx[k] || 0;
      const pct = Math.round(v / total * 100);
      const isLack = v === 0;
      return `<div class="wx-row">
        <span class="wx-label" style="color:${colors[k]}">${k}</span>
        <div class="wx-bar-bg"><div class="wx-bar" style="width:${pct}%;background:${colors[k]}"></div></div>
        <span class="wx-val">${v}${isLack?' <span class="wx-lack">缺</span>':''}</span>
      </div>`;
    }).join('') + '</div>';
}
```

CSS：
```css
.wx-row{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:13px}
.wx-label{width:18px;font-weight:bold}
.wx-bar-bg{flex:1;height:14px;background:var(--card-2);border:0.5px solid var(--line);border-radius:2px;overflow:hidden}
.wx-bar{height:100%;transition:width .3s}
.wx-val{width:50px;text-align:right;color:var(--sub);font-size:11px}
.wx-lack{color:#a83a3a;font-weight:bold}
```

- [ ] **Step 2: 大运时间轴**

```javascript
function dayunHtml(r) {
  const list = (r.daYun || []).slice(0, 8);
  return '<div class="fr-card"><div class="fr-title">大运时间轴（' + (r.daYunDirection||'') + '）</div>' +
    '<div class="dy-timeline">' + list.map(dy => 
      `<div class="dy-card${dy.current?' current':''}">
        <div class="dy-age">${dy.startAge}岁</div>
        <div class="dy-gz">${dy.ganZhi}</div>
        <div class="dy-tg">${dy.tenGod||''}</div>
      </div>`
    ).join('') + '</div></div>';
}
```

CSS：
```css
.dy-timeline{display:flex;overflow-x:auto;gap:8px;padding:4px 0}
.dy-card{flex:0 0 80px;background:var(--card-2);border:1px solid var(--line);padding:8px 4px;text-align:center;border-radius:4px}
.dy-card.current{border-color:var(--gold);background:#faf0d4}
.dy-age{font-size:11px;color:var(--sub)}
.dy-gz{font-size:16px;font-weight:bold;margin:4px 0;font-family:"STKaiti","KaiTi",serif}
.dy-tg{font-size:11px;color:var(--gold)}
```

- [ ] **Step 3: 格局判断卡**

```javascript
function gejuHtml(r) {
  const g = r.geju || {};
  return `<div class="fr-card">
    <div class="fr-title">格局判断</div>
    <div class="fr-row"><div class="fr-label">格局</div><div class="fr-value">${g.name||'—'}</div></div>
    <div class="fr-row"><div class="fr-label">用神</div><div class="fr-value">${g.yongShen||'—'}</div></div>
    <div class="fr-row"><div class="fr-label">忌神</div><div class="fr-value">${g.jiShen||'—'}</div></div>
    <div class="fr-row"><div class="fr-label">旺衰</div><div class="fr-value">${g.wangShuai||'—'}</div></div>
    ${g.duanYu ? `<div class="fr-duanyu">${g.duanYu}</div>` : ''}
  </div>`;
}
```

- [ ] **Step 4: 组装到 renderBazi**

在 renderBazi 返回值末尾追加：`${wuxingBarHtml(r)}${dayunHtml(r)}${gejuHtml(r)}`

- [ ] **Step 5: 同步、浏览器审查、Commit**

Run: 同步三处入口，启动 server，bazi 排盘截图审查五行条形图+大运时间轴+格局卡。

```bash
git add public/index.html index.html docs/index.html
git commit -m "feat(bazi): 增加五行分布/大运时间轴/格局判断卡"
```

---

## 阶段 2：紫微斗数 + 梅花易数重做

### Task 2.1: 紫微斗数算法 - 命身宫/五行局/十四主星

**Files:**
- Create: `f:\1\夫\public\features\ziwei.js`
- Test: `f:\1\夫\tests\ziwei.test.js`

- [ ] **Step 1: 写测试**

```javascript
test('紫微：1995-06-15 10:30 男命，命宫己丑', () => {
  const r = paiPan({ year: 1995, month: 6, day: 15, hour: 10, minute: 30, gender: '男' });
  assert.strictEqual(r.mingGong, '丑');
  assert.strictEqual(r.bodyPalace, '夫妻');
  assert.ok(r.fiveElementClass.includes('局'));
});

test('十四主星：紫微定位正确', () => {
  const r = paiPan({ year: 1995, month: 6, day: 15, hour: 10, minute: 30, gender: '男' });
  const ziweiPalace = r.palaces.find(p => (p.majorStars||[]).includes('紫微'));
  assert.ok(ziweiPalace);
});
```

- [ ] **Step 2: 实现 ziwei.js**

核心函数：
- `MING_GONG_FORMULA(month, hour)` 命宫公式：寅起正月，顺数至生月，再从生月逆数至生时
- `WUXING_JU(mingGongGanZhi)` 五行局：纳音五行定局数
- `ZIWEI_POSITION(day, wuxingJu)` 紫微星定位：生日 ÷ 局数取整推紫微
- 十四主星：紫微系（紫微/天机/太阳/武曲/天同/廉贞）+ 天府系（天府/太阴/贪狼/巨门/天相/天梁/七杀/破军）
- `SIHUA(yearGan)` 出生年干四化（禄/权/科/忌）
- 六吉六凶：左辅/右弼/文昌/文曲/天魁/天钺 + 擎羊/陀罗/火星/铃星/地空/地劫
- 大限：五行局起 6 岁，每 10 年一限

- [ ] **Step 3-5: 测试通过、Commit**

```bash
git add public/features/ziwei.js tests/ziwei.test.js
git commit -m "feat(ziwei): 实现命身宫/五行局/十四主星算法"
```

---

### Task 2.2: 紫微斗数 UI - 4×4 命盘方盘

**Files:**
- Modify: `f:\1\夫\public\index.html`（renderZiwei + CSS）

- [ ] **Step 1: 4×4 命盘 CSS**

```css
.zw-board{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:1px;background:var(--ink);border:1.5px solid var(--ink);aspect-ratio:1}
.zw-cell{background:var(--card);padding:6px 4px;font-size:11px;text-align:center;position:relative;font-family:"STKaiti","KaiTi",serif}
.zw-cell.zw-center{grid-column:2/4;grid-row:2/4;background:var(--card-2);display:flex;flex-direction:column;justify-content:center}
.zw-gzhi{color:var(--sub);font-size:10px}
.zw-role{font-weight:bold;color:var(--ink);margin:2px 0}
.zw-star{color:var(--gold);font-size:11px;line-height:1.4}
.zw-star.lh{color:#5a8a3a}.zw-star.q{color:#a83a3a}.zw-star.k{color:#3a5a8a}.zw-star.kc{color:#6b3a8a}
.zw-daxian{position:absolute;bottom:2px;right:4px;font-size:9px;color:var(--sub)}
.zw-body{position:absolute;top:2px;right:4px;font-size:9px;color:var(--gold)}
```

- [ ] **Step 2: 重写 renderZiwei 渲染 4×4 方盘**

十二宫布局索引（4×4，中宫 2×2）：
```javascript
const ZW_LAYOUT = [
  {idx:8, branch:'巳'}, {idx:9, branch:'午'}, {idx:10, branch:'未'}, {idx:11, branch:'申'},
  {idx:7, branch:'辰'},  null,                  null,                  {idx:0, branch:'酉'},
  {idx:6, branch:'卯'},  null,                  null,                  {idx:1, branch:'戌'},
  {idx:5, branch:'寅'}, {idx:4, branch:'丑'},  {idx:3, branch:'子'},  {idx:2, branch:'亥'}
];
/* 12 宫职顺序：命兄夫子财疾迁奴官田福父 */
const ZW_ROLES = ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','奴仆','官禄','田宅','福德','父母'];
```

渲染逻辑：遍历 ZW_LAYOUT，找到对应宫位（地支匹配），渲染宫干支/宫职/主星/辅星/四化/大限。

- [ ] **Step 3: 命身宫信息卡 + 格局列表**

```javascript
function zwInfoHtml(r) {
  return `<div class="fr-card">
    <div class="fr-title">命身宫信息</div>
    <div class="fr-row"><div class="fr-label">命宫</div><div class="fr-value">${r.mingGong}（${r.mingGongGanZhi}）</div></div>
    <div class="fr-row"><div class="fr-label">身宫</div><div class="fr-value">${r.bodyPalace}（${r.bodyPalaceRole}）</div></div>
    <div class="fr-row"><div class="fr-label">五行局</div><div class="fr-value">${r.fiveElementClass}（${r.fiveElementNumber}局）</div></div>
    <div class="fr-row"><div class="fr-label">命主</div><div class="fr-value">${r.mingZhu||'—'}</div></div>
    <div class="fr-row"><div class="fr-label">身主</div><div class="fr-value">${r.shenZhu||'—'}</div></div>
    <div class="fr-row"><div class="fr-label">农历</div><div class="fr-value">${r.lunarDate.lunarMonth}月${r.lunarDate.lunarDay}日${r.lunarDate.isLeap?'（闰）':''}</div></div>
  </div>`;
}
```

- [ ] **Step 4: 同步、浏览器审查、Commit**

```bash
git add public/index.html index.html docs/index.html
git commit -m "feat(ziwei): 重做 4×4 命盘方盘 UI"
```

---

### Task 2.3: 梅花易数算法 - 本/互/变卦 + 体用生克

**Files:**
- Create: `f:\1\夫\public\features\meihua.js`
- Test: `f:\1\夫\tests\meihua.test.js`

- [ ] **Step 1: 写测试**

```javascript
test('梅花数字起卦：3/8/6，本卦火水未济，变卦火风鼎', () => {
  const r = paiPan({ numbers: [3, 8, 6] });
  assert.strictEqual(r.benGua.upperGua, '离');
  assert.strictEqual(r.benGua.lowerGua, '坎');
  assert.strictEqual(r.benGua.name, '火水未济');
  assert.strictEqual(r.yao, 6);
  assert.strictEqual(r.bianGua.name, '火风鼎');
});

test('互卦：未济之互为既济', () => {
  const r = paiPan({ numbers: [3, 8, 6] });
  assert.strictEqual(r.huGua.name, '水火既济');
});

test('体用：6爻动在上卦，下卦为体', () => {
  const r = paiPan({ numbers: [3, 8, 6] });
  assert.strictEqual(r.tiGua, '坎');
  assert.strictEqual(r.yongGua, '离');
});
```

- [ ] **Step 2: 实现 meihua.js**

核心：
- `BAGUA = {乾1,兑2,离3,震4,巽5,坎6,艮7,坤8}`（先天数）
- `BAGUA_WUXING = {乾金,兑金,离火,震木,巽木,坎水,艮土,坤土}`
- `BAGUA_SYMBOL = {乾☰,兑☱,离☲,震☳,巽☴,坎☵,艮☶,坤☷}`
- `GUA64` 六十四卦表（上卦+下卦 → 卦名）
- 数字起卦：上=A%8（0当8）、下=B%8、动爻=(A+B+C)%6（0当6）
- 时间起卦：上=(年支+月+日)%8、下=(年支+月+日+时支)%8、动爻=(年支+月+日+时支)%6
- 互卦：本卦六爻（从下到上 1-6），下互=2,3,4爻，上互=3,4,5爻
- 变卦：动爻阴阳互换
- 体用：动爻所在卦为用，另一卦为体
- 五行生克：体生用/体克用/用生体/用克体/比和

- [ ] **Step 3-5: 测试、Commit**

```bash
git add public/features/meihua.js tests/meihua.test.js
git commit -m "feat(meihua): 实现本/互/变卦+体用生克算法"
```

---

### Task 2.4: 梅花易数 UI - 三卦横排 + 体用关系图

**Files:**
- Modify: `f:\1\夫\public\index.html`（renderMeihua + CSS）

- [ ] **Step 1: 卦象爻线 CSS**

```css
.mh-gua-row{display:flex;gap:16px;justify-content:center;margin:16px 0}
.mh-gua{flex:0 0 100px;text-align:center;font-family:"STKaiti","KaiTi",serif}
.mh-yao{height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--sub)}
.mh-yao-line{width:80px;height:6px;background:var(--ink)}
.mh-yao-broken{width:80px;height:6px;background:linear-gradient(to right,var(--ink) 0 35px,transparent 35px 45px,var(--ink) 45px 80px)}
.mh-yao-mark{margin-left:4px;color:var(--gold);font-weight:bold}
.mh-gua-name{margin-top:8px;font-size:14px;font-weight:bold;color:var(--gold)}
.mh-gua-wx{font-size:11px;color:var(--sub)}
```

- [ ] **Step 2: 渲染六爻**

```javascript
function yaoHtml(yao, isDong, dongMark) {
  /* yao: 1=阳, 0=阴 */
  const line = yao === 1 ? '<div class="mh-yao-line"></div>' : '<div class="mh-yao-broken"></div>';
  const mark = isDong ? `<span class="mh-yao-mark">${dongMark}</span>` : '';
  return `<div class="mh-yao">${line}${mark}</div>`;
}

function guaHtml(gua, dongYao, title) {
  /* gua: {upperGua, lowerGua, yaoArray:[6位从初爻到上爻], name, upperWuxing, lowerWuxing} */
  const yaos = (gua.yaoArray || []).slice().reverse(); /* 上爻在上显示 */
  return `<div class="mh-gua">
    <div class="mh-gua-title">${title}</div>
    ${yaos.map((y, i) => {
      const yaoIdx = 6 - i; /* 显示位置转爻位 */
      const isDong = yaoIdx === dongYao;
      const mark = y === 1 ? '○' : '×';
      return yaoHtml(y, isDong, mark);
    }).join('')}
    <div class="mh-gua-name">${gua.name||'—'}</div>
    <div class="mh-gua-wx">${gua.upperGua||''}(${gua.upperWuxing||''}) / ${gua.lowerGua||''}(${gua.lowerWuxing||''})</div>
  </div>`;
}
```

- [ ] **Step 3: 体用关系图**

```javascript
function tiYongHtml(r) {
  const colors = {生:'#5a8a3a', 克:'#a83a3a', 比和:'#6b6b6b'};
  const arrow = {生:'→', 克:'→', 比和:'↔'};
  return `<div class="fr-card">
    <div class="fr-title">体用生克</div>
    <div class="mh-tiyong">
      <div class="mh-ti">体卦（我）<br><b>${r.tiGua}</b><br><span class="mh-wx">${r.tiWuxing||''}</span></div>
      <div class="mh-arrow" style="color:${colors[r.tiYongRelation]||'#6b6b6b'}">${arrow[r.tiYongRelation]||'→'} ${r.tiYongRelation||''}</div>
      <div class="mh-yong">用卦（事）<br><b>${r.yongGua}</b><br><span class="mh-wx">${r.yongWuxing||''}</span></div>
    </div>
    ${r.duanYu ? `<div class="fr-duanyu">${r.duanYu}</div>` : ''}
  </div>`;
}
```

- [ ] **Step 4: 组装 renderMeihua**

```javascript
function renderMeihua(r) {
  return `
    <div class="fr-card">
      <div class="fr-title">卦象</div>
      <div class="mh-gua-row">
        ${guaHtml(r.benGua, r.yao, '本卦')}
        ${guaHtml(r.huGua, 0, '互卦')}
        ${guaHtml(r.bianGua, 0, '变卦')}
      </div>
    </div>
    ${r.benGua.guaCi ? `<div class="fr-card"><div class="fr-title">卦辞</div><div class="fr-duanyu">${r.benGua.guaCi}</div></div>` : ''}
    ${tiYongHtml(r)}
    <div class="fr-meta">算法版本：${r.algorithmVersion||'—'}<br>规则集：${r.ruleset||'—'}</div>
  `;
}
```

- [ ] **Step 5: 同步、浏览器审查、Commit**

```bash
git add public/index.html index.html docs/index.html
git commit -m "feat(meihua): 重做三卦横排+体用关系图 UI"
```

---

## 阶段 3：大六壬重做

### Task 3.1: 大六壬算法 - 月将/天地盘/四课三传

**Files:**
- Create: `f:\1\夫\public\features\daliuren.js`
- Test: `f:\1\夫\tests\daliuren.test.js`

- [ ] **Step 1: 写测试**

```javascript
test('六壬：2026-08-26 22:57，月将太乙(巳)', () => {
  const r = paiPan({ year: 2026, month: 8, day: 26, hour: 22, minute: 57 });
  assert.strictEqual(r.yueJiang, '巳');
  assert.ok(r.fourLessons.length === 4);
  assert.ok(r.sanChuan.initial);
});

test('四课：日干壬寄亥，亥上神', () => {
  const r = paiPan({ year: 2026, month: 8, day: 26, hour: 22, minute: 57 });
  assert.ok(r.fourLessons[0].down === '亥' || r.fourLessons[0].up);
});
```

- [ ] **Step 2: 实现 daliuren.js**

核心：
- `YUE_JIANG_TABLE` 月将表（按节气：雨水后河魁→春分后从魁...共12月将）
- `GAN_PARLOR` 十干寄宫（甲寅乙辰丙巳丁未戊巳己未庚申辛戌壬亥癸丑）
- `GUIGAN_FORMULA` 贵人诀（甲戊庚牛羊...昼夜分）
- `TIAN_JIANG_ORDER` 十二天将顺序：贵人→螣蛇→朱雀→六合→勾陈→青龙→天空→白虎→太常→玄武→太阴→天后
- `tianPanRotate(yueJiang, hourZhi)` 天盘旋转（月将加时）
- `fourLessons(dayGan, dayZhi, tianPan)` 四课（日干寄宫+上神、日支+上神）
- `sanChuan(fourLessons)` 三传发用（九课门：贼克/比用/涉害/遥克/昴星/别责/八专/伏吟/返吟）
- 课体识别：元首/重审/涉害/返吟/伏吟等

- [ ] **Step 3-5: 测试、Commit**

```bash
git add public/features/daliuren.js tests/daliuren.test.js
git commit -m "feat(daliuren): 实现月将/天地盘/四课三传算法"
```

---

### Task 3.2: 大六壬 UI - 天地盘方盘 + 四课三传表格

**Files:**
- Modify: `f:\1\夫\public\index.html`（renderDaliuren + CSS）

- [ ] **Step 1: 天地盘 4×4 CSS**

```css
.dl-board{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:1px;background:var(--ink);border:1.5px solid var(--ink);aspect-ratio:1;margin:8px 0}
.dl-cell{background:var(--card);padding:6px 4px;font-size:11px;text-align:center;font-family:"STKaiti","KaiTi",serif;position:relative}
.dl-cell.dl-center{grid-column:2/4;grid-row:2/4;background:var(--card-2);display:flex;flex-direction:column;justify-content:center;align-items:center}
.dl-tj{color:var(--gold);font-size:11px;margin-bottom:2px}
.dl-tp{font-size:14px;font-weight:bold;color:var(--ink)}
.dl-dp{font-size:10px;color:var(--sub)}
```

- [ ] **Step 2: 渲染天地盘**

```javascript
function dlBoardHtml(r) {
  /* 12 地支按 4×4 排布，中宫 2×2 显示日干支/时支/月将 */
  const DIZHI_POS = [
    {zhi:'巳',pos:'1-1'},{zhi:'午',pos:'1-2'},{zhi:'未',pos:'1-3'},{zhi:'申',pos:'1-4'},
    {zhi:'辰',pos:'2-1'},                              {zhi:'酉',pos:'2-4'},
    {zhi:'卯',pos:'3-1'},                              {zhi:'戌',pos:'3-4'},
    {zhi:'寅',pos:'4-1'},{zhi:'丑',pos:'4-2'},{zhi:'子',pos:'4-3'},{zhi:'亥',pos:'4-4'}
  ];
  /* 天盘地支由月将+时支旋转 */
  const tianPan = r.tianPan; /* {地支:天盘地支} */
  const tianJiang = r.tianJiang.positions; /* {地支:天将名} */
  return `<div class="dl-board">
    ${DIZHI_POS.map(p => {
      const tp = tianPan[p.zhi] || p.zhi;
      const tj = tianJiang[p.zhi] || '';
      return `<div class="dl-cell" style="grid-area:${p.pos.replace('-','/')}">
        <div class="dl-tj">${tj}</div>
        <div class="dl-tp">${tp}</div>
        <div class="dl-dp">${p.zhi}</div>
      </div>`;
    }).join('')}
    <div class="dl-cell dl-center">
      <div>日干支：${r.dayGan}${r.dayZhi}</div>
      <div>时支：${r.hourZhi}</div>
      <div>月将：${r.yueJiang}</div>
    </div>
  </div>`;
}
```

- [ ] **Step 3: 四课三传表格**

```javascript
function dlFourLessonsHtml(r) {
  const labels = ['一课','二课','三课','四课'];
  return `<div class="fr-card">
    <div class="fr-title">四课</div>
    <table class="bazi-table">
      <tr><th>课</th>${labels.map(l=>`<th>${l}</th>`).join('')}</tr>
      <tr><th>上神</th>${r.fourLessons.map(l=>`<td>${l.up}</td>`).join('')}</tr>
      <tr><th>下神</th>${r.fourLessons.map(l=>`<td>${l.down}</td>`).join('')}</tr>
      <tr><th>克</th>${r.fourLessons.map(l=>`<td>${l.ke||''}</td>`).join('')}</tr>
    </table>
  </div>`;
}

function dlSanChuanHtml(r) {
  const sc = r.sanChuan;
  const scTj = r.sanChuanTianJiang || {};
  return `<div class="fr-card">
    <div class="fr-title">三传（${sc.method||''}）</div>
    <table class="bazi-table">
      <tr><th>传</th><th>初传</th><th>中传</th><th>末传</th></tr>
      <tr><th>地支</th><td>${sc.initial}</td><td>${sc.middle}</td><td>${sc.last}</td></tr>
      <tr><th>天将</th><td>${scTj.initial||''}</td><td>${scTj.middle||''}</td><td>${scTj.last||''}</td></tr>
      <tr><th>六亲</th><td>${sc.liuQin?.initial||''}</td><td>${sc.liuQin?.middle||''}</td><td>${sc.liuQin?.last||''}</td></tr>
    </table>
  </div>`;
}
```

- [ ] **Step 4: 课体格局卡 + 组装 renderDaliuren**

```javascript
function dlKetiHtml(r) {
  const k = r.keti || {};
  return `<div class="fr-card">
    <div class="fr-title">课体格局</div>
    <div class="fr-row"><div class="fr-label">课体</div><div class="fr-value">${k.name||'—'}</div></div>
    <div class="fr-row"><div class="fr-label">格局</div><div class="fr-value">${k.geju||'—'}</div></div>
    <div class="fr-row"><div class="fr-label">神煞</div><div class="fr-value">${k.shenSha||'—'}</div></div>
    ${k.duanYu ? `<div class="fr-duanyu">${k.duanYu}</div>` : ''}
  </div>`;
}

function renderDaliuren(r) {
  return `${dlBoardHtml(r)}${dlFourLessonsHtml(r)}${dlSanChuanHtml(r)}${dlKetiHtml(r)}`;
}
```

- [ ] **Step 5: 同步、浏览器审查、Commit**

```bash
git add public/index.html index.html docs/index.html
git commit -m "feat(daliuren): 重做天地盘方盘+四课三传表格 UI"
```

---

## 阶段 4：最终验证与文档

### Task 4.1: 全量测试 + 视觉审查

**Files:** 无修改

- [ ] **Step 1: 运行全部测试**

Run: `npm test` + `npm run test:school`
Expected: 所有测试通过（除已知日排局预存失败）

- [ ] **Step 2: 浏览器全模块视觉审查**

启动 server.js，依次访问：
- 我的页面 → 检查五区结构+工具箱副标题
- 四柱八字 → 输入 1990-05-15 14:30 男，审查方盘表+五行图+大运轴+格局卡
- 紫微斗数 → 输入 1995-06-15 10:30 男，审查 4×4 命盘+命身宫卡
- 梅花易数 → 输入 3/8/6，审查三卦横排+体用图
- 大六壬 → 输入 2026-08-26 22:57，审查天地盘+四课三传

每个模块桌面+移动双视口截图审查。

- [ ] **Step 3: work-flow.md 记录**

追加 2026-08-27 工作节点，记录五个模块重做过程、测试结果、视觉审查证据。

- [ ] **Step 4: 最终 Commit**

```bash
git add work-flow.md
git commit -m "docs: 记录四柱八字/紫微/梅花/六壬/我的页面重做完成"
```

---

## Self-Review

### Spec 覆盖检查
- 模块 A 我的页面 → Task 1.1 ✓
- 模块 B 四柱八字 → Task 1.2 (算法) + 1.3 (方盘) + 1.4 (五行/大运/格局) ✓
- 模块 C 紫微斗数 → Task 2.1 (算法) + 2.2 (4×4 命盘) ✓
- 模块 D 梅花易数 → Task 2.3 (算法) + 2.4 (三卦横排) ✓
- 模块 E 大六壬 → Task 3.1 (算法) + 3.2 (天地盘) ✓
- 质量门槛 → Task 4.1 ✓

### 数据表说明
- 四柱藏干/十神/神煞/纳音表：参考《richard3153/bazi-paipan》constants.py
- 紫微十四主星定位：参考《vue-ziwei》iztro 库算法
- 梅花六十四卦表：参考《meihua-app》lib/gua64.js
- 六壬月将/天将/九课门：参考《liuren-zenith》internal/liuren/
- 实现时需查阅上述开源项目对应文件获取完整数据表

### 风险提示
- 算法数据表巨大（藏干表 12 项 × 3 神煞规则 20+ × 紫微星曜 100+ × 六十四卦 64 项 × 六壬规则 9 课门），实现时需逐项校验
- 视觉一致性需在每阶段审查时反复调整
- 测试用例标准答案需对照参考工具（profound.fate-craft.com / liujixue.cn / meihua.quan77.cn）输出验证
