// bazi engine — 四柱八字纯函数算法
// 不依赖 IO/UI/AI；通过 calendar-core 接口获取历法能力
// 算法版本：bazi-ruleset@v1
// 历法版本：calendar-core@1.0.0

const cal = require('../../calendar-core/index.js');
const rules = require('../rules/bazi-rules-v1.js');

const ALGORITHM_VERSION = 'bazi@1.0.0';
const RULESET = rules.RULESET_VERSION;

// ============ 主入口：四柱八字排盘 ============

/**
 * 四柱八字排盘
 *
 * @param {object} input - { year, month, day, hour, minute, gender, name?, longitude? }
 * @param {object} options - { dayBoundary, trueSolarTime, timezone }
 * @returns {object} 完整四柱八字结果（含中间过程）
 */
function paiPan(input, options = {}) {
  // 1. 标准化输入
  const norm = cal.normalizeInput(input, options);
  const opts = norm.options;

  // 2. 四柱
  const pillars = cal.getFourPillars(
    norm.normalizedInput.year,
    norm.normalizedInput.month,
    norm.normalizedInput.day,
    norm.normalizedInput.hour,
    norm.normalizedInput.minute,
    { dayBoundary: opts.dayBoundary }
  );

  // 3. 藏干（年月日时支）
  const hiddenStems = {
    year: rules.ZHI_CANG_GAN[pillars.zhi.year] || [],
    month: rules.ZHI_CANG_GAN[pillars.zhi.month] || [],
    day: rules.ZHI_CANG_GAN[pillars.zhi.day] || [],
    hour: rules.ZHI_CANG_GAN[pillars.zhi.time] || [],
  };

  // 4. 十神（以日干为我，对年/月/时干及各藏干）
  const dayGan = pillars.gan.day;
  const tenGods = {
    yearGan: rules.calcTenGod(dayGan, pillars.gan.year),
    monthGan: rules.calcTenGod(dayGan, pillars.gan.month),
    hourGan: rules.calcTenGod(dayGan, pillars.gan.time),
    yearHidden: (hiddenStems.year || []).map(g => rules.calcTenGod(dayGan, g)),
    monthHidden: (hiddenStems.month || []).map(g => rules.calcTenGod(dayGan, g)),
    dayHidden: (hiddenStems.day || []).map(g => rules.calcTenGod(dayGan, g)),
    hourHidden: (hiddenStems.hour || []).map(g => rules.calcTenGod(dayGan, g)),
  };

  // 5. 五行统计（天干 + 藏干按权重）
  const allStems = [
    pillars.gan.year, pillars.gan.month, pillars.gan.day, pillars.gan.time,
    ...(hiddenStems.year || []),
    ...(hiddenStems.month || []),
    ...(hiddenStems.day || []),
    ...(hiddenStems.hour || []),
  ];
  const visibleCount = rules.countWuxing([pillars.gan.year, pillars.gan.month, pillars.gan.day, pillars.gan.time]);
  const hiddenCount = rules.countWuxing([
    ...(hiddenStems.year || []),
    ...(hiddenStems.month || []),
    ...(hiddenStems.day || []),
    ...(hiddenStems.hour || []),
  ]);
  const totalCount = rules.countWuxing(allStems);

  // 6. 月令
  const yueLing = rules.getYueLing(pillars.zhi.month);

  // 7. 通根（日干）
  const zhis = [pillars.zhi.year, pillars.zhi.month, pillars.zhi.day, pillars.zhi.hour];
  const tongGen = rules.checkTongGen(dayGan, zhis);

  // 8. 透干（月令藏干透出）
  const touGan = rules.checkTouGan(pillars.zhi.month, [pillars.gan.year, pillars.gan.month, pillars.gan.day, pillars.gan.time]);

  // 9. 大运
  const luckDirection = rules.getLuckDirection(pillars.gan.year, input.gender || '男');
  const monthGanZhi = pillars.month;
  const luckCycles = rules.generateLuckCycles(monthGanZhi, luckDirection, 8);

  // 10. 起运岁数（简化版：使用 birthday 与下一节令）
  // 完整实现需要找节令时间，这里给出基本结构
  const birthTime = new Date(input.year, input.month - 1, input.day, input.hour || 0, input.minute || 0);
  let startLuckAge = null;
  try {
    // 找到当前月柱对应的节令（顺：下一节令；逆：上一节令）
    const jieQiName = findJieQiByMonth(input.month);
    if (jieQiName) {
      const jieQiTime = cal.getJieQiTime(input.year, jieQiName);
      if (jieQiTime) {
        startLuckAge = rules.calcStartAge(birthTime, jieQiTime, luckDirection);
      }
    }
  } catch (e) {
    // 节令查找失败，保留 null
  }

  // 11. 流年（出生年起 80 年）
  const yearlyCycles = [];
  for (let i = 0; i < 80; i++) {
    const y = input.year + i;
    const yearPillar = cal.getFourPillars(y, 6, 15, 12, 0);  // 用年中代表日
    yearlyCycles.push({ year: y, ganZhi: yearPillar.year });
  }

  // 12. 输出
  return {
    feature: 'bazi',
    algorithmVersion: ALGORITHM_VERSION,
    ruleset: RULESET,
    calendarVersion: cal.CALENDAR_VERSION,
    input,
    normalizedInput: norm.normalizedInput,
    options: {
      ...opts,
      gender: input.gender || '男',
      trueSolarTimeApplied: norm.trueSolarTimeApplied,
      trueSolarOffsetMinutes: norm.trueSolarOffsetMinutes,
    },
    pillars: {
      year: pillars.year,
      month: pillars.month,
      day: pillars.day,
      time: pillars.time,
      gan: pillars.gan,
      zhi: pillars.zhi,
    },
    hiddenStems,
    tenGods,
    elements: {
      visible: visibleCount,
      hidden: hiddenCount,
      total: totalCount,
      yueLing,
    },
    tongGen,
    touGan,
    startLuck: {
      direction: luckDirection,
      age: startLuckAge,
    },
    luckCycles,
    yearlyCycles,
    evidence: {
      dayBoundary: pillars.dayBoundary,
      appliedDayShift: pillars.appliedDayShift,
      dayShiftDirection: pillars.dayShiftDirection,
      originalInput: pillars.evidence.originalInput,
      shiftedInput: pillars.evidence.shiftedInput,
    },
    createdAt: new Date().toISOString(),
  };
}

// ============ 辅助：根据公历月份找节令名 ============
// 月柱节令对应（近似，具体节令由 calendar-core 节气表确定）
const MONTH_JIE = {
  1: '小寒', 2: '立春', 3: '惊蛰', 4: '清明',
  5: '立夏', 6: '芒种', 7: '小暑', 8: '立秋',
  9: '白露', 10: '寒露', 11: '立冬', 12: '大雪'
};

function findJieQiByMonth(month) {
  return MONTH_JIE[month] || null;
}

module.exports = {
  ALGORITHM_VERSION,
  RULESET,
  paiPan,
  findJieQiByMonth,
};
