// ziwei rules v1 — 紫微斗数规则表（基础三合盘）
// 一级依据：公版《紫微斗数全书》

// ============ 十二地支（宫位）============
const PALACES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 十二宫职
const PALACE_ROLES = [
  '命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫',
  '迁移宫', '交友宫', '官禄宫', '田宅宫', '福德宫', '父母宫'
];

// ============ 五行局（命宫干支 → 局）============
// 局: 水二 木三 金四 土五 火六
// 命宫干支 → 五行局表（60 甲子 → 局）
// 简化：直接根据命宫干支查表
const WUXING_JU = {
  '水二': 2, '木三': 3, '金四': 4, '土五': 5, '火六': 6
};

// 60 甲子 → 五行局（标准紫微斗数五行局表）
const JIAZI_TO_JU = {
  // 水二局
  '丙子': '水二', '丙寅': '火六', '丙辰': '土五', '丙午': '水二', '丙申': '火六', '丙戌': '土五',
  // 木三局
  '丁丑': '水二', '丁卯': '火六', '丁巳': '土五', '丁未': '水二', '丁酉': '火六', '丁亥': '土五',
  // 金四局
  '戊子': '火六', '戊寅': '土五', '戊辰': '木三', '戊午': '火六', '戊申': '土五', '戊戌': '木三',
  // 土五局
  '己丑': '火六', '己卯': '土五', '己巳': '木三', '己未': '火六', '己酉': '土五', '己亥': '木三',
  // 火六局
  '庚子': '土五', '庚寅': '木三', '庚辰': '水二', '庚午': '土五', '庚申': '木三', '庚戌': '水二',
  // 水二局
  '辛丑': '土五', '辛卯': '木三', '辛巳': '水二', '辛未': '土五', '辛酉': '木三', '辛亥': '水二',
  // 木三局
  '壬子': '木三', '壬寅': '水二', '壬辰': '金四', '壬午': '木三', '壬申': '水二', '壬戌': '金四',
  // 金四局
  '癸丑': '木三', '癸卯': '水二', '癸巳': '金四', '癸未': '木三', '癸酉': '水二', '癸亥': '金四',
  // 甲干
  '甲子': '金四', '甲寅': '水二', '甲辰': '火六', '甲午': '金四', '甲申': '水二', '甲戌': '火六',
  // 乙干
  '乙丑': '金四', '乙卯': '水二', '乙巳': '火六', '乙未': '金四', '乙酉': '水二', '乙亥': '火六',
};

// 紫微星定位表（按五行局 + 农历日数 → 紫微星所在宫地支）
// 公式：紫微星位置 = ZIWEI_TABLE[ju-2][day-1]
// ju: 2(水) 3(木) 4(金) 5(土) 6(火)
// day: 1-30
// 索引到 PALACES 中的地支
const ZIWEI_TABLE = [
  // 水二局 (ju=2)
  ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰','巳'],
  // 木三局 (ju=3)
  ['丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰','巳','午'],
  // 金四局 (ju=4)
  ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未'],
  // 土五局 (ju=5)
  ['卯','辰','巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未','申'],
  // 火六局 (ju=6)
  ['辰','巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未','申','酉'],
];

// ============ 十四主星 ============
const MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府',
  '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'
];

// 紫微星系定位（基于紫微星宫位逆推其他主星位置）
// 紫微星系：紫微、天机、太阳、武曲、天同、廉贞
// 天府星系：天府、太阴、贪狼、巨门、天相、天梁、七杀、破军

// 紫微星系：相对于紫微星宫位（按地支顺序）
// 紫微星在宫位 idx 后，其他星依次：
// 紫微 → 逆一位为天机 → 跳一位 → 太阳 → 武曲 → 天同 → 跳一位 → 廉贞
const ZIWEI_SERIES_OFFSET = {
  '紫微': 0,
  '天机': -1,   // 逆一位
  '太阳': -3,
  '武曲': -4,
  '天同': -5,
  '廉贞': -9,
};

// 天府星系：相对于天府星宫位（顺推）
// 天府 → 太阴 → 贪狼 → 巨门 → 天相 → 天梁 → 七杀 → 破军（顺序排）
const TIANFU_SERIES_OFFSET = {
  '天府': 0,
  '太阴': 1,
  '贪狼': 2,
  '巨门': 3,
  '天相': 4,
  '天梁': 5,
  '七杀': 6,
  '破军': 10,
};

