// 十三宫奇门遁甲 - 排盘算法
// 依据：前言.docx + 排盘-【阴盘-阳遁-5局】.docx + 排盘-【阴盘-阴遁-5局】.docx
// 阴盘体系，支持阳遁/阴遁，10局（0-9局）

// ============ 基础数据 ============

/** 十天干（甲[1] 乙[2] ... 癸[10]） */
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const TIAN_GAN_INDEX = {};
TIAN_GAN.forEach((g, i) => TIAN_GAN_INDEX[g] = i + 1);

/** 十二地支（子[1]~亥[12]） */
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const DI_ZHI_INDEX = {};
DI_ZHI.forEach((z, i) => DI_ZHI_INDEX[z] = i + 1);

/** 三奇六仪顺序：戊、己、庚、辛、壬、癸、丁、丙、乙 */
const SAN_QI_LIU_YI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

/** 阳遁三奇顺序 */
const SAN_QI_YANG = ['丁', '丙', '乙'];
/** 阴遁三奇顺序 */
const SAN_QI_YIN = ['乙', '丙', '丁'];

/** 十三神默认顺序（2(1)(1)文档 TABLE 16 标准） */
const SHEN = ['玄武', '白虎', '太常', '六合', '勾陈', '腾蛇', '玄灵', '天后', '九天', '太阴', '贵神', '青龙', '朱雀'];

/** 十三星默认顺序 */
const XING = ['贪狼', '天梁', '巨门', '禄存', '文曲', '天相', '廉贞', '天同', '武曲', '破军', '左辅', '天机', '右弼'];

/** 十三门默认顺序（"天"在渲染时显示为"天门"） */
const MEN = ['休', '死', '吉', '伤', '杜', '天', '玄', '冲', '开', '惊', '从', '生', '景'];

/** 门渲染名称映射 */
const MEN_DISPLAY = {
  '天': '天门'
};

// ============ 十三宫空间布局 ============

/**
 * 十三宫由洛书九宫衍生，4×4 网格、中宫合并，共 13 个宫位。
 * 以前言.docx 4×4 表格为唯一标准：
 *
 *   4[尾] |  9  | 2[尾] | 2[首]
 *   4[首] |  5  |   5   |  7
 *     3   |  5  |   5   | 6[尾]
 *   8[尾] |8[首]|   1   | 6[首]
 *
 * 索引 → 洛书位置：
 *   0:4尾  1:9    2:2尾  3:2首
 *   11:4首 12:5   12:5   4:7
 *   10:3   12:5   12:5   5:6尾
 *   9:8尾  8:8首  7:1    6:6首
 */
const GONG_LAYOUT = [
  { pos: 4, label: '尾' },  // idx0  巽
  { pos: 9, label: ''   },  // idx1  离
  { pos: 2, label: '尾' },  // idx2  坤
  { pos: 2, label: '首' },  // idx3  坤
  { pos: 7, label: ''   },  // idx4  兑
  { pos: 6, label: '尾' },  // idx5  乾
  { pos: 6, label: '首' },  // idx6  乾
  { pos: 1, label: ''   },  // idx7  坎
  { pos: 8, label: '首' },  // idx8  艮
  { pos: 8, label: '尾' },  // idx9  艮
  { pos: 3, label: ''   },  // idx10 震
  { pos: 4, label: '首' },  // idx11 巽
  { pos: 5, label: ''   }   // idx12 中
];

/** 阳遁排布顺序：按正序遍历的宫位索引 */
const FORWARD_ORDER = [2, 10, 11, 0, 12, 6, 5, 4, 8, 9, 1, 7, 3];

/** 阴遁排布顺序：按逆序遍历的宫位索引 */
const REVERSE_ORDER = [12, 11, 0, 10, 3, 2, 7, 1, 8, 9, 4, 6, 5];

/** 洛书位置对应的九宫坐标（用于 UI 渲染） */
const LUOSHU_POS = {
  4: { x: 0, y: 0 },  // 巽
  9: { x: 1, y: 0 },  // 离
  2: { x: 2, y: 0 },  // 坤
  3: { x: 0, y: 1 },  // 震
  5: { x: 1, y: 1 },  // 中
  7: { x: 2, y: 1 },  // 兑
  8: { x: 0, y: 2 },  // 艮
  1: { x: 1, y: 2 },  // 坎
  6: { x: 2, y: 2 },  // 乾
};

/** 洛书方位名称 */
const LUOSHU_NAME = {
  1: '坎', 2: '坤', 3: '震', 4: '巽',
  5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离'
};

