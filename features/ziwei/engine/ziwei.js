// ziwei engine — 紫微斗数纯函数算法
// 算法版本：ziwei@1.0.0
// 历法版本：calendar-core@1.0.0

const cal = require('../../calendar-core/index.js');
const rules = require('../rules/ziwei-rules-v1.js');

const ALGORITHM_VERSION = 'ziwei@1.0.0';
const RULESET = rules.RULESET_VERSION;

/**
 * 紫微斗数排盘
 * @param {object} input - { year, month, day, hour, minute, gender, lunarMonth?, lunarDay?, isLeap? }
 * @param {object} options - { dayBoundary, trueSolarTime, timezone }
 * @returns {object} 完整紫微盘
 */
function paiPan(input, options = {}) {
  const norm = cal.normalizeInput(input, options);
  const opts = norm.options;

  // 农历
  const lunar = cal.solarToLunar(
    norm.normalizedInput.year,
    norm.normalizedInput.month,
    norm.normalizedInput.day,
    norm.normalizedInput.hour,
    norm.normalizedInput.minute
  );
  let lunarMonth = lunar.lunarMonth;
  let lunarDay = lunar.lunarDay;

  // 闰月处理：归前月
  if (lunar.isLeap && lunarMonth > 0) {
    // v1 简化：闰月归前月
    // 已是绝对值，无需再处理
  }

  // 时辰地支
  const hourZhi = cal.getHourZhi(norm.normalizedInput.hour);

  // 四柱（用于年干判定）
  const pillars = cal.getFourPillars(
    norm.normalizedInput.year,
    norm.normalizedInput.month,
    norm.normalizedInput.day,
    norm.normalizedInput.hour,
    norm.normalizedInput.minute,
    { dayBoundary: opts.dayBoundary }
  );
  const yearGan = pillars.gan.year;
  const yearZhi = pillars.zhi.year;

  // 命宫、身宫
  const soulPalace = rules.calcMingGong(lunarMonth, hourZhi);
  const bodyPalace = rules.calcShenGong(lunarMonth, hourZhi);

  // 命宫干支
  const mingGongGanZhi = rules.calcMingGongGanZhi(yearGan, soulPalace);

  // 五行局
  const juName = rules.JIAZI_TO_JU[mingGongGanZhi] || '水二';
  const juNumber = rules.WUXING_JU[juName];

  // 紫微星
  const ziweiPos = rules.calcZiweiPos(juNumber, lunarDay);

  // 安置紫微星系
  const ziweiSeries = rules.placeZiweiSeries(ziweiPos);

  // 安置天府星系
  const tianfuSeries = rules.placeTianfuSeries(ziweiPos);

  // 合并所有主星
  const allStars = { ...ziweiSeries, ...tianfuSeries };

  // 生年四化
  const transformations = rules.YEAR_TRANSFORMATIONS[yearGan] || {};

  // 十二宫职（从命宫起，逆时针为命兄夫子财疾迁友官田福父）
  // 命宫在 soulPalace，逆时针排列
  const palaceList = [];
  const soulIdx = rules.PALACES.indexOf(soulPalace);
  for (let i = 0; i < 12; i++) {
    const idx = ((soulIdx - i) % 12 + 12) % 12;
    const zhi = rules.PALACES[idx];
    const role = rules.PALACE_ROLES[i];
    const majorStars = [];
    for (const [star, pos] of Object.entries(allStars)) {
      if (pos === zhi) majorStars.push(star);
    }
    palaceList.push({
      earthlyBranch: zhi,
      role,
      heavenlyStem: mingGongGanZhi[0],
      majorStars,
      minorStars: [],
      transformations: [],
    });
  }

  // 标注四化星所在宫
  for (const [trans, star] of Object.entries(transformations)) {
    const targetPos = allStars[star];
    if (targetPos) {
      const palace = palaceList.find(p => p.earthlyBranch === targetPos);
      if (palace) {
        palace.transformations.push({ star, type: trans });
      }
    }
  }

  // 身宫所在宫职
  const bodyPalacePalace = palaceList.find(p => p.earthlyBranch === bodyPalace);
  const bodyPalaceRole = bodyPalacePalace ? bodyPalacePalace.role : '?';

  // 大限
  const startAge = rules.getDaXianStartAge(juName);
  const direction = rules.getDaXianDirection(yearGan, input.gender || '男');
  const decadal = rules.generateDaXian(soulPalace, startAge, direction);

  // 流年（取出生年后 80 年）
  const yearly = [];
  for (let i = 0; i < 80; i++) {
    const y = input.year + i;
    const yearlyPalace = rules.getYearlyPalace(input.year, y);
    yearly.push({ year: y, palace: yearlyPalace });
  }

  return {
    feature: 'ziwei',
    algorithmVersion: ALGORITHM_VERSION,
    ruleset: RULESET,
    calendarVersion: cal.CALENDAR_VERSION,
    input,
    normalizedInput: norm.normalizedInput,
    options: {
      ...opts,
      gender: input.gender || '男',
      trueSolarTimeApplied: norm.trueSolarTimeApplied,
    },
    lunarDate: {
      lunarYear: lunar.lunarYear,
      lunarMonth,
      lunarDay,
      isLeap: lunar.isLeap,
      hourZhi,
    },
    soulPalace,
    bodyPalace,
    bodyPalaceRole,
    fiveElementClass: juName,
    fiveElementNumber: juNumber,
    mingGongGanZhi,
    ziweiPos,
    ziweiSeries,
    tianfuSeries,
    allStars,
    transformations,
    palaces: palaceList,
    decadal,
    yearly,
    evidence: {
      yearGan,
      yearZhi,
      lunarMonth,
      lunarDay,
      hourZhi,
    },
    createdAt: new Date().toISOString(),
  };
}

module.exports = {
  ALGORITHM_VERSION,
  RULESET,
  paiPan,
};
