// bazi rules v1 — 四柱八字规则表（冻结）
// 一级依据：公版《子平真诠》《滴天髓》；二级依据：lunar-javascript 黑盒回归
// 不输出综合旺衰分数；不输出确定性强弱断语

// ============ 天干地支基础 ============

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 天干五行
const GAN_WUXING = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

// 天干阴阳
const GAN_YINYANG = {
  '甲': '阳', '乙': '阴',
  '丙': '阳', '丁': '阴',
  '戊': '阳', '己': '阴',
  '庚': '阳', '辛': '阴',
  '壬': '阳', '癸': '阴',
};

// 地支五行
const ZHI_WUXING = {
  '子': '水', '丑': '土',
  '寅': '木', '卯': '木',
  '辰': '土', '巳': '火',
  '午': '火', '未': '土',
  '申': '金', '酉': '金',
  '戌': '土', '亥': '水',
};

// 地支阴阳
const ZHI_YINYANG = {
  '子': '阳', '丑': '阴', '寅': '阳', '卯': '阴',
  '辰': '阳', '巳': '阴', '午': '阳', '未': '阴',
  '申': '阳', '酉': '阴', '戌': '阳', '亥': '阴',
};

// ============ 地支藏干（子平真诠标准）============

// 三合局 / 三会局会影响藏干判定，但 v1 直接使用子平真诠固定表
const ZHI_CANG_GAN = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

// 藏干本/中/余气分（用于月令通根与透干权重，v1 仅记录不计算综合分数）
const ZHI_CANG_GAN_WEIGHT = {
  '子': [1.0],
  '丑': [0.6, 0.3, 0.1],
  '寅': [0.6, 0.3, 0.1],
  '卯': [1.0],
  '辰': [0.6, 0.3, 0.1],
  '巳': [0.6, 0.3, 0.1],
  '午': [0.7, 0.3],
  '未': [0.6, 0.3, 0.1],
  '申': [0.6, 0.3, 0.1],
  '酉': [1.0],
  '戌': [0.6, 0.3, 0.1],
  '亥': [0.7, 0.3],
};

// ============ 十神 ============

// 五行生克关系
const WUXING_SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const WUXING_KE = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

/**
 * 计算十神：以日干为我，看与某天干的关系
 * @param {string} dayGan 日干
 * @param {string} targetGan 目标天干
 * @returns {string} 十神名（比肩/劫财/食神/伤官/偏财/正财/七杀/正官/偏印/正印）
 */
function calcTenGod(dayGan, targetGan) {
  const me = GAN_WUXING[dayGan];
  const other = GAN_WUXING[targetGan];
  const sameYinYang = GAN_YINYANG[dayGan] === GAN_YINYANG[targetGan];

  if (me === other) {
    return sameYinYang ? '比肩' : '劫财';
  }
  if (WUXING_SHENG[me] === other) {
    // 我生
    return sameYinYang ? '食神' : '伤官';
  }
  if (WUXING_SHENG[other] === me) {
    // 生我
    return sameYinYang ? '偏印' : '正印';
  }
  if (WUXING_KE[me] === other) {
    // 我克
    return sameYinYang ? '偏财' : '正财';
  }
  if (WUXING_KE[other] === me) {
    // 克我
    return sameYinYang ? '七杀' : '正官';
  }
  return '?';
}

// ============ 五行统计 ============

function countWuxing(stems /* string[] */) {
  const counts = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  for (const s of stems) {
    if (GAN_WUXING[s]) counts[GAN_WUXING[s]]++;
  }
  return counts;
}

// ============ 月令 ============

/**
 * 月令：月支本气五行
 */
function getYueLing(monthZhi) {
  const cangGan = ZHI_CANG_GAN[monthZhi];
  if (!cangGan || cangGan.length === 0) return null;
  return GAN_WUXING[cangGan[0]];
}

// ============ 通根 ============

/**
 * 通根：检查某天干在地支藏干中是否有根
 * @param {string} gan 天干
 * @param {string[]} zhis 地支数组
 * @returns {object} { hasRoot, rootZhi, rootType }
 */
function checkTongGen(gan, zhis) {
  const ganWx = GAN_WUXING[gan];
  for (const zhi of zhis) {
    const cangGan = ZHI_CANG_GAN[zhi] || [];
    for (let i = 0; i < cangGan.length; i++) {
      if (GAN_WUXING[cangGan[i]] === ganWx) {
        const rootType = i === 0 ? '本气' : i === 1 ? '中气' : '余气';
        return { hasRoot: true, rootZhi: zhi, rootType, rootGan: cangGan[i] };
      }
    }
  }
  return { hasRoot: false, rootZhi: null, rootType: null, rootGan: null };
}