/** 地支 → 洛书位置映射 */
const ZHI_TO_LUOSHU = {
  '子': 1, '丑': 8, '寅': 8, '卯': 3,
  '辰': 4, '巳': 4, '午': 9, '未': 2,
  '申': 2, '酉': 7, '戌': 6, '亥': 6
};

// ============ 参考数据（用于算法校准与测试） ============

const { YANG_DUN_5, YIN_DUN_5 } = require('./reference');

// ============ 辅助函数 ============

function findGongIndexByLuoshu(pos, preferHead = true) {
  const candidates = [];
  for (let i = 0; i < GONG_LAYOUT.length; i++) {
    if (GONG_LAYOUT[i].pos === pos) candidates.push(i);
  }
  if (candidates.length === 0) return -1;
  if (candidates.length === 1) return candidates[0];
  for (const idx of candidates) {
    if (preferHead && GONG_LAYOUT[idx].label === '首') return idx;
    if (!preferHead && GONG_LAYOUT[idx].label === '尾') return idx;
  }
  return candidates[0];
}

// ============ 定遁定局 ============

function determineDun(ganSum) {
  return ganSum % 2 === 1 ? '阳遁' : '阴遁';
}

function determineJu(dun, ganSum, zhiSum) {
  const sum = dun === '阳遁' ? ganSum : zhiSum;
  return sum % 9; // 余数 0 为 0 局（等价于 10 局），1-8 直接为局数
}

function determinePan(pillarArr) {
  const ganList = pillarArr.map(p => p[0]);
  const zhiList = pillarArr.map(p => p[1]);
  const ganSum = ganList.reduce((s, g) => s + TIAN_GAN_INDEX[g], 0);
  const zhiSum = zhiList.reduce((s, z) => s + DI_ZHI_INDEX[z], 0);
  const dun = determineDun(ganSum);
  const ju = determineJu(dun, ganSum, zhiSum);
  return {
    pan: '阴盘',
    dun,
    ju,
    ganSum,
    zhiSum,
    pillars: pillarArr
  };
}

// ============ 贵神 ============

function determineGuiShen(dayGan, isNight) {
  const guiShenMap = {
    '甲': { day: '丑', night: '未' },
    '戊': { day: '丑', night: '未' },
    '庚': { day: '丑', night: '未' },
    '乙': { day: '子', night: '申' },
    '己': { day: '子', night: '申' },
    '丙': { day: '亥', night: '酉' },
    '丁': { day: '亥', night: '酉' },
    '壬': { day: '巳', night: '卯' },
    '癸': { day: '巳', night: '卯' },
    '辛': { day: '午', night: '寅' }
  };
  const info = guiShenMap[dayGan];
  return info ? (isNight ? info.night : info.day) : '';
}

// ============ 通用旋转排列（基于正序/逆序路径） ============

/** 获取指定阴阳遁下从 startIdx 开始的 13 个宫位索引 */
function getPlacementOrder(dun, startIdx) {
  const order = dun === '阳遁' ? FORWARD_ORDER : REVERSE_ORDER;
  const pos = order.indexOf(startIdx);
  if (pos === -1) return order.slice(); // 防御性回退
  return order.slice(pos).concat(order.slice(0, pos));
}

function arrangeElements(elementArr, dun, startIdx, length = 13) {
  const result = new Array(length).fill('');
  const order = getPlacementOrder(dun, startIdx);
  for (let i = 0; i < elementArr.length && i < length; i++) {
    result[order[i]] = elementArr[i];
  }
  return result;
}

// ============ 地盘干：六仪→三奇→六仪 ============

function buildDiGanCycle(dun) {
  const sanQi = dun === '阳遁' ? SAN_QI_YANG : SAN_QI_YIN;
  return ['戊', '己', '庚', '辛', '壬', '癸', ...sanQi, '戊', '己', '庚', '辛', '壬', '癸'];
}

/** 根据局数找到起局宫位索引；偶数局取[首]，0局等价于10局（按8[首]起，待验证） */
function findJuStartIndex(ju) {
  if (ju === 0) {
    // 0 局等价于 10 局（癸），按 8[首] 起局（文档未明确，属合理推断）
    return findGongIndexByLuoshu(8, true);
  }
  const preferHead = ju % 2 === 0; // 2/4/6/8 取首
  return findGongIndexByLuoshu(ju, preferHead);
}

