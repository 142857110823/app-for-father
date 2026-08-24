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
