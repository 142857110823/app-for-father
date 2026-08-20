// 十三宫奇门遁甲 - 排盘算法
// 依据：前言.docx + 排盘.docx + 完整的排盘.jpg
// 阴盘体系，支持阳遁/阴遁，13局（0-9局）

// ============ 基础数据 ============

/** 十天干（甲[1] 乙[2] 丙[3] 丁[4] 戊[5] 己[6] 庚[7] 辛[8] 壬[9] 癸[10]） */
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const TIAN_GAN_INDEX = {};
TIAN_GAN.forEach((g, i) => TIAN_GAN_INDEX[g] = i + 1);

/** 十二地支（子[1]~亥[12]） */
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const DI_ZHI_INDEX = {};
DI_ZHI.forEach((z, i) => DI_ZHI_INDEX[z] = i + 1);

/** 三奇六仪顺序：戊、己、庚、辛、壬、癸、丁、丙、乙 */
const SAN_QI_LIU_YI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

/** 八神默认顺序：贵神(值符)→腾蛇→朱雀→六合→勾陈→青龙→玄灵→九天→白虎→九地→玄武→太阴→天后 */
const SHEN = ['贵神', '腾蛇', '朱雀', '六合', '勾陈', '青龙', '玄灵', '九天', '白虎', '九地', '玄武', '太阴', '天后'];

/** 九星默认顺序：贪狼→天梁→巨门→禄存→文曲→天相→廉贞→天同→武曲→破军→左辅→天机→右弼 */
const XING = ['贪狼', '天梁', '巨门', '禄存', '文曲', '天相', '廉贞', '天同', '武曲', '破军', '左辅', '天机', '右弼'];

/** 八门默认顺序：休→死→吉→伤→杜→天→玄→冲→开→惊→从→生→景 */
const MEN = ['休', '死', '吉', '伤', '杜', '天', '玄', '冲', '开', '惊', '从', '生', '景'];

// ============ 十三宫空间布局 ============

/**
 * 传统洛书：
 *   4 9 2
 *   3 5 7
 *   8 1 6
 *
 * 十三宫由洛书衍生，形成13个宫位的环形序列
 * 方位序列（首尾标记）：
 *   4[首] 9[尾] 2[首] 4[尾] 5 7 3 6[尾] 8[尾] 8[首] 1 6[首] 2[尾]
 *
 * 各洛书位置的首/尾分配：
 *   洛书4: 首(宫1) + 尾(宫4)
 *   洛书9: 尾(宫2)
 *   洛书2: 首(宫3) + 尾(宫13)
 *   洛书5: 中(宫5)
 *   洛书7: (宫6)
 *   洛书3: (宫7)
 *   洛书6: 尾(宫8) + 首(宫12)
 *   洛书8: 尾(宫9) + 首(宫10)
 *   洛书1: (宫11)
 */
const GONG_LAYOUT = [
  { pos: 4, label: '首' },  // 宫1  → 洛书4(首)  巽
  { pos: 9, label: '尾' },  // 宫2  → 洛书9(尾)  离
  { pos: 2, label: '首' },  // 宫3  → 洛书2(首)  坤
  { pos: 4, label: '尾' },  // 宫4  → 洛书4(尾)  巽
  { pos: 5, label: ''   },  // 宫5  → 洛书5(中)  中
  { pos: 7, label: ''   },  // 宫6  → 洛书7      兑
  { pos: 3, label: ''   },  // 宫7  → 洛书3      震
  { pos: 6, label: '尾' },  // 宫8  → 洛书6(尾)  乾
  { pos: 8, label: '尾' },  // 宫9  → 洛书8(尾)  艮
  { pos: 8, label: '首' },  // 宫10 → 洛书8(首)  艮
  { pos: 1, label: ''   },  // 宫11 → 洛书1      坎
  { pos: 6, label: '首' },  // 宫12 → 洛书6(首)  乾
  { pos: 2, label: '尾' },  // 宫13 → 洛书2(尾)  坤
];

