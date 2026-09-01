// daliuren engine v1 — 大六壬排盘引擎
// 纯函数，无 IO/无 UI
// 依赖：calendar-core (历法/四柱/节气), daliuren-rules-v1
// 版本：v1.0.0 (2026-08-24 冻结)
//
// 不输出确定性吉凶承诺、批命结论、付费建议、社交字段

const cal = require('../../calendar-core');
const rules = require('../rules/daliuren-rules-v1.js');

const ALGORITHM_VERSION = 'daliuren@1.0.0';
const RULESET = 'daliuren-ruleset-v1';

/**
 * 大六壬排盘
 * @param {object} input - { year, month, day, hour, minute, location?, longitude?, timezone? }
 * @param {object} options - { dayBoundary, trueSolarTime, dayNightBoundary }
 * @returns {object} 完整排盘结果
 */
function paiPan(input, options = {}) {
  const norm = cal.normalizeInput(input, options);
  const opts = norm.options;

  // 四柱
  const pillars = cal.getFourPillars(
    norm.normalizedInput.year,
    norm.normalizedInput.month,
    norm.normalizedInput.day,
    norm.normalizedInput.hour,
    norm.normalizedInput.minute,
    { dayBoundary: opts.dayBoundary }
  );
  const dayGan = pillars.gan.day;
  const dayZhi = pillars.zhi.day;
  const hourZhi = pillars.zhi.time;

  // 时辰昼夜判定（用于天将贵人之昼夜）
  // calendar-core.isNightHour: 19:00-05:00 为夜
  // 但占时昼夜判定用的是「占时」本身，且更精细：日出到日落后2刻为昼，其余为夜
  // v1 简化：5:00-19:00 为昼，其余为夜
  const hour = norm.normalizedInput.hour;
  const isNight = hour >= 19 || hour < 5;

  // 月将
  const yueJiang = rules.calcYueJiang((y, qi) => {
    return cal.isAfterJieQi(
      y, 1, 1, 0, 0, qi  // 仅作中气判断
    );
  }, norm.normalizedInput.year);

  // 实际月将判定需精确：用占时与中气比较
  const yueJiangPrecise = calcYueJiangPrecise(
    norm.normalizedInput.year,
    norm.normalizedInput.month,
    norm.normalizedInput.day,
    norm.normalizedInput.hour,
    norm.normalizedInput.minute
  );

  // 天地盘
  const tianPan = rules.buildTianPan(yueJiangPrecise, hourZhi);

  // 四课
  const fourLessons = rules.calcFourLessons(tianPan, dayGan, dayZhi);

  // 三传
  const sanChuan = rules.calcSanChuan(fourLessons, tianPan, dayGan, dayZhi, yueJiangPrecise, hourZhi);

  // 天将
  const tianJiang = rules.placeTianJiang(dayGan, isNight, tianPan);

  // 天盘上12天将位置（每个天盘地支上对应一个天将）
  // 天将布在地盘位置上，对应「天盘上神」的天将
  // 实际上：天将索引(地盘位置) → 天将名
  // 每个天盘地支对应一个天将：tianJiangPosAtTianPan[天盘地支索引] = 天将
  const tianPanJiangMap = {};  // 天盘地支 → 天将
  for (let i = 0; i < 12; i++) {
    const tianPanZhi = tianPan[i];  // 该地盘位置的天盘地支
    const jiang = tianJiang.positions[i];  // 该地盘位置的天将
    tianPanJiangMap[tianPanZhi] = jiang;
  }

  // 三传上的天将
  const initialJiang = tianPanJiangMap[sanChuan.initial];
  const middleJiang = tianPanJiangMap[sanChuan.middle];
  const lastJiang = tianPanJiangMap[sanChuan.last];

  return {
    feature: 'daliuren',
    algorithmVersion: ALGORITHM_VERSION,
    ruleset: RULESET,
    calendarVersion: cal.CALENDAR_VERSION,
    input,
    normalizedInput: norm.normalizedInput,
    options: {
      ...opts,
      trueSolarTimeApplied: norm.trueSolarTimeApplied,
      dayNightBoundary: opts.dayNightBoundary || '5:00-19:00',
    },
    fourPillars: {
      year: pillars.year,
      month: pillars.month,
      day: pillars.day,
      time: pillars.time,
      gan: pillars.gan,
      zhi: pillars.zhi,
      dayBoundary: pillars.dayBoundary,
      appliedDayShift: pillars.appliedDayShift,
    },
    dayGan,
    dayZhi,
    hourZhi,
    isNight,
    yueJiang: yueJiangPrecise,
    tianPan,                       // 长度12数组：地盘位置 → 天盘地支
    diPan: rules.DI_ZHI.slice(),   // 地盘（固定）
    fourLessons,
    sanChuan: {
      initial: sanChuan.initial,
      middle: sanChuan.middle,
      last: sanChuan.last,
      initialDown: sanChuan.initialDown,
      middleDown: sanChuan.middleDown,
      lastDown: sanChuan.lastDown,
      method: sanChuan.method,
      trace: sanChuan.trace,
    },
    tianJiang: {
      positions: tianJiang.positions,  // 长度12：地盘位置 → 天将
      guirenZhi: tianJiang.guirenZhi,
      guirenPos: tianJiang.guirenPos,
      direction: tianJiang.direction === 1 ? '顺' : '逆',
      isNight,
    },
    sanChuanTianJiang: {
      initial: initialJiang,
      middle: middleJiang,
      last: lastJiang,
    },
    tianPanJiangMap,
    evidence: {
      yueJiang: yueJiangPrecise,
      hourZhi,
      dayGan,
      dayZhi,
      ganJiZhi: rules.GAN_JI_ZHI[dayGan],
      isNight,
    },
    createdAt: new Date().toISOString(),
  };
}

/**
 * 精确月将：用占时与各中气比较
 * 关键修正：lunar-javascript 的 getJieQiTime(year, '冬至') 返回的是「该阴历年的冬至」，
 * 即 lunar-year Y 的冬至实际落在 solar Y-1 的12月（例如 getJieQiTime(2026, '冬至') = 2025-12-21）。
 * 因此为找到「目标时刻之前最近一次该中气」，必须查询 year-1, year, year+1 三个阴历年，
 * 取所有「已过」中气中时刻最晚的一个。
 */
function calcYueJiangPrecise(year, month, day, hour, minute) {
  const target = new Date(year, month - 1, day, hour, minute, 0).getTime();
  const candidates = [];
  for (const yOff of [-1, 0, 1]) {
    const y = year + yOff;
    for (const [qi, jiang] of rules.YUEJIANG_BY_QI) {
      const dt = cal.getJieQiTime(y, qi);
      if (!dt) continue;
      const t = dt.getTime();
      if (target >= t) {
        candidates.push({ qi, jiang, time: t });
      }
    }
  }
  // 取时间最晚的（最近的已过中气）
  candidates.sort((a, b) => b.time - a.time);
  if (candidates.length > 0) return candidates[0].jiang;
  return '子';  // 默认（理论上不会到这）
}

module.exports = {
  paiPan,
  ALGORITHM_VERSION,
  RULESET,
};
