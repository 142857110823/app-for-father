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
