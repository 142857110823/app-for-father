// meihua engine — 梅花易数纯函数算法
// 支持时间起卦、数字起卦
// 算法版本：meihua@1.0.0
// 历法版本：calendar-core@1.0.0

const cal = require('../../calendar-core/index.js');
const rules = require('../rules/meihua-rules-v1.js');

const ALGORITHM_VERSION = 'meihua@1.0.0';
const RULESET = rules.RULESET_VERSION;

// ============ 时间起卦 ============
// 公版《梅花易数》原文：
//   农历年月日时数之和除以 8 余数为上卦
//   年月日时数之和除以 8 余数为下卦
//   年月日时数之和除以 6 余数为动爻
//   余数为 0 时按 8 或 6 处理

const ZHI_NUMBER = {
  '子': 1, '丑': 2, '寅': 3, '卯': 4,
  '辰': 5, '巳': 6, '午': 7, '未': 8,
  '申': 9, '酉': 10, '戌': 11, '亥': 12
};

/**
 * 时间起卦
 * @param {object} input - { year, month, day, hour, minute, longitude? }
 * @param {object} options - { dayBoundary, trueSolarTime, timezone }
 * @returns {object} 起卦结果（含中间过程）
 */
function timeDivination(input, options = {}) {
  const norm = cal.normalizeInput(input, options);
  const opts = norm.options;

  // 农历转换
  const lunar = cal.solarToLunar(
    norm.normalizedInput.year,
    norm.normalizedInput.month,
    norm.normalizedInput.day,
    norm.normalizedInput.hour,
    norm.normalizedInput.minute
  );

  // 公历年 → 农历年，需根据立春判定
  // 简化：用 lunar.lunarYear
  const lunarYear = lunar.lunarYear;
  const lunarMonth = lunar.lunarMonth;
  const lunarDay = lunar.lunarDay;

  // 时辰地支数
  const hourZhi = cal.getHourZhi(norm.normalizedInput.hour);
  const hourZhiNum = ZHI_NUMBER[hourZhi];

  // 农历年支数（子1丑2...亥12）
  // lunar-javascript getYearShengXiao / getYearZhi
  // 这里取公历年后通过立春判定年柱地支
  // 简化：直接取农历年的年支
  // 农历年 → 用 calendar-core 计算
  const yearPillar = cal.getFourPillars(
    norm.normalizedInput.year,
    norm.normalizedInput.month,
    norm.normalizedInput.day,
    norm.normalizedInput.hour,
    norm.normalizedInput.minute,
    { dayBoundary: opts.dayBoundary }
  );
  const yearZhi = yearPillar.zhi.year;
  const yearZhiNum = ZHI_NUMBER[yearZhi];

  // 总数
  const total = yearZhiNum + lunarMonth + lunarDay + hourZhiNum;

  // 上卦：年月日时数之和 ÷ 8 取余
  const upperMod = total % 8;
  const upperNum = upperMod === 0 ? 8 : upperMod;
  const upperTrigram = rules.XIANTIAN_BAGUA[upperNum - 1];

  // 下卦：年月日时数之和 ÷ 8 取余
  // 公版原文：上下卦分别用 (年月日时和) ÷ 8 取余
  // 不同流派存在两种写法：
  //   A. 上下卦共用同一总数 ÷ 8
  //   B. 上卦 = 年月日数 ÷ 8，下卦 = 年月日时数 ÷ 8
  // 本规则集 v1 采用 A（共用同总数）
  const lowerMod = total % 8;
  const lowerNum = lowerMod === 0 ? 8 : lowerMod;
  const lowerTrigram = rules.XIANTIAN_BAGUA[lowerNum - 1];

  // 动爻：总数 ÷ 6 取余
  const movingMod = total % 6;
  const movingLine = movingMod === 0 ? 6 : movingMod;

  // 组成本卦六爻（自下而上）
  const yaoLines = trigramToYao(lowerTrigram).concat(trigramToYao(upperTrigram));

  // 互卦
  const mutual = rules.calcMutualHexagram(yaoLines);
  const mutualUpper = rules.trigramFromYao(mutual.upper);
  const mutualLower = rules.trigramFromYao(mutual.lower);

  // 变卦
  const changedYao = rules.calcChangedHexagram(yaoLines, movingLine);
  const changedUpper = rules.trigramFromYao(changedYao.slice(3, 6));
  const changedLower = rules.trigramFromYao(changedYao.slice(0, 3));

  // 体用判定
  const tiYong = rules.calcTiYong(yaoLines, movingLine);
  const bodyTrigram = tiYong.body === 'upper' ? upperTrigram : lowerTrigram;
  const useTrigram = tiYong.use === 'upper' ? upperTrigram : lowerTrigram;

  // 五行关系
  const bodyWx = rules.BAGUA_WUXING[bodyTrigram];
  const useWx = rules.BAGUA_WUXING[useTrigram];
  const relation = rules.getWuxingRelation(bodyWx, useWx);

  // 本卦/互卦/变卦名
  const primaryHexagram = rules.getHexagramName(upperTrigram, lowerTrigram);
  const mutualHexagram = rules.getHexagramName(mutualUpper, mutualLower);
  const changedHexagram = rules.getHexagramName(changedUpper, changedLower);

  return {
    feature: 'meihua',
    method: 'time',
    algorithmVersion: ALGORITHM_VERSION,
    ruleset: RULESET,
    calendarVersion: cal.CALENDAR_VERSION,
    input,
    normalizedInput: norm.normalizedInput,
    options: {
      ...opts,
      trueSolarTimeApplied: norm.trueSolarTimeApplied,
    },
    arithmetic: [
      { step: '年支数', value: yearZhiNum, source: `${yearZhi}=${yearZhiNum}` },
      { step: '农历月数', value: lunarMonth },
      { step: '农历日数', value: lunarDay },
      { step: '时支数', value: hourZhiNum, source: `${hourZhi}=${hourZhiNum}` },
      { step: '总数', value: total, formula: '年支+月+日+时支' },
      { step: '上卦', value: upperTrigram, formula: `${total} % 8 = ${upperMod}${upperMod === 0 ? ' → 8' : ''}` },
      { step: '下卦', value: lowerTrigram, formula: `${total} % 8 = ${lowerMod}${lowerMod === 0 ? ' → 8' : ''}` },
      { step: '动爻', value: movingLine, formula: `${total} % 6 = ${movingMod}${movingMod === 0 ? ' → 6' : ''}` },
    ],
    primaryHexagram: {
      name: primaryHexagram,
      upper: upperTrigram,
      lower: lowerTrigram,
      yaoLines,
    },
    movingLine,
    mutualHexagram: {
      name: mutualHexagram,
      upper: mutualUpper,
      lower: mutualLower,
    },
    changedHexagram: {
      name: changedHexagram,
      upper: changedUpper,
      lower: changedLower,
      yaoLines: changedYao,
    },
    bodyTrigram,
    useTrigram,
    elementRelations: {
      body: bodyWx,
      use: useWx,
      relation,
    },
    evidence: {
      lunarYear,
      lunarMonth,
      lunarDay,
      hourZhi,
      totalSum: total,
    },
    createdAt: new Date().toISOString(),
  };
}