// ============ 透干 ============

/**
 * 透干：检查月令藏干是否透出在天干
 * @param {string} monthZhi 月支
 * @param {string[]} gans 天干数组
 * @returns {object[]} 透干列表
 */
function checkTouGan(monthZhi, gans) {
  const cangGan = ZHI_CANG_GAN[monthZhi] || [];
  const results = [];
  const seen = new Set();
  for (const cg of cangGan) {
    if (gans.includes(cg) && !seen.has(cg)) {
      results.push({ cangGan: cg, inGans: gans.filter(g => g === cg) });
      seen.add(cg);
    }
  }
  return results;
}

// ============ 大运 ============

/**
 * 大运顺逆：阳年男/阴年女顺，阴年男/阳年女逆
 * @param {string} yearGan 年干
 * @param {string} gender 性别 '男'|'女'
 * @returns {'顺'|'逆'}
 */
function getLuckDirection(yearGan, gender) {
  const yearIsYang = GAN_YINYANG[yearGan] === '阳';
  if (gender === '男') {
    return yearIsYang ? '顺' : '逆';
  } else {
    return yearIsYang ? '逆' : '顺';
  }
}

/**
 * 起运岁数：3天折1岁（精确到年/月/日）
 * 顺行：从出生到下一个节令的天数 / 3
 * 逆行：从上一个节令到出生的天数 / 3
 *
 * @param {Date} birthTime 出生日期
 * @param {Date} jieQiTime 节令时间（顺=下一个节令；逆=上一个节令）
 * @param {'顺'|'逆'} direction
 * @returns {object} { years, months, days, rawDays }
 */
function calcStartAge(birthTime, jieQiTime, direction) {
  let diffMs;
  if (direction === '顺') {
    diffMs = jieQiTime.getTime() - birthTime.getTime();
  } else {
    diffMs = birthTime.getTime() - jieQiTime.getTime();
  }
  // 折算为天数
  const rawDays = diffMs / 86400000;
  // 3天 = 1年, 1天 = 4个月, 1时辰=10天? 传统：3天=1岁, 1天=4个月, 1时辰=10天, 1小时=5天
  // 简化：3天=1年, 1天=4月（即0.3333年）
  const totalYears = rawDays / 3;
  const years = Math.floor(totalYears);
  const remainingYears = totalYears - years;
  const months = Math.floor(remainingYears * 12);
  const days = Math.floor((remainingYears * 12 - months) * 30);
  return { years, months, days, rawDays };
}

/**
 * 生成大运序列：从起运岁开始，按顺/逆排月柱
 *
 * @param {string} monthGanZhi 月柱干支（如 "丙申"）
 * @param {'顺'|'逆'} direction 顺/逆
 * @param {number} count 大运数量（默认 8）
 * @returns {string[]} 大运干支数组
 */
function generateLuckCycles(monthGanZhi, direction, count = 8) {
  // 60 甲子表
  const JIAZI = [];
  for (let i = 0; i < 60; i++) {
    JIAZI.push(TIAN_GAN[i % 10] + DI_ZHI[i % 12]);
  }
  const startIdx = JIAZI.indexOf(monthGanZhi);
  if (startIdx < 0) return [];
  const result = [];
  const step = direction === '顺' ? 1 : -1;
  for (let i = 1; i <= count; i++) {
    const idx = ((startIdx + step * i) % 60 + 60) % 60;
    result.push(JIAZI[idx]);
  }
  return result;
}

// ============ 流年 ============

/**
 * 流年：从出生年起，逐年的干支
 * @param {number} birthYear 出生年（公历）
 * @param {number} count 流年数量
 * @returns {object[]} { year, ganZhi }
 */
function generateYearlyCycles(birthYear, count = 80) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const y = birthYear + i;
    // 年柱以立春为分界，简化处理：直接用 lunar-javascript 的年柱计算
    // 此处只生成标识，实际年柱由 calendar-core 计算
    result.push({ year: y });
  }
  return result;
}

// ============ 导出 ============

module.exports = {
  RULESET_VERSION: 'bazi-ruleset@v1',
  TIAN_GAN, DI_ZHI,
  GAN_WHUXING: GAN_WUXING,
  GAN_YINYANG,
  ZHI_WUXING,
  ZHI_YINYANG,
  ZHI_CANG_GAN,
  ZHI_CANG_GAN_WEIGHT,
  WUXING_SHENG,
  WUXING_KE,
  calcTenGod,
  countWuxing,
  getYueLing,
  checkTongGen,
  checkTouGan,
  getLuckDirection,
  calcStartAge,
  generateLuckCycles,
  generateYearlyCycles,
};
