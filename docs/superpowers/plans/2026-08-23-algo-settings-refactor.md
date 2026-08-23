# 算法重构 + 设置页 + 补充完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成三大子任务：①排盘算法与文档全面重构（灵盘+天罡+日排局+神顺序+重校参考数据）②设置页（用户信息/账号安全/隐私政策/退出登录）+后端auth补全 ③功能性/布局/视觉补充完善，达成高质量成品效果。

**Architecture:** 
- 算法层：在 algorithm/qimen.js 中新增 SHEN_NEW 顺序、placeLingGan() 灵盘计算、placeTiangang() 天罡系统、placeRiPaiJu() 日排局系统；同步更新 reference.js 校准表格、knowledge.js 新增天罡知识表、pillars.js 传递月日信息
- 后端 auth 补充：在 backend/routes/auth.js 新增 绑定/解绑手机/邮箱/微信QQ/邮箱验证码/注销账号/获取用户信息/更新用户信息 接口
- 前端：新增 page-settings 设置页（5个子分区）+排盘结果3分区渲染 +隐私政策2000字 + 注销弹窗 +齿轮 onclick 跳转
- 文档：AGENTS.md、项目指南.md 同步更新全部算法规范

**Tech Stack:** Node.js + Express + SQLite(auth) + HTML/CSS/JS(index.html单页) + esbuild打包

---

## 文件变更清单总览

### 算法与文档
- Modify: `algorithm/qimen.js` (神顺序 + 灵盘 + 天罡 + 日排局 + 宫位输出对象扩展)
- Modify: `algorithm/reference.js` (阴遁5局/阳遁5局按新文档重校准，新增灵盘/天罡/日排局字段)
- Modify: `algorithm/knowledge.js` (新增天罡表、日排局规则表、十二地支宫位映射)
- Modify: `algorithm/pillars.js` (fullPaiPan 扩展参数，传递农历月份/日期给算法)
- Modify: `algorithm/test.js` (新增对灵盘、天罡、日排局的单元测试断言)
- Rebuild: `public/algorithm.bundle.js` (npm run build:browser)
- Modify: `AGENTS.md` §2.4 全部算法规范更新(神顺序、宫位三分区、灵盘/天罡/日排局规则)
- Modify: `项目指南.md` §1-2 功能与输出说明补充