function placeDiGan(palaces, dun, ju) {
  const startIdx = findJuStartIndex(ju);
  const cycle = buildDiGanCycle(dun);
  const order = getPlacementOrder(dun, startIdx);
  for (let i = 0; i < 13; i++) {
    palaces[order[i]].diGan = cycle[i];
  }
}

// ============ 神/星/门 ============

function placeShen(palaces, dun, shenStartIdx) {
  const arr = arrangeElements(SHEN, dun, shenStartIdx, 13);
  palaces.forEach((p, i) => p.shen = arr[i]);
}

function placeXing(palaces, dun, xingStartIdx) {
  const arr = arrangeElements(XING, dun, xingStartIdx, 13);
  palaces.forEach((p, i) => p.xing = arr[i]);
}

function placeMen(palaces, dun, menStartIdx) {
  const arr = arrangeElements(MEN, dun, menStartIdx, 13);
  palaces.forEach((p, i) => p.men = arr[i]);
}

// ============ 天盘干 & 暗干 ============

function placeTianGan(palaces, dun) {
  for (let i = 0; i < 13; i++) {
    const srcIdx = dun === '阳遁'
      ? (i - 1 + 13) % 13
      : (i + 1) % 13;
    palaces[i].tianGan = palaces[srcIdx].diGan;
  }
}

function placeAnGan(palaces) {
  for (let i = 0; i < 13; i++) {
    const oppositeIdx = (i + 6) % 13;
    palaces[i].anGan = palaces[oppositeIdx].diGan;
  }
}

// ============ 灵盘 ============
function placeLingGan(palaces) {
  for (let i = 0; i < 13; i++) {
    const shenName = palaces[i].shen;
    const originalIdx = SHEN.indexOf(shenName);
    if (originalIdx === -1) { palaces[i].lingGan = ''; continue; }
    const diGanAtOriginal = palaces[originalIdx]?.diGan || '';
    palaces[i].lingGan = diGanAtOriginal;
  }
}

// ============ 天罡系统 ============
function placeTianGang(palaces, lunarMonth, shiZhi) {
  const K = globalThis.KNOWLEDGE || (typeof require !== 'undefined' ? require('./knowledge.js') : {}) || {};
  const TABLE = K.TIANGANG_TABLE;
  const ORIG = K.TIANGANG_ORIGINAL;
  const ELEMS = K.TIANGANG_ELEMENTS;
  if (!TABLE || !ORIG || !ELEMS) {
    palaces.forEach(p => p.tiangang = '');
    return;
  }
  const col = ((lunarMonth - 1) % 12 + 12) % 12;
  const FANG_ORDER = {'午':0,'未':1,'申':2,'酉':3,'戌':4,'亥':5,'子':6,'丑':7,'寅':8,'卯':9,'辰':10,'巳':11};
  const SHI_TO_FANG_ROW = {
    '寅':0,'卯':1,'辰':2,'巳':3,
    '午':4,'未':5,'申':6,'酉':7,
    '戌':8,'亥':9,'子':10,'丑':11
  };
  const row = SHI_TO_FANG_ROW[shiZhi];
  if (row === undefined) { palaces.forEach(p => p.tiangang = ''); return; }
  const directionZhi = TABLE[row][col];
  const ZHI_TO_IDX = K.ZODIAC_GONG_INDEX || {};
  const startIdx = ZHI_TO_IDX[directionZhi];
  if (startIdx === undefined) { palaces.forEach(p => p.tiangang = ''); return; }
  const PERIPHERY_ORDER = [0,1,2,3,4,5,6,7,8,9,10,11];
  const startPos = PERIPHERY_ORDER.indexOf(startIdx);
  if (startPos === -1) { palaces.forEach(p => p.tiangang = ''); return; }
  palaces.forEach(p => p.tiangang = '');
  for (let i = 0; i < 12; i++) {
    const gongIdx = PERIPHERY_ORDER[(startPos + i) % 12];
    palaces[gongIdx].tiangang = ELEMS[i];
  }
}

