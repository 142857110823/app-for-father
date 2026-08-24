# 奇门遁甲案例库实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成 ~10,000 条奇门遁甲排盘案例的 xlsx 案例库，支持回归测试和实际准确率验证。

**Architecture:** 使用现有 `pillars.js` 的 `fullPaiPanFromTime` 函数从公历时间生成排盘，将结果写入 3-Sheet 结构的 xlsx 文件。另写回归测试脚本读取 xlsx 重新排盘比对。

**Tech Stack:** Node.js, xlsx (SheetJS), lunar-javascript (已安装)

**Spec:** [2026-08-24-case-library-design.md](file:///f:/1/夫/docs/superpowers/specs/2026-08-24-case-library-design.md)

---

## File Structure

| 文件 | 路径 | 职责 |
|---|---|---|
| 生成脚本 | `algorithm/generate-cases.js` | 随机采样时间→排盘→写xlsx（3 Sheet） |
| 回归测试 | `algorithm/regression-test.js` | 读xlsx→逐案例重新排盘→比对→输出差异报告 |
| 案例库 | `algorithm/案例库.xlsx` | 生成的xlsx文件（不纳入git） |
| 临时脚本 | `algorithm/gen-samples.js` | 已存在的5案例生成脚本，完成后删除 |

---

### Task 1: 安装 xlsx 依赖

**Files:**
- Modify: `package.json` (添加 xlsx 依赖)

- [ ] **Step 1: 安装 xlsx 包**

Run: `cd f:\1\夫 ; npm install xlsx`
Expected: package.json 中 dependencies 出现 `"xlsx"` 条目

- [ ] **Step 2: 验证 xlsx 可用**

Run: `cd f:\1\夫 ; node -e "const XLSX = require('xlsx'); console.log('xlsx version:', XLSX.version)"`
Expected: 输出 xlsx 版本号，无报错

- [ ] **Step 3: Commit**

```bash
cd f:\1\夫 ; git add package.json package-lock.json ; git commit -m "deps: add xlsx (SheetJS) for case library generation"
```

---

### Task 2: 编写 generate-cases.js 生成脚本

**Files:**
- Create: `algorithm/generate-cases.js`

- [ ] **Step 1: 编写 generate-cases.js**

Create `algorithm/generate-cases.js`:

```javascript
// 奇门遁甲案例库生成脚本
// 随机采样时间 → 排盘 → 写入 xlsx（3 Sheet）
// 用法: node algorithm/generate-cases.js [数量] [输出路径]
//   数量默认 10000，输出路径默认 algorithm/案例库.xlsx

const { fullPaiPanFromTime } = require('./pillars.js');
const XLSX = require('xlsx');
const path = require('path');

// ============ 配置 ============
const CASE_COUNT = parseInt(process.argv[2]) || 10000;
const OUTPUT_PATH = process.argv[3] || path.join(__dirname, '案例库.xlsx');
const DATE_START = new Date(2020, 0, 1).getTime();
const DATE_END = new Date(2030, 11, 31).getTime();

// ============ 宫位标签（与 reference.js GONG_ORDER 一致） ============
const GONG_LABELS = [
  '4尾', '9', '2尾', '2首', '7', '6尾', '6首', '1', '8首', '8尾', '3', '4首', '5中'
];

// ============ 随机时间生成 ============
function randomDate() {
  const ts = DATE_START + Math.random() * (DATE_END - DATE_START);
  const d = new Date(ts);
  // 时辰对齐：每2小时一个时段，取时段中间值
  const hour = Math.floor(Math.random() * 12) * 2; // 0,2,4,...,22
  const minute = Math.floor(Math.random() * 60);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour, minute };
}

// ============ Sheet 1 表头 ============
const SHEET1_HEADERS = [
  '案例编号', '数据来源', '公历日期', '公历时间',
  '年柱', '月柱', '日柱', '时柱',
  '日干', '昼夜', '贵神地支', '农历月', '农历日', '时支',
  '盘类型', '遁类型', '局数',
  '问事类型', '预测判断', '实际结果', '是否吻合', '准确度评分', '验证状态', '备注'
];

// ============ Sheet 2 表头 ============
const SHEET2_HEADERS = [
  '案例编号', '宫位索引', '洛书数', '首尾标识',
  '神盘', '星盘', '门盘',
  '天盘干', '地盘干', '人盘干', '灵盘干',
  '天罡', '日排局', '暗干'
];

// ============ Sheet 3 表头 ============
const SHEET3_HEADERS = [
  '案例编号', '问事时间', '问事类型', '问事内容',
  '用神', '用神宫位', '格局', '预测分析',
  '事件发生时间', '实际结果', '吻合度', '准确度评分',
  '验证人', '验证日期', '备注'
];

// ============ 格式化时间 ============
function pad2(n) { return String(n).padStart(2, '0'); }

// ============ 生成单个案例数据 ============
function generateCase(index) {
  const dt = randomDate();
  const result = fullPaiPanFromTime(dt.year, dt.month, dt.day, dt.hour, dt.minute);
  const caseId = `QM-${String(index).padStart(5, '0')}`;

  // Sheet 1 行（A-Q列有值，R-X列留空）
  const sheet1Row = [
    caseId,                                    // A 案例编号
    '算法生成',                                  // B 数据来源
    `${dt.year}-${pad2(dt.month)}-${pad2(dt.day)}`, // C 公历日期
    `${pad2(dt.hour)}:${pad2(dt.minute)}`,       // D 公历时间
    result.pillarArr[0],                         // E 年柱
    result.pillarArr[1],                         // F 月柱
    result.pillarArr[2],                         // G 日柱
    result.pillarArr[3],                         // H 时柱
    result.guiShen.dayGan,                      // I 日干
    result.guiShen.isNight ? '夜' : '昼',        // J 昼夜
    result.guiShen.zhi,                         // K 贵神地支
    result.lunarMonth,                          // L 农历月
    result.lunarDay,                            // M 农历日
    result.shiZhi,                              // N 时支
    result.pan.pan,                             // O 盘类型
    result.pan.dun,                             // P 遁类型
    result.pan.ju,                              // Q 局数
    '', '', '', '', '', '', ''                  // R-X 留空
  ];

  // Sheet 2 行（13行，每宫一行）
  const sheet2Rows = result.palaces.map((p, idx) => [
    caseId,              // A 案例编号
    idx,                 // B 宫位索引
    p.luoshu,            // C 洛书数
    p.label || '',       // D 首尾标识
    p.shen || '',        // E 神盘
    p.xing || '',        // F 星盘
    p.men || '',         // G 门盘
    p.tianGan || '',     // H 天盘干
    p.diGanDisplay || '',// I 地盘干
    p.renPan || '',      // J 人盘干
    p.lingGan || '',     // K 灵盘干
    p.tiangang || '',    // L 天罡
    p.riPaiJu || '',     // M 日排局
    p.anGan || ''        // N 暗干
  ]);

  return { sheet1Row, sheet2Rows };
}

// ============ 主函数 ============
function main() {
  console.log(`====== 奇门遁甲案例库生成 ======`);
  console.log(`案例数量: ${CASE_COUNT}`);
  console.log(`时间范围: 2020-01-01 至 2030-12-31`);
  console.log(`输出路径: ${OUTPUT_PATH}`);
  console.log(`开始生成...\n`);

  const sheet1Data = [SHEET1_HEADERS];
  const sheet2Data = [SHEET2_HEADERS];
  const sheet3Data = [SHEET3_HEADERS];

  // 遁局统计
  const stats = {};

  for (let i = 0; i < CASE_COUNT; i++) {
    const { sheet1Row, sheet2Rows } = generateCase(i + 1);
    sheet1Data.push(sheet1Row);
    for (const row of sheet2Rows) {
      sheet2Data.push(row);
    }

    // 统计遁局分布
    const key = `${sheet1Row[15]}-${sheet1Row[16]}局`; // 遁类型-局数
    stats[key] = (stats[key] || 0) + 1;

    // 进度输出
    if ((i + 1) % 1000 === 0) {
      console.log(`  已生成 ${i + 1} / ${CASE_COUNT}`);
    }
  }

  // 创建工作簿
  const wb = XLSX.utils.book_new();

  // Sheet 1: 案例总览
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 },
    { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
    { wch: 4 }, { wch: 4 }, { wch: 8 }, { wch: 6 }, { wch: 6 }, { wch: 4 },
    { wch: 6 }, { wch: 6 }, { wch: 4 },
    { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, ws1, '案例总览');

  // Sheet 2: 宫位明细
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 12 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
    { wch: 6 }, { wch: 6 }, { wch: 6 },
    { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
    { wch: 6 }, { wch: 8 }, { wch: 6 }
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '宫位明细');

  // Sheet 3: 事件验证（仅表头）
  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 24 },
    { wch: 4 }, { wch: 8 }, { wch: 10 }, { wch: 24 },
    { wch: 12 }, { wch: 24 }, { wch: 10 }, { wch: 8 },
    { wch: 8 }, { wch: 12 }, { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, ws3, '事件验证');

  // 写入文件
  XLSX.writeFile(wb, OUTPUT_PATH);

  console.log(`\n====== 生成完成 ======`);
  console.log(`案例总览: ${CASE_COUNT} 行`);
  console.log(`宫位明细: ${CASE_COUNT * 13} 行`);
  console.log(`事件验证: 0 行（待人工填充）`);
  console.log(`\n遁局分布统计:`);
  const sortedKeys = Object.keys(stats).sort();
  for (const key of sortedKeys) {
    console.log(`  ${key}: ${stats[key]} 条`);
  }
  console.log(`\n文件已保存: ${OUTPUT_PATH}`);
}

main();
```

- [ ] **Step 2: 用 5 条数据测试生成脚本**

Run: `cd f:\1\夫 ; node algorithm/generate-cases.js 5 algorithm/test-cases.xlsx`
Expected: 输出生成完成信息，创建 `algorithm/test-cases.xlsx`，遁局分布统计显示 5 条

- [ ] **Step 3: 验证 xlsx 结构**

Run: `cd f:\1\夫 ; node -e "const XLSX=require('xlsx'); const wb=XLSX.readFile('algorithm/test-cases.xlsx'); console.log('Sheets:', wb.SheetNames); const ws1=XLSX.utils.sheet_to_json(wb.Sheets['案例总览']); console.log('Sheet1行数:', ws1.length); const ws2=XLSX.utils.sheet_to_json(wb.Sheets['宫位明细']); console.log('Sheet2行数:', ws2.length); console.log('Sheet1首行:', JSON.stringify(ws1[0])); console.log('Sheet2首行:', JSON.stringify(ws2[0]));"`
Expected: 3个Sheet，Sheet1有5行数据，Sheet2有65行数据(5×13)，首行数据格式正确

- [ ] **Step 4: 删除测试文件**

Run: `cd f:\1\夫 ; del algorithm\test-cases.xlsx`

- [ ] **Step 5: Commit**

```bash
cd f:\1\夫 ; git add algorithm/generate-cases.js ; git commit -m "feat: add case library generation script"
```

---

### Task 3: 运行完整生成

**Files:**
- Output: `algorithm/案例库.xlsx` (不纳入git)

- [ ] **Step 1: 将 案例库.xlsx 加入 .gitignore**

检查 `f:\1\夫\.gitignore` 是否已有 `案例库.xlsx` 条目，没有则追加。

Run: `cd f:\1\夫 ; Add-Content -Path .gitignore -Value "`n# 案例库（生成文件，不纳入git）`nalgorithm/案例库.xlsx`nalgorithm/test-cases.xlsx"`

- [ ] **Step 2: 生成 10,000 条案例**

Run: `cd f:\1\夫 ; node algorithm/generate-cases.js`
Expected: 进度输出每1000条一次，最终输出"生成完成"，遁局分布统计显示20种遁局组合

- [ ] **Step 3: 验证生成结果**

Run: `cd f:\1\夫 ; node -e "const XLSX=require('xlsx'); const wb=XLSX.readFile('algorithm/案例库.xlsx'); const ws1=XLSX.utils.sheet_to_json(wb.Sheets['案例总览']); const ws2=XLSX.utils.sheet_to_json(wb.Sheets['宫位明细']); console.log('Sheet1:', ws1.length, '行'); console.log('Sheet2:', ws2.length, '行（应为', ws1.length*13, '）'); console.log('首案例:', ws1[0]['案例编号'], ws1[0]['遁类型'], ws1[0]['局数'], '局'); console.log('末案例:', ws1[ws1.length-1]['案例编号']);"`
Expected: Sheet1约10000行，Sheet2约130000行，案例编号从QM-00001到QM-10000

- [ ] **Step 4: Commit .gitignore 更新**

```bash
cd f:\1\夫 ; git add .gitignore ; git commit -m "chore: gitignore case library xlsx files"
```

---

### Task 4: 编写 regression-test.js 回归测试脚本

**Files:**
- Create: `algorithm/regression-test.js`

- [ ] **Step 1: 编写 regression-test.js**

Create `algorithm/regression-test.js`:

```javascript
// 奇门遁甲回归测试脚本
// 读取 案例库.xlsx → 逐案例重新排盘 → 与存储结果比对 → 输出差异报告
// 用法: node algorithm/regression-test.js [xlsx路径] [最大案例数]
//   xlsx路径默认 algorithm/案例库.xlsx，最大案例数默认全部

const { fullPaiPanFromTime } = require('./pillars.js');
const XLSX = require('xlsx');
const path = require('path');

const XLSX_PATH = process.argv[2] || path.join(__dirname, '案例库.xlsx');
const MAX_CASES = parseInt(process.argv[3]) || Infinity;

// 宫位标签（与 generate-cases.js 一致）
const GONG_LABELS = [
  '4尾', '9', '2尾', '2首', '7', '6尾', '6首', '1', '8首', '8尾', '3', '4首', '5中'
];

// Sheet 2 比对字段（列索引 E-N，0-based 从 A 开始所以是 4-13）
const COMPARE_FIELDS = [
  { col: 4, key: 'shen',          label: '神盘' },
  { col: 5, key: 'xing',          label: '星盘' },
  { col: 6, key: 'men',           label: '门盘' },
  { col: 7, key: 'tianGan',       label: '天盘干' },
  { col: 8, key: 'diGanDisplay',  label: '地盘干' },
  { col: 9, key: 'renPan',        label: '人盘干' },
  { col: 10, key: 'lingGan',      label: '灵盘干' },
  { col: 11, key: 'tiangang',     label: '天罡' },
  { col: 12, key: 'riPaiJu',      label: '日排局' },
  { col: 13, key: 'anGan',        label: '暗干' }
];

function main() {
  console.log('====== 奇门遁甲回归测试 ======');
  console.log(`读取: ${XLSX_PATH}`);

  // 读取 xlsx
  const wb = XLSX.readFile(XLSX_PATH);

  // Sheet 1: 案例总览
  const ws1 = XLSX.utils.sheet_to_json(wb.Sheets['案例总览'], { header: 1 });
  // ws1[0] 是表头，ws1[1:] 是数据行
  const cases = ws1.slice(1).filter(row => row[0]); // 过滤空行

  // Sheet 2: 宫位明细
  const ws2 = XLSX.utils.sheet_to_json(wb.Sheets['宫位明细'], { header: 1 });
  const palaceRows = ws2.slice(1).filter(row => row[0]); // 过滤空行

  // 按 案例编号 分组宫位行
  const palaceMap = {};
  for (const row of palaceRows) {
    const caseId = row[0];
    if (!palaceMap[caseId]) palaceMap[caseId] = [];
    palaceMap[caseId].push(row);
  }

  const totalCases = Math.min(cases.length, MAX_CASES);
  console.log(`案例总数: ${totalCases}`);
  console.log(`开始回归测试...\n`);

  let passCount = 0;
  let failCount = 0;
  let totalDiffs = 0;
  const failures = [];

  for (let i = 0; i < totalCases; i++) {
    const row = cases[i];
    const caseId = row[0];
    const dateStr = row[2]; // 公历日期 YYYY-MM-DD
    const timeStr = row[3]; // 公历时间 HH:MM
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);

    // 重新排盘
    const result = fullPaiPanFromTime(year, month, day, hour, minute);
    const palaces = result.palaces;

    // 获取 xlsx 中存储的宫位数据
    const storedPalaces = palaceMap[caseId] || [];

    let caseDiffs = 0;

    for (let pIdx = 0; pIdx < 13; pIdx++) {
      const computed = palaces[pIdx];
      const stored = storedPalaces[pIdx];

      if (!stored) {
        caseDiffs++;
        if (failures.length < 20) {
          failures.push(`  ❌ ${caseId} 宫${pIdx}: xlsx中无数据`);
        }
        continue;
      }

      for (const f of COMPARE_FIELDS) {
        const computedVal = computed[f.key] || '';
        const storedVal = stored[f.col] || '';
        if (computedVal !== storedVal) {
          caseDiffs++;
          if (failures.length < 20) {
            failures.push(`  ❌ ${caseId} 宫${pIdx}(${GONG_LABELS[pIdx]}) ${f.label}: 计算[${computedVal}] ≠ 存储[${storedVal}]`);
          }
        }
      }
    }

    if (caseDiffs === 0) {
      passCount++;
    } else {
      failCount++;
      totalDiffs += caseDiffs;
    }

    // 进度输出
    if ((i + 1) % 1000 === 0) {
      console.log(`  已测试 ${i + 1} / ${totalCases} (通过:${passCount} 失败:${failCount})`);
    }
  }

  console.log(`\n====== 回归测试结果 ======`);
  console.log(`通过: ${passCount} / ${totalCases}`);
  console.log(`失败: ${failCount} / ${totalCases}`);
  console.log(`总差异: ${totalDiffs} 处`);

  if (failures.length > 0) {
    console.log(`\n前 ${failures.length} 条差异详情:`);
    failures.forEach(f => console.log(f));
  }

  const ok = failCount === 0;
  console.log(`\n====== ${ok ? '全部通过 ✅' : '存在差异 ❌'} ======`);
  process.exit(ok ? 0 : 1);
}

main();
```

- [ ] **Step 2: 用 5 条数据快速测试回归脚本**

先生成5条测试数据：`cd f:\1\夫 ; node algorithm/generate-cases.js 5 algorithm/test-cases.xlsx`

再运行回归测试：`cd f:\1\夫 ; node algorithm/regression-test.js algorithm/test-cases.xlsx`

Expected: 5/5通过，0差异

- [ ] **Step 3: 删除测试文件**

Run: `cd f:\1\夫 ; del algorithm\test-cases.xlsx`

- [ ] **Step 4: Commit**

```bash
cd f:\1\夫 ; git add algorithm/regression-test.js ; git commit -m "feat: add regression test script for case library"
```

---

### Task 5: 运行完整回归测试

**Files:**
- 无新文件

- [ ] **Step 1: 对完整案例库运行回归测试**

Run: `cd f:\1\夫 ; node algorithm/regression-test.js`
Expected: 10000/10000通过，0差异（因为数据就是算法生成的，必然一致）

- [ ] **Step 2: 如有差异，检查并修复**

如果出现差异，说明算法有非确定性或 xlsx 读写有精度问题，需要排查。

---

### Task 6: 清理临时文件

**Files:**
- Delete: `algorithm/gen-samples.js`

- [ ] **Step 1: 删除临时脚本**

Run: `cd f:\1\夫 ; del algorithm\gen-samples.js`

- [ ] **Step 2: Commit**

```bash
cd f:\1\夫 ; git add -A ; git commit -m "chore: remove temporary sample generation script"
```

---

### Task 7: 更新 package.json scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 添加 npm scripts**

在 `package.json` 的 `scripts` 中添加：

```json
"gen:cases": "node algorithm/generate-cases.js",
"test:regression": "node algorithm/regression-test.js"
```

- [ ] **Step 2: 验证 npm scripts 可用**

Run: `cd f:\1\夫 ; npm run gen:cases -- 5 algorithm/test-cases.xlsx`
Expected: 生成5条案例到 test-cases.xlsx

Run: `cd f:\1\夫 ; npm run test:regression -- algorithm/test-cases.xlsx`
Expected: 5/5通过

- [ ] **Step 3: 清理测试文件并 Commit**

Run: `cd f:\1\夫 ; del algorithm\test-cases.xlsx`

```bash
cd f:\1\夫 ; git add package.json ; git commit -m "chore: add npm scripts for case generation and regression testing"
```

---

## Self-Review

**Spec coverage:**
- Sheet 1 (24列) → Task 2 generate-cases.js ✅
- Sheet 2 (14列) → Task 2 generate-cases.js ✅
- Sheet 3 (15列, 仅表头) → Task 2 generate-cases.js ✅
- 自动生成流程 → Task 2 + Task 3 ✅
- 回归测试流程 → Task 4 + Task 5 ✅
- 5个示例案例 → gen-samples.js 已生成，设计文档已包含 ✅
- 文件路径 → 设计文档已定义，实现一致 ✅

**Placeholder scan:** 无 TBD/TODO，所有代码步骤都有完整代码。

**Type consistency:** `generate-cases.js` 和 `regression-test.js` 中的 palace 字段名一致（shen/xing/men/tianGan/diGanDisplay/renPan/lingGan/tiangang/riPaiJu/anGan）。GONG_LABELS 数组两个文件一致。