// 紫微天府相对位置表（紫微→天府）
// 紫微在某宫 → 天府在对面（紫微子→天府寅等）
const ZIWEI_TO_TIANFU = {
  '子': '辰', '丑': '卯', '寅': '寅', '卯': '丑', '辰': '子',
  '巳': '亥', '午': '戌', '未': '酉', '申': '申', '酉': '未',
  '戌': '午', '亥': '巳'
};

// ============ 生年四化（中州派基础表）============
// 年干 → 四化（化禄/化权/化科/化忌）
const YEAR_TRANSFORMATIONS = {
  '甲': { '化禄': '廉贞', '化权': '破军', '化科': '武曲', '化忌': '太阳' },
  '乙': { '化禄': '天机', '化权': '天梁', '化科': '紫微', '化忌': '太阴' },
  '丙': { '化禄': '天同', '化权': '天机', '化科': '文昌', '化忌': '廉贞' },
  '丁': { '化禄': '太阴', '化权': '天同', '化科': '天机', '化忌': '巨门' },
  '戊': { '化禄': '贪狼', '化权': '太阴', '化科': '右弼', '化忌': '天机' },
  '己': { '化禄': '武曲', '化权': '贪狼', '化科': '天梁', '化忌': '文曲' },
  '庚': { '化禄': '太阳', '化权': '武曲', '化科': '太阴', '化忌': '天同' },
  '辛': { '化禄': '巨门', '化权': '太阳', '化科': '文曲', '化忌': '文昌' },
  '壬': { '化禄': '天梁', '化权': '紫微', '化科': '左辅', '化忌': '武曲' },
  '癸': { '化禄': '破军', '化权': '巨门', '化科': '太阴', '化忌': '贪狼' },
};

// ============ 大限 ============
// 大限起岁 = 五行局数（水二2岁、木三3岁、金四4岁、土五5岁、火六6岁）
// 大限顺逆：阳男阴女顺行，阴男阳女逆行
// 大限每宫10年，按地支顺序

// ============ 命宫 / 身宫 定位 ============
// 命宫：从寅宫起正月，顺数到生月，再从该宫起子时，逆数到生时
// 身宫：从寅宫起正月，顺数到生月，再从该宫起子时，顺数到生时

/**
 * 计算命宫地支
 * @param {number} lunarMonth 农历月（1-12）
 * @param {string} hourZhi 时辰地支
 * @returns {string} 命宫地支
 */
function calcMingGong(lunarMonth, hourZhi) {
  // 从寅宫起正月，顺数到生月
  // 寅 = index 2
  const startIdx = 2;  // 寅
  const monthIdx = (startIdx + lunarMonth - 1) % 12;

  // 从该宫起子时，逆数到生时
  const hourZhiIdx = PALACES.indexOf(hourZhi);
  const mingGongIdx = ((monthIdx - hourZhiIdx) % 12 + 12) % 12;
  return PALACES[mingGongIdx];
}

/**
 * 计算身宫地支
 * @param {number} lunarMonth 农历月
 * @param {string} hourZhi 时辰地支
 * @returns {string} 身宫地支
 */
function calcShenGong(lunarMonth, hourZhi) {
  const startIdx = 2;
  const monthIdx = (startIdx + lunarMonth - 1) % 12;
  const hourZhiIdx = PALACES.indexOf(hourZhi);
  // 顺数到生时
  const shenGongIdx = (monthIdx + hourZhiIdx) % 12;
  return PALACES[shenGongIdx];
}

// ============ 命宫干 ============
// 五虎遁：年干 → 寅宫天干
// 甲己之年丙作首，乙庚之岁戊为头，丙辛之年庚起，丁壬壬寅顺水流，戊癸之年甲寅求
const YEAR_GAN_TO_YIN_GAN = {
  '甲': '丙', '己': '丙',
  '乙': '戊', '庚': '戊',
  '丙': '庚', '辛': '庚',
  '丁': '壬', '壬': '壬',
  '戊': '甲', '癸': '甲'
};

/**
 * 命宫干支
 * @param {string} yearGan 年干
 * @param {string} mingGongZhi 命宫地支
 * @returns {string} 命宫干支
 */
function calcMingGongGanZhi(yearGan, mingGongZhi) {
  const yinGan = YEAR_GAN_TO_YIN_GAN[yearGan];
  if (!yinGan) return '?';
  const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const yinGanIdx = TIAN_GAN.indexOf(yinGan);
  const zhiIdx = PALACES.indexOf(mingGongZhi);
  // 从寅宫起 yinGan，顺数到命宫地支
  const yinZhiIdx = PALACES.indexOf('寅');
  const offset = (zhiIdx - yinZhiIdx + 12) % 12;
  const mingGan = TIAN_GAN[(yinGanIdx + offset) % 10];
  return mingGan + mingGongZhi;
}