// ============ 数字起卦 ============
// 公版《梅花易数》：
//   第一数 ÷ 8 取余为上卦
//   第二数 ÷ 8 取余为下卦
//   两数之和 ÷ 6 取余为动爻

function numberDivination(input, options = {}) {
  if (!input.numbers || input.numbers.length < 2) {
    throw new Error('数字起卦需要两个正整数');
  }
  const num1 = parseInt(input.numbers[0], 10);
  const num2 = parseInt(input.numbers[1], 10);
  if (!Number.isInteger(num1) || !Number.isInteger(num2) || num1 <= 0 || num2 <= 0) {
    throw new Error('两个数字必须为正整数');
  }

  const upperMod = num1 % 8;
  const upperNum = upperMod === 0 ? 8 : upperMod;
  const upperTrigram = rules.XIANTIAN_BAGUA[upperNum - 1];

  const lowerMod = num2 % 8;
  const lowerNum = lowerMod === 0 ? 8 : lowerMod;
  const lowerTrigram = rules.XIANTIAN_BAGUA[lowerNum - 1];

  const sum = num1 + num2;
  const movingMod = sum % 6;
  const movingLine = movingMod === 0 ? 6 : movingMod;

  const yaoLines = trigramToYao(lowerTrigram).concat(trigramToYao(upperTrigram));

  const mutual = rules.calcMutualHexagram(yaoLines);
  const mutualUpper = rules.trigramFromYao(mutual.upper);
  const mutualLower = rules.trigramFromYao(mutual.lower);

  const changedYao = rules.calcChangedHexagram(yaoLines, movingLine);
  const changedUpper = rules.trigramFromYao(changedYao.slice(3, 6));
  const changedLower = rules.trigramFromYao(changedYao.slice(0, 3));

  const tiYong = rules.calcTiYong(yaoLines, movingLine);
  const bodyTrigram = tiYong.body === 'upper' ? upperTrigram : lowerTrigram;
  const useTrigram = tiYong.use === 'upper' ? upperTrigram : lowerTrigram;

  const bodyWx = rules.BAGUA_WUXING[bodyTrigram];
  const useWx = rules.BAGUA_WUXING[useTrigram];
  const relation = rules.getWuxingRelation(bodyWx, useWx);

  const primaryHexagram = rules.getHexagramName(upperTrigram, lowerTrigram);
  const mutualHexagram = rules.getHexagramName(mutualUpper, mutualLower);
  const changedHexagram = rules.getHexagramName(changedUpper, changedLower);

  return {
    feature: 'meihua',
    method: 'number',
    algorithmVersion: ALGORITHM_VERSION,
    ruleset: RULESET,
    calendarVersion: cal.CALENDAR_VERSION,
    input,
    normalizedInput: { numbers: [num1, num2] },
    options: {},
    arithmetic: [
      { step: '第一数', value: num1 },
      { step: '第二数', value: num2 },
      { step: '两数之和', value: sum },
      { step: '上卦', value: upperTrigram, formula: `${num1} % 8 = ${upperMod}${upperMod === 0 ? ' → 8' : ''}` },
      { step: '下卦', value: lowerTrigram, formula: `${num2} % 8 = ${lowerMod}${lowerMod === 0 ? ' → 8' : ''}` },
      { step: '动爻', value: movingLine, formula: `${sum} % 6 = ${movingMod}${movingMod === 0 ? ' → 6' : ''}` },
    ],
    primaryHexagram: {
      name: primaryHexagram,
      upper: upperTrigram,
      lower: lowerTrigram,
      yaoLines,
    },
    movingLine,
    mutualHexagram: {
      name: mutualHexagram,
      upper: mutualUpper,
      lower: mutualLower,
    },
    changedHexagram: {
      name: changedHexagram,
      upper: changedUpper,
      lower: changedLower,
      yaoLines: changedYao,
    },
    bodyTrigram,
    useTrigram,
    elementRelations: {
      body: bodyWx,
      use: useWx,
      relation,
    },
    evidence: {
      numbers: [num1, num2],
      sum,
    },
    createdAt: new Date().toISOString(),
  };
}

// ============ 辅助 ============
function trigramToYao(trigram) {
  // 三爻自下而上
  const map = {
    '乾': [1, 1, 1],
    '兑': [1, 1, 0],
    '离': [1, 0, 1],
    '震': [1, 0, 0],
    '巽': [0, 1, 1],
    '坎': [0, 1, 0],
    '艮': [0, 0, 1],
    '坤': [0, 0, 0],
  };
  return map[trigram] || [0, 0, 0];
}

module.exports = {
  ALGORITHM_VERSION,
  RULESET,
  timeDivination,
  numberDivination,
  ZHI_NUMBER,
  trigramToYao,
};