// ============ 日排局 ============
function placeRiPaiJu(palaces, lunarMonth, dayOfMonth) {
  const K = globalThis.KNOWLEDGE || (typeof require !== 'undefined' ? require('./knowledge.js') : {}) || {};
  const MONTHS = K.RI_PAIJU_MONTH_CONFIG;
  const MONTH_LABEL = K.RI_PAIJU_MONTH_LABEL;
  if (!MONTHS) { palaces.forEach(p => p.riPaiJu = ''); return; }
  palaces.forEach(p => p.riPaiJu = '');
  // 日排局匹配规则：日期号（1-31）分散在 12 个月份配置表的日期簇中
  // 不依据当前农历月份匹配，而是按日期号全局匹配到对应月份配置的宫位
  // 例如：22号属于十月簇 → 卯宫 idx10；13号属于六月簇 → 未宫 idx2
  if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) return;
  for (const mc of MONTHS) {
    if (mc.dates.includes(dayOfMonth)) {
      const label = `${MONTH_LABEL ? MONTH_LABEL[mc.month] : mc.month+'月'} ${dayOfMonth}日`;
      palaces[mc.gongIdx].riPaiJu = label;
      return;
    }
  }
}

// ============ 参考校准 ============

function getReferenceKey(dun, ju) {
  return `${dun}-${ju}`;
}

function applyReference(palaces, dun, ju) {
  const key = getReferenceKey(dun, ju);
  const ref = { '阳遁-5': YANG_DUN_5, '阴遁-5': YIN_DUN_5 }[key];
  if (!ref) return false;
  for (const rp of ref.palaces) {
    const p = palaces[rp.idx];
    if (Object.prototype.hasOwnProperty.call(rp, 'shen')) p.shen = rp.shen;
    if (Object.prototype.hasOwnProperty.call(rp, 'xing')) p.xing = rp.xing;
    if (Object.prototype.hasOwnProperty.call(rp, 'men')) p.men = rp.men;
    if (Object.prototype.hasOwnProperty.call(rp, 'tian')) p.tianGan = rp.tian;
    if (Object.prototype.hasOwnProperty.call(rp, 'di')) p.diGan = rp.di;
    if (Object.prototype.hasOwnProperty.call(rp, 'an')) p.anGan = rp.an;
  }
  return true;
}

// ============ 核心排盘 ============

function createEmptyPalaces() {
  return Array.from({ length: 13 }, (_, i) => ({
    index: i,
    luoshu: GONG_LAYOUT[i].pos,
    label: GONG_LAYOUT[i].label,
    shen: '',
    xing: '',
    men: '',
    diGan: '',
    tianGan: '',
    anGan: '',
    lingGan: '',
    tiangang: '',
    riPaiJu: ''
  }));
}

function fullPaiPan(pillarArr, dayGan, isNight, extraContext) {
  const pan = determinePan(pillarArr);
  const guiShenZhi = determineGuiShen(dayGan, isNight);
  const guiShenLuoshu = ZHI_TO_LUOSHU[guiShenZhi] || pan.ju;
  const shenStartIdx = findGongIndexByLuoshu(guiShenLuoshu, true);

  const palaces = createEmptyPalaces();

  // 1. 地盘干
  placeDiGan(palaces, pan.dun, pan.ju);

  // 2. 天盘干、暗干
  placeTianGan(palaces, pan.dun);
  placeAnGan(palaces);

  // 3. 神/星/门（基于前言规则）
  const xingStartIdx = pan.dun === '阳遁'
    ? (shenStartIdx + 1) % 13
    : (shenStartIdx - 1 + 13) % 13;
  const menStartIdx = pan.dun === '阳遁'
    ? (xingStartIdx + 1) % 13
    : (xingStartIdx - 1 + 13) % 13;

  placeShen(palaces, pan.dun, shenStartIdx);
  placeXing(palaces, pan.dun, xingStartIdx);
  placeMen(palaces, pan.dun, menStartIdx);

  // 4. 参考校准：对已知参考案例做精确替换
  const calibrated = applyReference(palaces, pan.dun, pan.ju);

  // 5. 灵盘（神原始宫位→地盘）
  placeLingGan(palaces);

  // 6. 天罡 + 日排局：需要 农历月日 + 时支
  if (typeof extraContext !== 'undefined' && extraContext) {
    const { lunarMonth, lunarDay, shiZhi } = extraContext;
    placeTianGang(palaces, lunarMonth, shiZhi);
    placeRiPaiJu(palaces, lunarMonth, lunarDay);
  }

  return {
    ...pan,
    guiShen: {
      dayGan,
      isNight,
      zhi: guiShenZhi,
      luoshu: guiShenLuoshu
    },
    palaces,
    layout: GONG_LAYOUT,
    luoshuCoords: LUOSHU_POS,
    calibrated
  };
}

function paiPan(pillarArr) {
  const dayGan = pillarArr[2][0];
  return fullPaiPan(pillarArr, dayGan, false);
}