/** 洛书位置对应的九宫坐标（用于UI渲染） */
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

/**
 * 地支 → 洛书位置映射（基于八卦方位）
 *   子→坎(1)  丑寅→艮(8)  卯→震(3)  辰巳→巽(4)
 *   午→离(9)  未申→坤(2)  酉→兑(7)  戌亥→乾(6)
 */
const ZHI_TO_LUOSHU = {
  '子': 1, '丑': 8, '寅': 8, '卯': 3,
  '辰': 4, '巳': 4, '午': 9, '未': 2,
  '申': 2, '酉': 7, '戌': 6, '亥': 6
};

// ============ 辅助函数 ============

/**
 * 根据洛书位置查找宫位索引
 * 当同一洛书位置有多个宫时（首/尾），可指定优先选择
 *
 * @param {number} pos        洛书位置 (1-9)
 * @param {boolean} preferHead 是否优先选择"首"宫（默认true）
 * @returns {number} 宫位索引 (0-12)，未找到返回-1
 */
function findGongIndexByLuoshu(pos, preferHead) {
  preferHead = preferHead !== false;

  const candidates = [];
  for (let i = 0; i < GONG_LAYOUT.length; i++) {
    if (GONG_LAYOUT[i].pos === pos) {
      candidates.push(i);
    }
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

/**
 * 定遁：根据天干和的奇偶性
 * 奇数→阳遁，偶数→阴遁
 *
 * @param {number} ganSum 四柱天干序号之和
 * @returns {string} '阳遁' 或 '阴遁'
 */
function determineDun(ganSum) {
  return ganSum % 2 === 1 ? '阳遁' : '阴遁';
}

/**
 * 定局
 * 阳遁：天干和 ÷ 9 取余数（余0为9局）
 * 阴遁：地支和 ÷ 9 取余数（余0为9局）
 *
 * @param {string} dun     遁（'阳遁'/'阴遁'）
 * @param {number} ganSum  天干和
 * @param {number} zhiSum  地支和
 * @returns {number} 局数 (1-9)
 */
function determineJu(dun, ganSum, zhiSum) {
  const sum = dun === '阳遁' ? ganSum : zhiSum;
  const remainder = sum % 9;
  return remainder === 0 ? 9 : remainder;
}

/**
 * 完整定遁定局
 *
 * @param {string[]} pillarArr 四柱数组 [年, 月, 日, 时]，每项为'干支'格式
 * @returns {object} 定盘结果
 */
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

/**
 * 贵神口诀：
 *   甲戊庚牛羊，乙己鼠猴乡，
 *   丙丁猪鸡位，壬癸蛇兔藏，
 *   六辛逢马虎，此是贵人方。
 *
 * 牛=丑(白天)，羊=未(晚上)
 * 鼠=子(白天)，猴=申(晚上)
 * 猪=亥(白天)，鸡=酉(晚上)
 * 蛇=巳(白天)，兔=卯(晚上)
 * 马=午(白天)，虎=寅(晚上)
 *
 * @param {string} dayGan  日柱天干
 * @param {boolean} isNight 是否夜晚
 * @returns {string} 贵神所乘地支
 */
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
  if (!info) return '';
  return isNight ? info.night : info.day;
}

// ============ 核心排盘 ============

/**
 * 十三宫排盘核心函数
 *
 * 排布原则：
 *   1. 三奇六仪（戊己庚辛壬癸丁丙乙）布地盘
 *      - 第N局 → 戊落洛书N对应的"首"宫
 *      - 阳遁：顺行（索引递增）
 *      - 阴遁：逆行（索引递减）
 *
 *   2. 八神旋转
 *      - 贵神落宫为起始
 *      - 阳遁顺行，阴遁逆行
 *
 *   3. 九星旋转
 *      - 起始 = 贵神的下一宫（偏移1位）
 *      - 阳遁顺行，阴遁逆行
 *
 *   4. 八门旋转
 *      - 起始 = 九星的下一宫（再偏移1位）
 *      - 阳遁顺行，阴遁逆行
 *
 *   5. 天盘干 = 地盘旋转一个位置
 *      - 阳遁：天盘[i] = 地盘[i-1]（天盘超前）
 *      - 阴遁：天盘[i] = 地盘[i+1]（天盘落后）
 *
 *   6. 暗干 = 地盘干对冲位置（偏移6个宫位）
 *
 * @param {string[]} pillarArr 四柱 [年,月,日,时]
 * @param {string} dayGan      日柱天干
 * @param {boolean} isNight    是否夜晚
 * @returns {object} 完整排盘结果
 */
function fullPaiPan(pillarArr, dayGan, isNight) {
  const pan = determinePan(pillarArr);
  const guiShenZhi = determineGuiShen(dayGan, isNight);

  // 贵神落宫：地支→洛书→首宫
  const guiShenLuoshu = ZHI_TO_LUOSHU[guiShenZhi] || pan.ju;
  const shenStartIdx = findGongIndexByLuoshu(guiShenLuoshu, true);

  // 初始化13个宫位
  const palaces = Array.from({ length: 13 }, (_, i) => ({
    index: i,
    luoshu: GONG_LAYOUT[i].pos,
    label: GONG_LAYOUT[i].label,
    shen: '',
    xing: '',
    men: '',
    diGan: '',
    tianGan: '',
    anGan: ''
  }));

  // ========== 1. 排布三奇六仪（地盘干） ==========
  // 第N局 → 戊落洛书N对应的"首"宫
  const ganStartIdx = findGongIndexByLuoshu(pan.ju, true);

  if (pan.dun === '阳遁') {
    for (let i = 0; i < 9; i++) {
      const idx = (ganStartIdx + i) % 13;
      palaces[idx].diGan = SAN_QI_LIU_YI[i];
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const idx = (ganStartIdx - i + 13) % 13;
      palaces[idx].diGan = SAN_QI_LIU_YI[i];
    }
  }

  // ========== 2. 排布八神（神盘） ==========
  if (shenStartIdx >= 0) {
    for (let i = 0; i < 13; i++) {
      const idx = pan.dun === '阳遁'
        ? (shenStartIdx + i) % 13
        : (shenStartIdx - i + 13) % 13;
      palaces[idx].shen = SHEN[i];
    }
  }

  // ========== 3. 排布九星（星盘） ==========
  // 九星起始 = 贵神所落宫的下一宫
  const xingStartIdx = pan.dun === '阳遁'
    ? (shenStartIdx + 1) % 13
    : (shenStartIdx - 1 + 13) % 13;

  for (let i = 0; i < 13; i++) {
    const idx = pan.dun === '阳遁'
      ? (xingStartIdx + i) % 13
      : (xingStartIdx - i + 13) % 13;
    palaces[idx].xing = XING[i];
  }

  // ========== 4. 排布八门（人盘） ==========
  // 八门起始 = 九星起始的下一宫
  const menStartIdx = pan.dun === '阳遁'
    ? (xingStartIdx + 1) % 13
    : (xingStartIdx - 1 + 13) % 13;

  for (let i = 0; i < 13; i++) {
    const idx = pan.dun === '阳遁'
      ? (menStartIdx + i) % 13
      : (menStartIdx - i + 13) % 13;
    palaces[idx].men = MEN[i];
  }

  // ========== 5. 天盘干 ==========
  // 天盘 = 地盘旋转一个位置
  for (let i = 0; i < 13; i++) {
    const srcIdx = pan.dun === '阳遁'
      ? (i - 1 + 13) % 13
      : (i + 1) % 13;
    palaces[i].tianGan = palaces[srcIdx].diGan;
  }

  // ========== 6. 暗干 ==========
  // 暗干 = 地盘干对冲位置（偏移6个宫位）
  for (let i = 0; i < 13; i++) {
    const oppositeIdx = (i + 6) % 13;
    palaces[i].anGan = palaces[oppositeIdx].diGan;
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
    luoshuCoords: LUOSHU_POS
  };
}

/**
 * 旧版API兼容 - 单函数排盘（默认白天）
 */
function paiPan(pillarArr) {
  const dayGan = pillarArr[2][0];
  return fullPaiPan(pillarArr, dayGan, false);
}

/**
 * 排布元素（用于外部接口）
 */
function arrangeElements(elementArr, dun, startIdx) {
  const result = new Array(13).fill('');
  for (let i = 0; i < elementArr.length; i++) {
    const idx = dun === '阳遁'
      ? (startIdx + i) % 13
      : (startIdx - i + 13) % 13;
    result[idx] = elementArr[i];
  }
  return result;
}

// ============ 导出 ============
module.exports = {
  // 常量
  TIAN_GAN, TIAN_GAN_INDEX,
  DI_ZHI, DI_ZHI_INDEX,
  SAN_QI_LIU_YI,
  SHEN, XING, MEN,
  GONG_LAYOUT, LUOSHU_POS, LUOSHU_NAME,
  ZHI_TO_LUOSHU,

  // 辅助函数
  findGongIndexByLuoshu,

  // 核心函数
  determineDun, determineJu, determinePan,
  determineGuiShen, fullPaiPan, paiPan,
  arrangeElements
};

// ============ 命令行验证 ============
if (require.main === module) {
  console.log('====== 十三宫奇门遁甲 排盘算法验证 ======\n');

  // ---- 定遁定局验证 ----

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

  // ---- 完整排盘验证 ----

  console.log('------ 完整排盘（示例① 阳遁5局）------');
  const full1 = fullPaiPan(['丙午', '丙申', '庚申', '癸未'], '庚', false);
  console.log(`  贵神: ${full1.guiShen.dayGan}日${full1.guiShen.isNight ? '夜' : '昼'} → ${full1.guiShen.zhi} (洛书${full1.guiShen.luoshu}${LUOSHU_NAME[full1.guiShen.luoshu]})`);
  console.log(`  宫位排布:`);
  full1.palaces.forEach((p, i) => {
    const ganInfo = p.diGan
      ? `地${p.diGan}`
      : '地—';
    const tianInfo = p.tianGan ? `天${p.tianGan}` : '天—';
    const anInfo = p.anGan ? `暗${p.anGan}` : '暗—';
    console.log(`    宫${i + 1}(洛书${p.luoshu}${LUOSHU_NAME[p.luoshu]}${p.label}): ${p.shen || '—'}/${p.xing || '—'}/${p.men || '—'} | ${tianInfo}·${ganInfo}·${anInfo}`);
  });

  // 地盘干验证：阳遁5局，戊应在洛书5
  const gong5 = full1.palaces.find(p => p.luoshu === 5);
  const ok3 = gong5 && gong5.diGan === '戊';
  console.log(`\n  戊落洛书5: ${gong5 ? gong5.diGan : '—'} ${ok3 ? '✅' : '❌'}`);

  // 贵神落宫验证：庚日白天→丑→洛书8
  const gongLuoshu8 = full1.palaces.filter(p => p.luoshu === 8);
  const ok4 = gongLuoshu8.some(p => p.shen === '贵神');
  console.log(`  贵神落洛书8: ${gongLuoshu8.map(p => `宫${p.index + 1}[${p.label}]=${p.shen}`).join(', ')} ${ok4 ? '✅' : '❌'}`);

  console.log(`\n====== ${ok1 && ok2 && ok3 && ok4 ? '全部验证通过 ✅' : '存在失败 ❌'} ======`);
}