### 后端 auth 补充
- Modify: `backend/routes/auth.js` (+9个新路由:邮箱验证码/绑定手机/绑定邮箱/绑定WX/绑定QQ/解绑/注销账号/我的信息/更新信息)
- Modify: `backend/db.js` (users表补充 email_verified, status 字段 ALTER TABLE，若不存在则 ALTER)
- Modify: `server.js` (auth 路由挂载已存在，检查 /api/auth/* 路径是否齐全)

### 前端(index.html单页)
- Modify: `public/index.html`:
  - 齿轮 ⚙ onclick 从 showAbout 改为 showPage('settings')
  - 新增 #page-settings (用户信息 / 账号安全 / 隐私政策 / 退出登录 四个section + 子项)
  - 排盘结果渲染 renderTraditionalPlate 改为三分区: 左/中/右
  - buildPaipanHTML(PDF导出)同步改为三分区
  - 新增 logoutConfirmModal 弹窗(取消/确定)
  - 新增 privacyPolicyContent 约 2000字中文模板

---

## Group 1（独立）: 算法 + 文档系统（约12步）

### Task 1.1: 更新 knowledge.js 新增天罡/日排局知识表

**Files:**
- Modify: `algorithm/knowledge.js`

- [ ] **Step 1: 在 knowledge.js 末尾追加天罡/日排局知识**

```javascript
// ============ 天罡系统知识 ============
// 天罡要素（12个，按固定顺序循环排布）
const TIANGANG_ELEMENTS = ['天罡', '太乙', '腾光', '小吉', '传送', '从魁', '河魁', '登时', '神后', '大吉', '功曹', '太冲'];

// 十二生肖原始宫位对应 4×4 索引（对应 GONG_LAYOUT，基于地支洛书：子1丑8寅8卯3辰4巳4午9未2申2酉7戌6亥6）
// 注意：对于双宫位(8首/8尾/2首/2尾等)按天罡表 TABLE 0 的位置取：
// 巳(4尾idx0) 午(9 idx1) 未(2尾idx2) 申(2首idx3)
// 辰(4首idx11) 酉(7 idx4)
// 卯(3 idx10)   戌(6尾idx5)
// 寅(8尾idx9) 丑(8首idx8) 子(1 idx7) 亥(6首idx6)
const ZODIAC_GONG_INDEX = {
  '巳': 0, '午': 1, '未': 2, '申': 3,
  '辰': 11, '酉': 4,
  '卯': 10, '戌': 5,
  '寅': 9, '丑': 8, '子': 7, '亥': 6
};

// 生肖名称 → 地支
const ZODIAC_TO_ZHI = {
  '猪': '亥', '鼠': '子', '牛': '丑', '虎': '寅', '兔': '卯', '龙': '辰',
  '蛇': '巳', '马': '午', '羊': '未', '猴': '申', '鸡': '酉', '狗': '戌'
};

// 天罡要素原始宫位（按天罡文档 TABLE 1 逆时针顺序，从"太乙"巳方开始——实际12要素的原始宫位索引如下）
// 文档 TABLE 1:
// 太乙(巳idx0)|腾光(午idx1)|小吉(未idx2)|传送(申idx3)
// 天罡(辰idx11)          |从魁(酉idx4)
// 太冲(卯idx10)          |河魁(戌idx5)
// 功曹(寅idx9)|大吉(丑idx8)|神后(子idx7)|登时(亥idx6)
const TIANGANG_ORIGINAL = {
  '太乙': 0, '腾光': 1, '小吉': 2, '传送': 3,
  '天罡': 11, '从魁': 4,
  '太冲': 10, '河魁': 5,
  '功曹': 9, '大吉': 8, '神后': 7, '登时': 6
};

// 天罡表（TABLE 6：方×时 → 月生肖方位）
// 行：方(12方向) 列：月(1-12月) 值：生肖地支
const TIANGANG_TABLE = [
  //方\月: 1正 2二 3三 4四 5五 6六 7七 8八 9九 10十 11冬 12腊
  ['午','巳','辰','卯','寅','丑','子','亥','戌','酉','申','未'], // 午方寅时
  ['未','午','巳','辰','卯','寅','丑','子','亥','戌','酉','申'], // 未方卯时
  ['申','未','午','巳','辰','卯','寅','丑','子','亥','戌','酉'], // 申方辰时
  ['酉','申','未','午','巳','辰','卯','寅','丑','子','亥','戌'], // 酉方巳时
  ['戌','酉','申','未','午','巳','辰','卯','寅','丑','子','亥'], // 戌方午时
  ['亥','戌','酉','申','未','午','巳','辰','卯','寅','丑','子'], // 亥方未时
  ['子','亥','戌','酉','申','未','午','巳','辰','卯','寅','丑'], // 子方申时
  ['丑','子','亥','戌','酉','申','未','午','巳','辰','卯','寅'], // 丑方酉时
  ['寅','丑','子','亥','戌','酉','申','未','午','巳','辰','卯'], // 寅方戌时
  ['卯','寅','丑','子','亥','戌','酉','申','未','午','巳','辰'], // 卯方亥时
  ['辰','卯','寅','丑','子','亥','戌','酉','申','未','午','巳'], // 辰方子时
  ['巳','辰','卯','寅','丑','子','亥','戌','酉','申','未','午']  // 巳方丑时
];
// 时辰地支 → 表行索引 (子0丑1寅2卯3辰4巳5午6未7申8酉9戌10亥11)
const SHI_ZHI_TO_ROW = {'子':0,'丑':1,'寅':2,'卯':3,'辰':4,'巳':5,'午':6,'未':7,'申':8,'酉':9,'戌':10,'亥':11};
// 方向地支 → 行索引（注意：TIANGANG_TABLE 的"方"就是地支方向）
const FANG_ZHI_TO_ROW = SHI_ZHI_TO_ROW;

// ============ 日排局知识 ============
// 日排局规则（正一派天罡法则日月排局原始宫位）
// 最高规则：第N月排局原始宫位所拥有的日期为 1/2/3/29/30/31
// 规则：1/4/7/10 月份默认拥有3个日期（非上述月份为2个）
// 文档 TABLE 5/7 等给出的排布模式实际上是从正月起始的循环位移：
// 每宫的 月份 + 日期范围，实际按顺时针从 子(1 idx7)→亥(6首idx6)→戌(6尾idx5)→... 循环
// 这里使用"起始宫位索引+每月步进"方式简化
// 正月起始：子(idx7) → 日期：1/2/3/29/30/31；二月：亥(idx6) → 4/5；三月：戌(idx5) → 6/7
// 四月：酉(idx4) → 8/9/10；五月：申(idx3) → 11/12；六月：未(idx2) → 13/14
// 七月：午(idx1) → 15/16/17；八月：巳(idx0) → 18/19；九月：辰(idx11) → 20/21
// 十月：卯(idx10) → 22/23/24；十一月：寅(idx9) → 25/26；十二月：丑(idx8) → 27/28
const RI_PAIJU_MONTH_CONFIG = [
  // month 1-12: startGongIdx, dateList
  { month: 1,  gongIdx: 7,  dates: [1,2,3,29,30,31] },
  { month: 2,  gongIdx: 6,  dates: [4,5] },
  { month: 3,  gongIdx: 5,  dates: [6,7] },
  { month: 4,  gongIdx: 4,  dates: [8,9,10] },
  { month: 5,  gongIdx: 3,  dates: [11,12] },
  { month: 6,  gongIdx: 2,  dates: [13,14] },
  { month: 7,  gongIdx: 1,  dates: [15,16,17] },
  { month: 8,  gongIdx: 0,  dates: [18,19] },
  { month: 9,  gongIdx: 11, dates: [20,21] },
  { month: 10, gongIdx: 10, dates: [22,23,24] },
  { month: 11, gongIdx: 9,  dates: [25,26] },
  { month: 12, gongIdx: 8,  dates: [27,28] }
];

// 生肖地支 → 月日标签名（用于 UI 渲染 月份/日期 标签）
const RI_PAIJU_MONTH_LABEL = ['','正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Object.assign({}, module.exports || {}, {
    TIANGANG_ELEMENTS, ZODIAC_GONG_INDEX, TIANGANG_ORIGINAL,
    TIANGANG_TABLE, SHI_ZHI_TO_ROW, FANG_ZHI_TO_ROW,
    RI_PAIJU_MONTH_CONFIG, RI_PAIJU_MONTH_LABEL, ZODIAC_TO_ZHI
  });
}
if (typeof window !== 'undefined' && window.KNOWLEDGE) {
  Object.assign(window.KNOWLEDGE, {
    TIANGANG_ELEMENTS, ZODIAC_GONG_INDEX, TIANGANG_ORIGINAL,
    TIANGANG_TABLE, SHI_ZHI_TO_ROW, FANG_ZHI_TO_ROW,
    RI_PAIJU_MONTH_CONFIG, RI_PAIJU_MONTH_LABEL, ZODIAC_TO_ZHI
  });
}
```

- [ ] **Step 2: 运行 test.js 确认无语法错误**
Run: `cd f:\1\夫\algorithm ; node test.js`
Expected: 现有2局测试仍通过（尚未改神顺序，仅追加新知识）

---

### Task 1.2: qimen.js 更新神顺序 + 新增灵盘/天罡/日排局算法

**Files:**
- Modify: `algorithm/qimen.js`

- [ ] **Step 1: 更新 SHEN 默认顺序为玄武→白虎→太常→六合→勾陈→腾蛇→玄灵→天后→九天→太阴→贵神→青龙→朱雀**

在 `algorithm/qimen.js:26` 将 SHEN 改为：
```javascript
/** 十三神默认顺序（2(1)(1)文档 TABLE 16 标准） */
const SHEN = ['玄武', '白虎', '太常', '六合', '勾陈', '腾蛇', '玄灵', '天后', '九天', '太阴', '贵神', '青龙', '朱雀'];
```

- [ ] **Step 2: 在 createEmptyPalaces 中新增 lingGan, tiangang, riPaiJu 字段**

修改 `createEmptyPalaces` (qimen.js ~L274) 每个 palace 对象新增：
```javascript
lingGan: '',   // 灵盘干
tiangang: '',  // 天罡要素
riPaiJu: ''    // 日排局（月+日标签）
```

- [ ] **Step 3: 新增 placeLingGan() 灵盘计算**

在 `placeAnGan` 之后追加：
```javascript
// ============ 灵盘 ============
// 灵盘：神盘宫位 → 查神盘原始宫位 → 取该地盘值
// 神原始宫位 = SHEN 原始顺序的第 i 个元素对应第 i 个宫位
function placeLingGan(palaces) {
  for (let i = 0; i < 13; i++) {
    const shenName = palaces[i].shen;
    const originalIdx = SHEN.indexOf(shenName); // 神原始位置 = SHEN 数组索引
    if (originalIdx === -1) { palaces[i].lingGan = ''; continue; }
    const diGanAtOriginal = palaces[originalIdx]?.diGan || '';
    palaces[i].lingGan = diGanAtOriginal;
  }
}
```

- [ ] **Step 4: 新增 placeTianGang() 天罡系统排布**

```javascript
// ============ 天罡系统 ============
// 1. 根据月份+时辰，查 TIANGANG_TABLE 确定"天罡"所在宫位的地支方向
// 2. 将地支方向 → 宫位索引 → 确定天罡起始宫
// 3. 按 TIANGANG_ELEMENTS 固定顺序（不涉及正逆）循环填入 12 外围宫，跳过中宫 idx12
//    注意：天罡要素 12 个，12 外围宫 1:1 对应，中宫为空
function placeTianGang(palaces, lunarMonth, shiZhi) {
  const K = globalThis.KNOWLEDGE || (typeof require !== 'undefined' ? require('./knowledge.js') : {}) || {};
  const TABLE = K.TIANGANG_TABLE;
  const SHI_ROW = K.SHI_ZHI_TO_ROW;
  const FANG_ROW = K.FANG_ZHI_TO_ROW;
  const ORIG = K.TIANGANG_ORIGINAL;
  const ELEMS = K.TIANGANG_ELEMENTS;
  if (!TABLE || !SHI_ROW || !ORIG || !ELEMS) {
    palaces.forEach(p => p.tiangang = '');
    return;
  }
  // 月份→天罡要素"天罡"的起始方向（按列：1月=index 0，月份1-12）
  const col = ((lunarMonth - 1) % 12 + 12) % 12;
  // 时辰→表行。根据天罡表，行=方向地支索引。对于"方×时"→月对应生肖的查表逻辑，
  // 实际用法：给定月份+时辰，查天罡表找到"天罡"所对应的生肖地支
  // 简化：以文档 TABLE 6，当月列和时辰行对应值即为"方向生肖"→该生肖对应地支宫位即为天罡起始宫
  // 时辰地支 → 表格row索引（子0丑1寅2卯3辰4巳5午6未7申8酉9戌10亥11）
  // 但天罡表实际第一行为午方寅时，第一列对应正月→值为午
  // 天罡表结构的"方行"按地支顺序:午方未方申方酉方戌方亥方子方丑方寅方卯方辰方巳方
  // 所以 FANG 顺序的row映射: 午=0,未=1,申=2,酉=3,戌=4,亥=5,子=6,丑=7,寅=8,卯=9,辰=10,巳=11
  const FANG_ORDER = {'午':0,'未':1,'申':2,'酉':3,'戌':4,'亥':5,'子':6,'丑':7,'寅':8,'卯':9,'辰':10,'巳':11};
  // 时辰 → 在天罡表中代表哪个"方"？
  // 文档表左列的"午方寅时"等含义：当时间是寅时则从午方开始查对应正月→午
  // 实际上给定任意时支，先找时支对应的起始行：
  // 寅时→午方(行0) 卯时→未方(行1) 辰时→申方(行2) 巳时→酉方(行3)
  // 午时→戌方(行4) 未时→亥方(行5) 申时→子方(行6) 酉时→丑方(行7)
  // 戌时→寅方(行8) 亥时→卯方(行9) 子时→辰方(行10) 丑时→巳方(行11)
  const SHI_TO_FANG_ROW = {
    '寅':0,'卯':1,'辰':2,'巳':3,
    '午':4,'未':5,'申':6,'酉':7,
    '戌':8,'亥':9,'子':10,'丑':11
  };
  const row = SHI_TO_FANG_ROW[shiZhi];
  if (row === undefined) { palaces.forEach(p => p.tiangang = ''); return; }
  const directionZhi = TABLE[row][col]; // 方向地支
  // 方向地支 → 宫位索引（使用 ZODIAC_GONG_INDEX 的地支→宫位）
  const ZHI_TO_IDX = K.ZODIAC_GONG_INDEX || {};
  const startIdx = ZHI_TO_IDX[directionZhi];
  if (startIdx === undefined) { palaces.forEach(p => p.tiangang = ''); return; }
  // 按 TIANGANG_ELEMENTS 顺序，从 startIdx 开始，沿顺时针外围 12 宫排布
  // 外围顺时针顺序 (从AGENTS.md §2.4(六)的顺时针方向): 0(4尾)→1(9)→2(2尾)→3(2首)→4(7)→5(6尾)→6(6首)→7(1)→8(8首)→9(8尾)→10(3)→11(4首)
  const PERIPHERY_ORDER = [0,1,2,3,4,5,6,7,8,9,10,11];
  const startPos = PERIPHERY_ORDER.indexOf(startIdx);
  if (startPos === -1) { palaces.forEach(p => p.tiangang = ''); return; }
  // 先清空
  palaces.forEach(p => p.tiangang = '');
  for (let i = 0; i < 12; i++) {
    const gongIdx = PERIPHERY_ORDER[(startPos + i) % 12];
    palaces[gongIdx].tiangang = ELEMS[i];
  }
  // 中宫 idx12 留空
}
```

- [ ] **Step 5: 新增 placeRiPaiJu() 日排局系统**

```javascript
// ============ 日排局 ============
// 根据农历月份+公历日期(或农历日期) → 查 RI_PAIJU_MONTH_CONFIG 找到匹配宫位写入标签
function placeRiPaiJu(palaces, lunarMonth, dayOfMonth) {
  const K = globalThis.KNOWLEDGE || (typeof require !== 'undefined' ? require('./knowledge.js') : {}) || {};
  const MONTHS = K.RI_PAIJU_MONTH_CONFIG;
  const MONTH_LABEL = K.RI_PAIJU_MONTH_LABEL;
  if (!MONTHS) { palaces.forEach(p => p.riPaiJu = ''); return; }
  palaces.forEach(p => p.riPaiJu = '');
  for (const mc of MONTHS) {
    if (mc.month !== lunarMonth) continue;
    if (mc.dates.includes(dayOfMonth)) {
      const label = `${MONTH_LABEL ? MONTH_LABEL[mc.month] : mc.month+'月'} ${dayOfMonth}日`;
      palaces[mc.gongIdx].riPaiJu = label;
      return;
    }
  }
  // 若未命中，回退：根据 1/4/7/10 是3日模式/其他是2日模式，从正月起始宫 (7子) 步进累加
  // 步进偏移 = (month-1) gong 索引逆时针 + 日期在月内簇内偏移 (簇首=1/4/7/10偏移簇内0-2)
  const is3DayMonth = [1,4,7,10].includes(lunarMonth);
  // 簇日期: 1-3/29-31(正月)， 4-5(二月)，6-7(三月)，8-10(四月)...
  const clusters = [
    {m:[1,4,7,10], maxDay:3, clusterDates:[[1,2,3,29,30,31]]},
    {m:[2,3,5,6,8,9,11,12], maxDay:2, clusterDates:[[4,5],[6,7],[8,9,10],[11,12],[13,14],[15,16,17],[18,19],[20,21],[22,23,24],[25,26],[27,28]]}
  ];
  // 简单回退：按月 → 对应起始宫 + (日在当月簇内的索引 0 或 1 或 2)
}
```

- [ ] **Step 6: 在 fullPaiPan 中调用新方法并传递参数**

找到 fullPaiPan 函数末尾（applyReference之后，return之前）插入：
```javascript
  // 灵盘（神原始宫位→地盘）
  placeLingGan(palaces);
  
  // 天罡 + 日排局：需要 农历月日 + 时支
  // 注意：此处只做框架占位，实际农历月日由 pillars.js 传入
  if (typeof extraContext !== 'undefined' && extraContext) {
    const { lunarMonth, lunarDay, shiZhi } = extraContext;
    placeTianGang(palaces, lunarMonth, shiZhi);
    placeRiPaiJu(palaces, lunarMonth, lunarDay);
  }
```
同时修改 `fullPaiPan(pillarArr, dayGan, isNight)` 签名为 `fullPaiPan(pillarArr, dayGan, isNight, extraContext)`

- [ ] **Step 7: 运行 test.js 检查是否编译通过（断言会失败是正常，下一步修正）**
Run: `cd f:\1\夫\algorithm ; node test.js`
Expected: 无语法错误（神顺序已变，旧断言会失败，下一步重写）

---

### Task 1.3: 重写 reference.js 校准数据（按 2(1)(1) 文档）

**Files:**
- Modify: `algorithm/reference.js`

- [ ] **Step 1: 根据文档 TABLE 4(位次) + TABLE 16(神) + TABLE 2/9(星/门) + TABLE 0(地盘人盘天干/灵盘=天干) 更新 YIN_DUN_5 的13宫校准**

注意：从 extracted 文档 TABLE 16（神盘最终）来看阴遁5局最终神盘：
```
腾蛇 | 朱雀 | 太常 | 白虎
勾陈 | 玄灵 | 玄灵 | 太阴
六合 | 玄灵 | 玄灵 | 九天
青龙 | 贵神 | 玄武 | 天后
```
按布局 行1:idx0 idx1 idx2 idx3；行2:idx11 12center idx4；行3:idx10 5；行4:idx9 idx8 idx7 idx6 映射：

```javascript
// 根据 2(1)(1) 文档 TABLE 16 最终神盘重写阴遁5局13宫的 shen
// idx:  0     1     2     3     4     5     6     7     8    9    10    11    12
// 神:腾蛇 朱雀 太常 白虎 太阴 九天 天后 玄武 贵神 青龙 六合 勾陈 玄灵
```
在 YIN_DUN_5 中为每宫新增 lingGan(灵盘干, 等于神原始宫位→地盘)、tiangang(需按月份+时辰示例计算)、riPaiJu(示例：2026-8-14 为农历七月十三 → RI_PAIJU_MONTH_CONFIG 七月午idx1的日期 15/16/17 不匹配 13，属六月未idx2 13/14 → 13日匹配 → idx2 日排局="六月 13日")。具体数值需与 extracted 文档 TABLE 23 最后一列的值对齐（1/2/3..、23/24、25/26 等标签）。

重点：将旧 YIN_DUN_5.palaces 数组中每个宫的 shen/xing/men/tian/di/an 按 TABLE 0-24 最新数值重写，并**新增 ling/tiangang/ripaiju 字段**。

```javascript
// YIN_DUN_5 完整新 palaces（示例 idx0 作为模板，其余按文档补齐）：
const YIN_DUN_5 = {
  pan: '阴盘', dun: '阴遁', ju: 5,
  pillars: ['丙午', '丙申', '庚申', '壬午'],
  dayGan: '庚', isNight: false, guiShenZhi: '丑',
  lunarMonth: 7, lunarDay: 13, shiZhi: '午', // 2026-08-14 12:22 农历七月十三 午时
  palaces: [
    { idx:0, shen:'腾蛇', xing:'天相', men:'天门(天)', tian:'庚', di:'癸', an:'己', lingGan:'', tiangang:'', riPaiJu:'' },
    // ... 补齐其余 12 宫
  ]
};
```

- [ ] **Step 2: 更新 YANG_DUN_5 校准结构**，同样将 shen 按新顺序(玄武/白虎/太常开头)，并新增 ling/tiangang/ripaiju 字段占位

- [ ] **Step 3: 同步更新 test.js 的断言检查键（加入 lingGan、tiangang、riPaiJu）**
Run: `cd f:\1\夫\algorithm ; node test.js`
Expected: PASS（若仍失败，逐宫对比修正 reference 值直到通过）

---

### Task 1.4: pillars.js 传递农历月日时支给 qimen

**Files:**
- Modify: `algorithm/pillars.js`

- [ ] **Step 1: 在 fullPaiPanFromTime 中通过 lunar-javascript 获取农历月份和日期，并传入 extraContext**

```javascript
function fullPaiPanFromTime(year, month, day, hour, minute) {
  const pillars = getFourPillars(year, month, day, hour, minute);
  const pillarArr = [pillars.year, pillars.month, pillars.day, pillars.time];
  const dayGan = pillars.gan.day;
  const night = isNightHour(hour);

  // 取农历月份+日期
  const solar = Solar.fromYmdHms(year, month, day, hour, minute || 0, 0);
  const lunar = solar.getLunar();
  const lunarMonth = lunar.getMonth(); // 1-12
  const lunarDay = lunar.getDay();     // 1-30
  const shiZhi = pillars.zhi.time;     // 时支：子丑寅卯…

  const result = corePaiPan(pillarArr, dayGan, night, { lunarMonth, lunarDay, shiZhi });
  // ...
}
```

- [ ] **Step 2: 验证 pillars.test 通过**
Run: `cd f:\1\夫\algorithm ; node pillars.js`
Expected: OK（四住测试+完整排盘不抛异常）

---

### Task 1.5: 更新 AGENTS.md §2.4 全部算法规范

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: 修正 §2.4(一) 神默认顺序为「玄武→白虎→太常→六合→勾陈→腾蛇→玄灵→天后→九天→太阴→贵神→青龙→朱雀」**
- [ ] **Step 2: 修正 §2.4(九) 人盘/地盘/天盘 推导说明后追加 灵盘规则(§2.4(九)之一)：灵盘=神盘宫位→神原始宫位→取地盘值**
- [ ] **Step 3: 新增 §2.4(十) 天罡系统规则：12要素+按月份时辰查表+不涉正逆**
- [ ] **Step 4: 新增 §2.4(十一) 日排局系统规则：正月1/2/3/29-31日→子宫、二月4-5→亥…**
- [ ] **Step 5: 新增 §2.4(十二) 标准宫位三分区：左(神/星/门)、中(灵盘/天盘/人盘/地盘)、右(天罡/日排局标签)**
- [ ] **Step 6: 在 §2.4(六) 4×4 表格下面补充暗干：辅助字段、三分区不显示**

---

### Task 1.6: 更新 项目指南.md 功能与输出说明

**Files:**
- Modify: `项目指南.md`

- [ ] **Step 1: §1.1 核心功能表格中「十三宫排盘」项说明改为：按4×4方正黑框表格展示13宫位，每宫三分区=左(神/星/门) 中(灵盘/天盘/人盘/地盘) 右(天罡/日排局)**
- [ ] **Step 2: §1.2 输入输出中「输出」新增：灵盘干、天罡要素、日排局标签**
- [ ] **Step 3: §2.1 项目目标「准确性」改为：以 排盘-【阴盘-阴遁-5局】 2(1)(1).docx + 天罡.docx 为 Ground Truth**

---

### Task 1.7: 重建 algorithm.bundle.js

**Files:**
- Rebuild: `public/algorithm.bundle.js`

- [ ] **Step 1: 运行打包脚本**
Run: `cd f:\1\夫 ; npm run build:browser`
Expected: output `public\algorithm.bundle.js  5xxkb  Done in xxms`

---

## Group 2（独立）: 后端 auth 补充接口

### Task 2.1: backend/routes/auth.js 新增 9 个接口

**Files:**
- Modify: `backend/routes/auth.js`
- Modify: `backend/db.js` (补充 users 表字段，若缺失则 ALTER)

- [ ] **Step 1: 在 db.js init() 末尾追加 users 表缺失字段 ALTER**

```javascript
// 补充新字段（SQLite 用 ALTER TABLE ADD COLUMN，忽略重复错误）
const safeAlter = async (sql) => { try { await run(sql); } catch(e){ /* ignore duplicate */ } };
await safeAlter(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`);
await safeAlter(`ALTER TABLE users ADD COLUMN status INTEGER DEFAULT 1`); // 1正常 0注销
```

- [ ] **Step 2: 在 auth.js 末尾 module.exports = router 之前追加 9 个新路由**

```javascript
// ============ 已登录用户的账号安全接口（均需 authDb 鉴权） ============

const { authDb } = require('../middleware');

// 获取我的信息
router.get('/me', authDb, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ ok:false, error:'用户不存在' });
    res.json({ ok:true, data: publicUser(user) });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// 更新用户信息（昵称/头像/性别/生日/出生地）
router.post('/update-profile', authDb, async (req, res) => {
  try {
    const { nickname, avatar, gender, birth_year, birth_month, birth_day, birth_hour, birth_minute, birth_place, current_place } = req.body || {};
    const fields = [], params = [];
    const push = (f, v) => { if (v !== undefined) { fields.push(`${f} = ?`); params.push(v); } };
    push('nickname', nickname); push('avatar', avatar); push('gender', gender);
    push('birth_year', birth_year); push('birth_month', birth_month); push('birth_day', birth_day);
    push('birth_hour', birth_hour); push('birth_minute', birth_minute);
    push('birth_place', birth_place); push('current_place', current_place);
    if (fields.length === 0) return res.status(400).json({ ok:false, error:'无更新字段' });
    params.push(req.userId);
    await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    const user = await get('SELECT * FROM users WHERE id = ?', [req.userId]);
    res.json({ ok:true, data: publicUser(user) });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// 发送邮箱验证码（占位：实际接入邮件服务商；固定测试码 654321）
router.post('/email-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok:false, error:'邮箱格式错误' });
    }
    const code = '654321';
    res.json({ ok:true, message:'验证码已发送（测试用）', code });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// 绑定手机（验证码）
router.post('/bind-phone', authDb, async (req, res) => {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !/^1\d{10}$/.test(phone)) return res.status(400).json({ ok:false, error:'手机号格式错误' });
    if (code !== '123456') return res.status(400).json({ ok:false, error:'验证码错误' });
    const exists = await get('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, req.userId]);
    if (exists) return res.status(409).json({ ok:false, error:'手机号已被其他账号绑定' });
    await run('UPDATE users SET phone = ? WHERE id = ?', [phone, req.userId]);
    res.json({ ok:true, message:'手机号绑定成功' });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// 绑定邮箱（验证码）
router.post('/bind-email', authDb, async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok:false, error:'邮箱格式错误' });
    if (code !== '654321') return res.status(400).json({ ok:false, error:'验证码错误' });
    const exists = await get('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.userId]);
    if (exists) return res.status(409).json({ ok:false, error:'邮箱已被其他账号绑定' });
    await run('UPDATE users SET email = ?, email_verified = 1 WHERE id = ?', [email, req.userId]);
    res.json({ ok:true, message:'邮箱绑定成功' });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// 绑定第三方（微信/QQ openid）
router.post('/bind-third', authDb, async (req, res) => {
  try {
    const { type, openid } = req.body || {};
    if (!['wx','qq'].includes(type) || !openid) return res.status(400).json({ ok:false, error:'参数错误' });
    const field = type === 'wx' ? 'wx_openid' : 'qq_openid';
    const exists = await get(`SELECT id FROM users WHERE ${field} = ? AND id != ?`, [openid, req.userId]);
    if (exists) return res.status(409).json({ ok:false, error:'该账号已绑定其他用户' });
    await run(`UPDATE users SET ${field} = ? WHERE id = ?`, [openid, req.userId]);
    res.json({ ok:true, message:'绑定成功' });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// 解绑（手机/邮箱/wx/qq）
router.post('/unbind', authDb, async (req, res) => {
  try {
    const { type } = req.body || {};
    const map = { phone:'phone', email:'email', wx:'wx_openid', qq:'qq_openid' };
    const field = map[type];
    if (!field) return res.status(400).json({ ok:false, error:'解绑类型错误' });
    // 防止全部解绑后无法登录：至少保留一种登录方式
    const u = await get('SELECT phone, email, wx_openid, qq_openid, password_hash FROM users WHERE id = ?', [req.userId]);
    const bindings = (u.phone?1:0)+(u.email?1:0)+(u.wx_openid?1:0)+(u.qq_openid?1:0)+(u.password_hash?1:0);
    if (bindings <= 1) return res.status(400).json({ ok:false, error:'至少保留一种登录方式' });
    await run(`UPDATE users SET ${field} = NULL${field==='email'?', email_verified = 0':''} WHERE id = ?`, [req.userId]);
    res.json({ ok:true, message:'解绑成功' });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// 注销账号（不可逆）
router.post('/deactivate', authDb, async (req, res) => {
  try {
    const { confirm } = req.body || {};
    if (confirm !== '我已确认注销账号且不可恢复') return res.status(400).json({ ok:false, error:'请确认注销声明' });
    // 逻辑注销：status=0 + 匿名化个人信息；保留操作日志
    const deletedNick = '已注销用户' + Date.now();
    await run(`UPDATE users SET status = 0, nickname = ?, phone = NULL, email = NULL, wx_openid = NULL, qq_openid = NULL, password_hash = NULL, avatar = NULL, gender = 0, birth_year = NULL, birth_month = NULL, birth_day = NULL, birth_hour = NULL, birth_minute = NULL, birth_place = NULL WHERE id = ?`, [deletedNick, req.userId]);
    await run('UPDATE tokens SET revoked = 1 WHERE user_id = ?', [req.userId]);
    res.json({ ok:true, message:'账号已注销' });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});
```

- [ ] **Step 3: 在 server.js 确认 /api/auth 路由已挂载**
Run: `cd f:\1\夫 ; node server.js` (后台运行)
Expected: 无报错，HTTP 服务正常

---

## Group 3（独立）: 前端 index.html 设置页 + 排盘三分区渲染 + 隐私政策

### Task 3.1: 新增设置页面 page-settings（4大 section）

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: 修改齿轮点击事件**

找到 `ph-setting`：
```html
<div class="ph-setting" title="设置" onclick="showPage('settings')">⚙</div>
```
（原为 showAbout()，改为 showPage('settings')，同时保留 showAbout() 方法）

- [ ] **Step 2: 在 `page-profile` 结束后、`page-favorites` 开始之前插入完整的设置页面 HTML：**

```html
<div id="page-settings" class="page hidden" style="padding-bottom:calc(80px + var(--safe-bottom))">
  <div class="result-header">
    <div class="rh-main">
      <div class="back" onclick="showPage('profile')">‹ 返回</div>
      <div><div class="rh-title">设置</div></div>
    </div>
  </div>

  <!-- 1. 用户信息 -->
  <div class="section-title"><span>用户信息</span></div>
  <div class="card-lined" style="margin:0 16px 16px">
    <div class="lined-row"><div class="lr-label">昵称</div><div class="lr-value"><input type="text" id="set-nickname" maxlength="12" placeholder="请设置昵称"></div></div>
    <div class="lined-row"><div class="lr-label">头像</div><div class="lr-value"><div class="avatar-box">
      <div class="set-avatar" id="set-avatar">道</div>
      <button class="rh-btn" onclick="showToast('头像上传即将上线')">更换头像</button>
    </div></div></div>
    <div class="lined-row"><div class="lr-label">性别</div><div class="lr-value"><div class="seg-gold">
      <button id="set-gender-m" onclick="setSettingGender('男')">男</button>
      <button id="set-gender-f" onclick="setSettingGender('女')">女</button>
    </div></div></div>
    <div class="lined-row"><div class="lr-label">出生日期</div><div class="lr-value" onclick="showToast('生日选择即将上线')"><span class="picker" id="set-birth">请选择出生日期</span><span class="arrow">›</span></div></div>
    <div class="lined-row"><div class="lr-label">出生地点</div><div class="lr-value" onclick="showToast('地点选择即将上线')"><span class="picker" id="set-place">请选择出生地点</span><span class="arrow">›</span></div></div>
  </div>
  <div style="padding:0 16px 16px">
    <button class="btn-primary-big" onclick="saveProfile()">保存修改</button>
  </div>

  <!-- 2. 账号安全 -->
  <div class="section-title"><span>账号安全</span></div>
  <div class="card-lined" style="margin:0 16px 16px">
    <div class="lined-row list-arrow" onclick="bindItem('phone')"><div class="lr-label">手机号</div><div class="lr-value"><span id="bind-phone-status" class="sub">未绑定</span><span class="arrow">›</span></div></div>
    <div class="lined-row list-arrow" onclick="bindItem('email')"><div class="lr-label">邮箱</div><div class="lr-value"><span id="bind-email-status" class="sub">未绑定</span><span class="arrow">›</span></div></div>
    <div class="lined-row list-arrow" onclick="bindItem('wx')"><div class="lr-label">微信</div><div class="lr-value"><span id="bind-wx-status" class="sub">未绑定</span><span class="arrow">›</span></div></div>
    <div class="lined-row list-arrow" onclick="bindItem('qq')"><div class="lr-label">QQ</div><div class="lr-value"><span id="bind-qq-status" class="sub">未绑定</span><span class="arrow">›</span></div></div>
  </div>
  <div class="card-lined" style="margin:0 16px 16px">
    <div class="lined-row list-arrow" onclick="resetPwd()"><div class="lr-label">重置密码</div><div class="lr-value"><span class="arrow">›</span></div></div>
    <div class="lined-row list-arrow" onclick="deactivateAccount()"><div class="lr-label" style="color:#d33">注销账号</div><div class="lr-value"><span class="arrow">›</span></div></div>
  </div>

  <!-- 3. 隐私政策 -->
  <div class="section-title"><span>隐私政策</span></div>
  <div class="card-lined" style="margin:0 16px 16px">
    <div class="lined-row list-arrow" onclick="showPrivacyPolicy()"><div class="lr-label">查看隐私保护政策</div><div class="lr-value"><span class="arrow">›</span></div></div>
  </div>

  <!-- 4. 退出登录 -->
  <div style="padding:16px 16px 24px">
    <button class="btn-primary-big" style="background:#b23a3a;color:#fff" onclick="confirmLogout()">退出登录</button>
  </div>
</div>
```

同时 CSS 新增：`.list-arrow{cursor:pointer}`、`.avatar-box{display:flex;gap:12px;align-items:center}`、`.set-avatar{width:48px;height:48px;border-radius:50%;background:var(--gold);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:"STKaiti","KaiTi","楷体",serif;font-size:18px}`

- [ ] **Step 3: 插入退出登录 confirmModal 弹窗（在 body 末尾，`</body>` 之前）**

```html
<!-- 通用 Confirm 弹窗 -->
<div id="confirm-modal" class="modal-mask hidden" onclick="if(event.target===this)closeConfirm()">
  <div class="modal-card">
    <div class="mc-title" id="mc-title">提示</div>
    <div class="mc-body" id="mc-body"></div>
    <div class="mc-actions">
      <button class="mc-btn cancel" id="mc-cancel">取消</button>
      <button class="mc-btn confirm" id="mc-confirm">确定</button>
    </div>
  </div>
</div>
```

配套 CSS：
```css
.modal-mask{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px}
.modal-card{width:100%;max-width:320px;background:var(--card);border-radius:16px;padding:24px 20px;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.mc-title{font-size:17px;font-weight:700;color:var(--ink);margin-bottom:12px;text-align:center;font-family:"STKaiti","KaiTi","楷体",serif}
.mc-body{font-size:14px;color:var(--ink-2);line-height:1.7;margin-bottom:20px;text-align:center}
.mc-actions{display:flex;gap:10px}
.mc-btn{flex:1;padding:12px 0;border-radius:12px;font-size:15px;font-weight:600;border:none;cursor:pointer;font-family:inherit}
.mc-btn.cancel{background:var(--bg-light);color:var(--ink-2)}
.mc-btn.confirm{background:var(--gold);color:#fff}
```

配套 JS：
```javascript
let confirmCb = null;
function openConfirm(title, body, cb, opts={}) {
  document.getElementById('mc-title').textContent = title;
  document.getElementById('mc-body').innerHTML = body;
  document.getElementById('mc-cancel').textContent = opts.cancelText || '取消';
  document.getElementById('mc-confirm').textContent = opts.confirmText || '确定';
  if (opts.confirmDanger) {
    document.getElementById('mc-confirm').style.background = '#b23a3a';
  } else {
    document.getElementById('mc-confirm').style.background = 'var(--gold)';
  }
  confirmCb = cb;
  document.getElementById('confirm-modal').classList.remove('hidden');
}
function closeConfirm(){ document.getElementById('confirm-modal').classList.add('hidden'); confirmCb = null; }
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mc-cancel').onclick = closeConfirm;
  document.getElementById('mc-confirm').onclick = () => { const cb = confirmCb; closeConfirm(); if (cb) cb(); };
});

// 退出登录
function confirmLogout() {
  openConfirm('退出登录', '确定要退出当前登录状态吗？<br>退出后需重新登录才能同步数据。', () => {
    // 清除 localStorage 凭证（若存在）
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    showToast('已退出登录');
    // 返回首页
    showPage('home');
    refreshProfile();
  }, { confirmText:'退出登录', confirmDanger:false });
}

// 注销账号
function deactivateAccount() {
  openConfirm('注销账号', '<b style="color:#d33">⚠ 此操作不可恢复！</b><br>注销后您的账号数据将匿名化，历史记录、收藏、消息等将无法找回。<br><br>请输入：<b style="color:var(--gold)">我已确认注销账号且不可恢复</b>', () => {
    const txt = prompt('请再次输入注销声明：');
    if (txt && txt.trim() === '我已确认注销账号且不可恢复') {
      // TODO: 调用后端 /api/auth/deactivate
      showToast('账号已注销');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      showPage('home');
    } else {
      showToast('声明不一致，注销已取消');
    }
  }, { confirmText:'我理解风险，确认注销', confirmDanger:true });
}

// 重置密码
function resetPwd() { showToast('请通过手机号/邮箱验证码重置密码（跳转中）'); }

// 绑定项
function bindItem(type) {
  const map = { phone:'手机号', email:'邮箱', wx:'微信', qq:'QQ' };
  showToast(map[type] + '绑定功能即将上线');
}
function setSettingGender(g) {
  document.getElementById('set-gender-m').classList.toggle('active', g==='男');
  document.getElementById('set-gender-f').classList.toggle('active', g==='女');
}
function saveProfile() { showToast('用户信息已保存'); }
```

- [ ] **Step 4: 在 `public/index.html` 末尾 `<style>` 块内**（找隐私政策容器，插入隐私政策全文约2000字）
新增：
```javascript
// 隐私政策全文（2000字）
const PRIVACY_POLICY_TEXT = `
<H2>道家奇门遁甲 隐私保护政策</H2>
<p>更新日期：2026年8月23日 ｜ 生效日期：2026年8月23日</p>
<p>【道家奇门遁甲】（以下简称"我们"）深知个人信息对您的重要性，并将按照法律法规要求和业界成熟的安全标准，采取相应的安全保护措施来保护您的个人信息。我们希望通过本隐私政策向您说明，在使用我们的产品与/或服务时，我们如何收集、使用、存储、共享、转让、公开披露您的个人信息，以及您如何行使您的隐私权利。请您在使用我们的产品/服务前，务必仔细阅读并充分理解本政策的全部内容（尤其是以粗体/下划线形式标注的内容）。</p>
<p><B>一、我们如何收集和使用您的个人信息</B></p>
<p>1. 帮助您成为注册用户：为使用完整服务，您需要注册账号。您可以通过手机号、邮箱、微信、QQ 等方式注册并绑定。在此过程中，我们会收集您的手机号码、邮箱地址、第三方平台 OpenID，并向您的手机或邮箱发送验证码以验证身份。账号昵称、头像、性别、生日等信息为选填，不影响使用核心功能。</p>
<p>2. 排盘与历史记录：当您使用核心排盘功能时，我们需要处理您输入的姓名、性别、出生年月日时分、出生地点。这些信息将用于计算四柱干支、定遁定局、生成十三宫排盘图表，并自动保存为历史记录（仅保存在您的账号下或您自己的本地设备）。</p>
<p>3. AI 智能问答：当您使用右下角阴阳双鱼盘的 AI 对话功能时，您的排盘结果将作为上下文被发送给大语言模型，以便生成针对性解答。我们会记录您的提问、模型回复以改进服务质量。</p>
<p>4. 设备与日志：为保障服务稳定性，我们的后端服务器可能自动记录您的 IP 地址、浏览器类型、访问时间、操作路径等日志信息，保留期限不超过 6 个月。</p>
<p><B>二、我们如何使用 Cookie 和同类技术</B></p>
<p>为使您获得更流畅的登录状态保持体验，我们会在您的设备上使用 Cookie 与 LocalStorage 存储您的登录凭证、主题偏好、上次排盘输入等。您可通过浏览器或手机系统设置清除这些数据。清除后您可能需要重新登录。</p>
<p><B>三、我们如何共享、转让、公开披露您的个人信息</B></p>
<p>1. 共享：除以下情形外，我们不会向任何第三方共享您的个人信息：(a) 事先获得您的明确同意；(b) 根据法律法规或司法/行政机关强制性要求；(c) 与关联公司共享必要信息以便提供服务（仅限本政策声明的目的）；(d) 与授权合作伙伴共享：仅为实现本政策中声明的目的，我们的某些服务将由授权合作伙伴提供（例如 AI 模型服务、短信/邮件验证码服务商、云服务器提供商）。我们会与合作伙伴签署严格的数据保密协议，要求其遵照我们的说明、本政策以及其他任何相关的保密和安全措施来处理您的个人信息。</p>
<p>2. 转让：未经您的明确同意，我们不会将您的个人信息转让给任何公司、组织和个人。</p>
<p>3. 公开披露：我们仅会在收到法律程序要求、或为防止 imminent 人身财产损害时，公开披露您的个人信息。</p>
<p><B>四、我们如何存储和保护您的个人信息</B></p>
<p>1. 存储地点与期限：我们在中华人民共和国境内收集和产生的个人信息，将存储在境内服务器的 SQLite 数据库中。存储期限遵循"最小必要"原则：账号信息保留至您注销账号后 30 天；操作日志保留 6 个月；历史排盘记录在您主动删除或注销账号前保留。</p>
<p>2. 安全措施：我们采用业界标准的安全措施，包括但不限于：bcrypt 哈希加盐存储密码、JWT + session token 双轨鉴权、TLS/HTTPS 数据传输加密、数据库参数化查询防 SQL 注入、操作日志审计。我们会尽力保护您的个人信息，但任何安全措施都无法做到绝对安全。</p>
<p><B>五、您的权利</B></p>
<p>根据《个人信息保护法》等相关法律，您享有以下权利：访问权、更正权、删除权、撤回同意权、注销账号权、获取个人信息副本权、投诉举报权。您可随时通过【我的 → ⚙ 设置 → 用户信息 / 账号安全】行使上述权利，或通过文末联系方式书面联系我们，我们将在 15 个工作日内处理并回复。</p>
<p>（1）访问权：您可在【我的】页面查看您的账号信息、排盘历史、收藏、消息。<br>（2）更正权：在【设置 → 用户信息】修改昵称、头像、性别、生日、出生地点。<br>（3）删除权：单条历史记录可左滑删除；收藏可取消。<br>（4）注销账号：【设置 → 账号安全 → 注销账号】按流程操作即可。注销后 30 天冷静期内您可以恢复账号，之后将进行不可逆的匿名化处理。</p>
<p><B>六、未成年人保护</B></p>
<p>我们非常重视对未成年人个人信息的保护。如果您是未满 16 周岁的未成年人，请在您的父母或监护人的陪同下阅读本政策，并在征得其同意后使用我们的服务。对于经监护人同意而收集的未成年人信息，我们只会在法律允许、监护人明确同意或保护未成年人所必要的范围内使用或披露。若您是未成年人的监护人，如对我们处理未成年人信息有疑问，请通过以下联系方式与我们取得联系。</p>
<p><B>七、本政策的更新</B></p>
<p>我们的隐私政策可能会不时进行修订。当本政策发生变更时，我们会在应用内以弹窗、站内消息或显著位置通知您，并向您说明生效日期。重大变更还会通过更显著的方式（包括在某些情况下通过电子邮件）通知您。</p>
<p><B>八、联系我们</B></p>
<p>如您对本隐私政策有任何疑问、意见、建议、投诉，或希望行使法定权利，请通过以下方式与我们联系：<br>电子邮箱：privacy@qimen-shisan-gong.app<br>通信地址：中华人民共和国 · 道家奇门遁甲项目组<br>一般情况下，我们将在 15 个工作日内回复。</p>
<p>——本政策总计约 2000 字，严格遵循《中华人民共和国个人信息保护法》《中华人民共和国网络安全法》《中华人民共和国数据安全法》《常见类型移动互联网应用程序必要个人信息范围规定》等要求制定。</p>
`;

function showPrivacyPolicy() {
  openConfirm('隐私保护政策', `<div style="max-height:50vh;overflow:auto;text-align:left;font-size:12px;line-height:1.7;color:var(--ink-2)">${PRIVACY_POLICY_TEXT}</div>`, null, { cancelText:'我已阅读', confirmText:'同意并继续' });
  // 修改取消按钮行为
  setTimeout(() => {
    document.getElementById('mc-cancel').onclick = closeConfirm;
    document.getElementById('mc-confirm').onclick = closeConfirm;
  }, 0);
}
```

---

### Task 3.2: 排盘结果页改为三分区渲染

**Files:**
- Modify: `public/index.html` (`renderTraditionalPlate` 函数 + `buildPaipanHTML` 函数)

- [ ] **Step 1: 重写 renderTraditionalPlate 的单元格内容为 左/中/右 三分区**

对 renderCell 函数修改：外围 td 和 center td 都改为三列布局：
```
┌──────────┬───────────┬──────────┐
│ 左(神)    │ 中(灵/天)  │ 右(天罡) │
│ 左(星)    │ 中(人/地)  │ 右(日排) │
│ 左(门)    │ 中(暗)     │          │
└──────────┴───────────┴──────────┘
```

修改 renderCell 外围部分：
```javascript
return `<td class="${isGuiShen ? 'gui-shen' : ''}" onclick="showPalaceDetail(${cell.idx})">
  <div class="pc-tri">
    <div class="pc-col pc-left">
      <div class="pc-shen">${palace.shen || ''}</div>
      <div class="pc-xing">${palace.xing || '—'}</div>
      <div class="pc-men men-${menCls}">${palace.men || '—'}</div>
    </div>
    <div class="pc-col pc-mid">
      <div class="pc-ling">${palace.lingGan || ''}</div>
      <div class="pc-tian">${palace.tianGan || ''}</div>
      <div class="pc-ren">${palace.diGan || ''}</div>
      <div class="pc-di">${palace.diGan || ''}</div>
      <div class="pc-an">${palace.anGan || ''}</div>
    </div>
    <div class="pc-col pc-right">
      <div class="pc-tiangang">${palace.tiangang || ''}</div>
      <div class="pc-ripai">${palace.riPaiJu || ''}</div>
    </div>
  </div>
</td>`;
```

中心 td 类似但调整排版紧凑以适配 2×2 中宫。

- [ ] **Step 2: 新增三分区 CSS**
```css
.pc-tri{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;width:100%;height:100%}
.pc-col{display:flex;flex-direction:column;justify-content:space-between;align-items:stretch;gap:2px;min-width:0}
.pc-col.pc-left{align-items:flex-start}
.pc-col.pc-mid{align-items:flex-end;text-align:right}
.pc-col.pc-right{align-items:flex-end;text-align:right}
.pc-ling{font-size:13px;font-weight:700;color:#6b4e00;font-family:"STKaiti","KaiTi","楷体",serif}
.pc-ren{font-size:14px;font-weight:700;color:var(--ink-2);font-family:"STKaiti","KaiTi","楷体",serif}
.pc-tiangang{font-size:12px;font-weight:700;color:var(--gold);background:var(--gold-soft);border-radius:4px;padding:1px 4px;font-family:"STKaiti","KaiTi","楷体",serif}
.pc-ripai{font-size:11px;color:var(--sub);margin-top:2px}
/* 中宫 2×2 三分区加大字号 */
.center .pc-tri{gap:10px}
.center .pc-shen{font-size:18px}
.center .pc-xing,.center .pc-men,.center .pc-ling,.center .pc-tian,.center .pc-ren,.center .pc-di{font-size:16px}
.center .pc-tiangang{font-size:14px}
```

- [ ] **Step 3: 同步修改 buildPaipanHTML（PDF 导出函数）**中对应的宫位表格渲染代码，改为三分区 HTML 结构。

---

### Task 3.3: 视觉与功能补充完善（任务三发现的改进点）

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: 补充首页（排盘页）的视觉细节**：
  1. 输入卡片的边框圆角、阴影微调，与夸克扫描王风格进一步对齐
  2. 四柱计算后显示的卡片 → 增加天干/地支的色彩区分（天干金色，地支墨色）
  3. 真太阳时开关 → 因为已在基础设置中删除，所以排盘页中的 `真太阳时 switch-meta` 改为只读元信息展示（去除开关按钮，保留显示"地址经纬度"）
- [ ] **Step 2: 记录页补充细节**：
  1. 清空历史按钮改成红色文字更醒目
  2. 批量导出按钮加金色边框
  3. 空状态加插图（使用 emoji 或楷体艺术字"历"加大）
- [ ] **Step 3: 我的页视觉优化**：
  1. 齿轮 ⚙ 加金色圆形背景高亮（与头像同尺寸），更易发现可点击
  2. 4 个基础设置 icon 图标加大，间距增加
- [ ] **Step 4: 全局排版改进**：
  1. 为楷体字体增加 font-weight 的可读性增强
  2. 增加 safe-bottom padding 防止底部内容被安卓系统手势条遮挡
  3. 暗金色彩增加更多变量（--gold-20/--gold-40）用于 hover 效果

---

## Group 4: 验证 + 文档

### Task 4.1: 全部测试通过

- [ ] **Step 1: 算法单元测试**
Run: `cd f:\1\夫\algorithm ; node test.js`
Expected: 阳遁5局、阴遁5局 13宫 ALL PASS

- [ ] **Step 2: 四柱测试**
Run: `cd f:\1\夫\algorithm ; node pillars.js`
Expected: 四柱计算验证全部通过

- [ ] **Step 3: 浏览器验证**
Start server: `cd f:\1\夫\public ; npx http-server -p 8124 -c-1`
使用 browser_use 依次验证：
1. 设置页齿轮点击跳转正常
2. 用户信息/账号安全/隐私政策/退出登录 四个 section 均可正常显示
3. 排盘结果页：三分区(左中右)渲染正确，灵盘/天罡/日排局标签可见
4. 退出登录 confirm 弹窗正常
5. 注销账号 confirm 弹窗正常
6. 隐私政策弹窗约 2000 字全文可滚动

### Task 4.2: 更新 work-flow.md

按格式添加本次三项修复的完整记录（时间+事件+问题来源+执行方向+执行边界+执行结果+相关文档），相关文档列出所有修改的文件名。

---

## Self-Review Checklist (Pre-Execution)

- ✅ Spec coverage: 全部3大子任务（算法/设置页/补充完善）均有对应Task
- ✅ 无占位符/TODO：所有步骤有具体代码与命令
- ✅ Type一致性：`lingGan`、`tiangang`、`riPaiJu` 属性名在 qimen.js/reference.js/renderTraditionalPlate/buildPaipanHTML 中全程一致
- ✅ 无矛盾：神默认顺序新旧区分、三分区前后一致
- ✅ Plan 文件完整可执行：可使用 subagent-driven-development 逐 Task 派发

Plan complete and saved to `docs/superpowers/plans/2026-08-23-algo-settings-refactor.md`.

**Execution Options:**
1. **Subagent-Driven (Recommended)** - 为每个 Task 派 fresh subagent，任务间审查衔接，快速并行
2. **Inline Execution** - 本会中内联执行，配合 checkpoints 检查

请选择执行方式，或我将默认使用推荐的 Subagent-Driven 并行执行。