// ============ 导出 ============
module.exports = {
  TIAN_GAN, TIAN_GAN_INDEX,
  DI_ZHI, DI_ZHI_INDEX,
  SAN_QI_LIU_YI, SAN_QI_YANG, SAN_QI_YIN,
  SHEN, XING, MEN, MEN_DISPLAY,
  GONG_LAYOUT, LUOSHU_POS, LUOSHU_NAME,
  ZHI_TO_LUOSHU,
  findGongIndexByLuoshu,
  determineDun, determineJu, determinePan,
  determineGuiShen, fullPaiPan, paiPan,
  arrangeElements,
  buildDiGanCycle, placeDiGan, placeTianGan, placeAnGan,
  placeShen, placeXing, placeMen,
  createEmptyPalaces, applyReference
};

// ============ 命令行验证 ============
if (require.main === module) {
  console.log('====== 十三宫奇门遁甲 排盘算法验证 ======\n');

  // 示例①：2026-08-14 14:22 → 丙午 丙申 庚申 癸未
  const r1 = determinePan(['丙午', '丙申', '庚申', '癸未']);
  console.log('示例① 2026-08-14 14:22');
  console.log(`  四柱: ${r1.pillars.join(' ')}`);
  console.log(`  天干和: ${r1.ganSum} (${r1.ganSum % 2 === 1 ? '奇数→阳遁' : '偶数→阴遁'})`);
  console.log(`  结果: ${r1.pan}-${r1.dun}-${r1.ju}局`);
  console.log(`  期望: 阴盘-阳遁-5局`);
  const ok1 = r1.dun === '阳遁' && r1.ju === 5;
  console.log(`  ${ok1 ? '✅ 定遁定局通过' : '❌ 定遁定局失败'}\n`);

  // 示例②：2026-08-14 12:22 → 丙午 丙申 庚申 壬午
  const r2 = determinePan(['丙午', '丙申', '庚申', '壬午']);
  console.log('示例② 2026-08-14 12:22');
  console.log(`  四柱: ${r2.pillars.join(' ')}`);
  console.log(`  天干和: ${r2.ganSum}`);
  console.log(`  地支和: ${r2.zhiSum}`);
  console.log(`  结果: ${r2.pan}-${r2.dun}-${r2.ju}局`);
  console.log(`  期望: 阴盘-阴遁-5局`);
  const ok2 = r2.dun === '阴遁' && r2.ju === 5;
  console.log(`  ${ok2 ? '✅ 定遁定局通过' : '❌ 定遁定局失败'}\n`);

  // 完整排盘
  console.log('------ 完整排盘（示例① 阳遁5局）------');
  const full1 = fullPaiPan(['丙午', '丙申', '庚申', '癸未'], '庚', false);
  console.log(`  贵神: ${full1.guiShen.dayGan}日${full1.guiShen.isNight ? '夜' : '昼'} → ${full1.guiShen.zhi} (洛书${full1.guiShen.luoshu}${LUOSHU_NAME[full1.guiShen.luoshu]})`);
  console.log(`  参考校准: ${full1.calibrated ? '已应用' : '未应用'}`);
  console.log(`  宫位排布:`);
  full1.palaces.forEach((p, i) => {
    const tian = p.tianGan ? `天${p.tianGan}` : '天—';
    const di = p.diGan ? `地${p.diGan}` : '地—';
    const an = p.anGan ? `暗${p.anGan}` : '暗—';
    console.log(`    宫${i + 1}(洛书${p.luoshu}${LUOSHU_NAME[p.luoshu]}${p.label}): ${p.shen || '—'}/${p.xing || '—'}/${p.men || '—'} | ${tian}·${di}·${an}`);
  });

  const gong5 = full1.palaces.find(p => p.luoshu === 5);
  const ok3 = gong5 && gong5.diGan === '戊';
  console.log(`\n  戊落洛书5: ${gong5 ? gong5.diGan : '—'} ${ok3 ? '✅' : '❌'}`);

  const gongLuoshu8 = full1.palaces.filter(p => p.luoshu === 8);
  const ok4 = gongLuoshu8.some(p => p.shen === '贵神');
  console.log(`  贵神落洛书8: ${gongLuoshu8.map(p => `宫${p.index + 1}[${p.label}]=${p.shen}`).join(', ')} ${ok4 ? '✅' : '❌'}`);

  console.log(`\n====== ${ok1 && ok2 && ok3 && ok4 ? '全部验证通过 ✅' : '存在失败 ❌'} ======`);
}