// ============ 紫微星定位（核心）============
/**
 * 紫微星定位
 * @param {number} ju 五行局数 (2-6)
 * @param {number} lunarDay 农历日数 (1-30)
 * @returns {string} 紫微星所在宫地支
 */
function calcZiweiPos(ju, lunarDay) {
  const juIdx = ju - 2;
  const dayIdx = lunarDay - 1;
  if (juIdx < 0 || juIdx > 4 || dayIdx < 0 || dayIdx > 29) return '?';
  return ZIWEI_TABLE[juIdx][dayIdx];
}

// ============ 紫微星系安置 ============
/**
 * 安置紫微星系
 * @param {string} ziweiPos 紫微星所在宫
 * @returns {object} { '紫微': pos, '天机': pos, ... }
 */
function placeZiweiSeries(ziweiPos) {
  const ziweiIdx = PALACES.indexOf(ziweiPos);
  const result = {};
  for (const [star, offset] of Object.entries(ZIWEI_SERIES_OFFSET)) {
    const idx = ((ziweiIdx + offset) % 12 + 12) % 12;
    result[star] = PALACES[idx];
  }
  return result;
}

/**
 * 安置天府星系
 * @param {string} ziweiPos 紫微星所在宫
 * @returns {object}
 */
function placeTianfuSeries(ziweiPos) {
  const tianfuPos = ZIWEI_TO_TIANFU[ziweiPos];
  if (!tianfuPos) return {};
  const tianfuIdx = PALACES.indexOf(tianfuPos);
  const result = {};
  for (const [star, offset] of Object.entries(TIANFU_SERIES_OFFSET)) {
    const idx = (tianfuIdx + offset) % 12;
    result[star] = PALACES[idx];
  }
  return result;
}

// ============ 大限 ============
/**
 * 大限起岁
 * @param {string} ju 五行局名（"水二","木三","金四","土五","火六"）
 * @returns {number} 起岁
 */
function getDaXianStartAge(ju) {
  return WUXING_JU[ju] || 0;
}

/**
 * 大限顺逆
 * @param {string} yearGan 年干
 * @param {string} gender 性别
 * @returns {'顺'|'逆'}
 */
function getDaXianDirection(yearGan, gender) {
  // 阳男阴女顺，阴男阳女逆
  const yangGan = ['甲', '丙', '戊', '庚', '壬'];
  const isYang = yangGan.includes(yearGan);
  if (gender === '男') return isYang ? '顺' : '逆';
  return isYang ? '逆' : '顺';
}

/**
 * 计算大限序列（12 宫，每宫10年）
 * @param {string} mingGong 命宫地支
 * @param {number} startAge 起岁
 * @param {'顺'|'逆'} direction
 * @returns {object[]} 大限列表
 */
function generateDaXian(mingGong, startAge, direction) {
  const mingIdx = PALACES.indexOf(mingGong);
  const result = [];
  const step = direction === '顺' ? 1 : -1;
  for (let i = 0; i < 12; i++) {
    const idx = ((mingIdx + step * i) % 12 + 12) % 12;
    result.push({
      palace: PALACES[idx],
      startAge: startAge + i * 10,
      endAge: startAge + i * 10 + 9,
    });
  }
  return result;
}

// ============ 流年 ============
/**
 * 流年宫位（按虚岁）
 * @param {number} birthYear 出生年
 * @param {number} targetYear 目标年
 * @returns {string} 流年宫地支（太岁所在宫）
 */
function getYearlyPalace(birthYear, targetYear) {
  // 流年地支 = 目标年的年支
  // 简化：用 calendar-core 计算
  const cal = require('../../calendar-core/index.js');
  const pillars = cal.getFourPillars(targetYear, 6, 15, 12, 0);
  return pillars.zhi.year;
}

// ============ 导出 ============

module.exports = {
  RULESET_VERSION: 'ziwei-ruleset@v1',
  PALACES,
  PALACE_ROLES,
  WUXING_JU,
  JIAZI_TO_JU,
  ZIWEI_TABLE,
  MAJOR_STARS,
  ZIWEI_SERIES_OFFSET,
  TIANFU_SERIES_OFFSET,
  ZIWEI_TO_TIANFU,
  YEAR_TRANSFORMATIONS,
  YEAR_GAN_TO_YIN_GAN,
  calcMingGong,
  calcShenGong,
  calcMingGongGanZhi,
  calcZiweiPos,
  placeZiweiSeries,
  placeTianfuSeries,
  getDaXianStartAge,
  getDaXianDirection,
  generateDaXian,
  getYearlyPalace,
};
