// 四柱干支计算（公历时间 → 年月日时四柱）
// 基于 lunar-javascript 农历库
const { Solar, Lunar, LunarMonth } = require('lunar-javascript');
const { fullPaiPan: corePaiPan, determinePan, determineGuiShen, SHEN, XING, MEN, GONG_LAYOUT } = require('./qimen.js');

/**
 * 日排局第 N 月（当天农历月份）在指定农历年的实际天数
 * 依据【万年历】【阴历】：农历月仅有 29 天（小月）或 30 天（大月）
 * @param {number} lunarYear 农历年
 * @param {number} riPaiMonth 日排局第 N 月（当天农历月份 1-12）
 * @returns {number} 29 或 30（查询失败时保底 30）
 */
function getRiPaiMonthDays(lunarYear, riPaiMonth) {
  try {
    const lunarMonthObj = LunarMonth.fromYm(lunarYear, riPaiMonth);
    if (lunarMonthObj) {
      const days = lunarMonthObj.getDayCount();
      if (days === 29 || days === 30) return days;
    }
  } catch (e) { /* 超出历法范围时保底 */ }
  return 30;
}

/**
 * 公历时间 → 四柱（年月日时）
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day
 * @param {number} hour 0-23
 * @param {number} minute 0-59
 * @returns {{year,month,day,time}} 四柱
 */
function getFourPillars(year, month, day, hour, minute) {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute || 0, 0);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();
  return {
    year: bazi.getYear(),
    month: bazi.getMonth(),
    day: bazi.getDay(),
    time: bazi.getTime(),
    gan: { year: bazi.getYearGan(), month: bazi.getMonthGan(), day: bazi.getDayGan(), time: bazi.getTimeGan() },
    zhi: { year: bazi.getYearZhi(), month: bazi.getMonthZhi(), day: bazi.getDayZhi(), time: bazi.getTimeZhi() }
  };
}

/**
 * 判断时辰是否为夜晚
 * 戌时(19-21)至寅时(3-5)为晚上
 */
function isNightHour(hour) {
  return hour >= 19 || hour < 5;
}

/**
 * 时辰地支
 */
function hourZhi(hour) {
  const zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  if (hour === 23 || hour === 0) return '子';
  return zhi[Math.floor((hour + 1) / 2) % 12];
}

/**
 * 将 corePaiPan 返回结果整理为统一结构
 * @param {object} coreResult fullPaiPan 原始返回对象
 * @returns {{ pan: object, guiShen: object, palaces: object[] }}
 */
function computePan(coreResult) {
  return {
    pan: {
      pan: coreResult.pan,
      dun: coreResult.dun,
      ju: coreResult.ju,
      ganSum: coreResult.ganSum,
      zhiSum: coreResult.zhiSum,
    },
    guiShen: coreResult.guiShen,
    palaces: coreResult.palaces,
  };
}

function serializeSolar(solar) {
  if (!solar) return null;
  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    hour: solar.getHour(),
    minute: solar.getMinute(),
  };
}

function solarToLunar(year, month, day, hour, minute) {
  const solar = Solar.fromYmdHms(year, month, day, hour || 0, minute || 0, 0);
  const lunar = solar.getLunar();
  return {
    year: lunar.getYear(),
    month: Math.abs(lunar.getMonth()),
    day: lunar.getDay(),
    hour: solar.getHour(),
    minute: solar.getMinute(),
    isLeap: lunar.getMonth() < 0,
  };
}

function lunarToSolar(year, month, day, hour, minute, isLeap = false) {
  const lunar = Lunar.fromYmdHms(year, isLeap ? -Math.abs(month) : Math.abs(month), day, hour || 0, minute || 0, 0);
  return serializeSolar(lunar.getSolar());
}

/**
 * 完整排盘：公历时间 → 全盘信息
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @returns {object} 完整排盘结果
 */
function fullPaiPanFromTime(year, month, day, hour, minute) {
  const pillars = getFourPillars(year, month, day, hour, minute);
  const pillarArr = [pillars.year, pillars.month, pillars.day, pillars.time];
  const dayGan = pillars.gan.day;
  const night = isNightHour(hour);

  const solar = Solar.fromYmdHms(year, month, day, hour, minute || 0, 0);
  const lunar = solar.getLunar();
  const lunarMonth = lunar.getMonth();
  const lunarDay = lunar.getDay();
  const shiZhi = pillars.zhi.time;

  // 日排局第 N 月 = 当天农历月份；取其农历实际天数用于尾簇截断
  const riPaiMonth = lunarMonth;
  const riPaiMonthDays = getRiPaiMonthDays(lunar.getYear(), riPaiMonth);
  const prevJieQi = lunar.getPrevJieQi();
  const nextJieQi = lunar.getNextJieQi();

  const result = corePaiPan(pillarArr, dayGan, night, { lunarMonth, lunarDay, shiZhi, paiJuMonthDays: riPaiMonthDays });
  const yangResult = corePaiPan(pillarArr, dayGan, night, { lunarMonth, lunarDay, shiZhi, paiJuMonthDays: riPaiMonthDays }, '阳遁');
  const yinResult = corePaiPan(pillarArr, dayGan, night, { lunarMonth, lunarDay, shiZhi, paiJuMonthDays: riPaiMonthDays }, '阴遁');

  return {
    input: { year, month, day, hour, minute },
    pillars,
    pillarArr,
    ...computePan(result),
    layout: result.layout,
    luoshuCoords: result.luoshuCoords,
    calibrated: result.calibrated,
    lunarMonth,
    lunarDay,
    shiZhi,
    paiJuMonth: riPaiMonth,
    paiJuMonthDays: riPaiMonthDays,
    extraContext: { lunarMonth, lunarDay, shiZhi, paiJuMonthDays: riPaiMonthDays },
    lunar: {
      year: lunar.getYear(),
      yearGZ: lunar.getYearInGanZhi(),
      month: lunar.getMonthInChinese(),
      day: lunar.getDayInChinese(),
      hourZhi: lunar.getTimeZhi(),
      isLeap: lunar.getMonth() < 0,
    },
    jieQi: {
      prev: prevJieQi ? { name: prevJieQi.getName(), solar: serializeSolar(prevJieQi.getSolar()) } : null,
      next: nextJieQi ? { name: nextJieQi.getName(), solar: serializeSolar(nextJieQi.getSolar()) } : null,
    },
    yangResult: computePan(yangResult),
    yinResult: computePan(yinResult)
  };
}

// ============ 验证 ============
function test() {
  console.log('====== 四柱计算验证 ======\n');

  const p1 = getFourPillars(2026, 8, 14, 14, 22);
  console.log('示例① 2026-08-14 14:22');
  console.log(`  四柱: ${p1.year} ${p1.month} ${p1.day} ${p1.time}`);
  console.log(`  期望: 丙午 丙申 庚申 癸未`);
  const ok1 = p1.year === '丙午' && p1.month === '丙申' && p1.day === '庚申' && p1.time === '癸未';
  console.log(`  ${ok1 ? '✅ 通过' : '❌ 失败'}\n`);

  const p2 = getFourPillars(2026, 8, 14, 12, 22);
  console.log('示例② 2026-08-14 12:22');
  console.log(`  四柱: ${p2.year} ${p2.month} ${p2.day} ${p2.time}`);
  console.log(`  期望: 丙午 丙申 庚申 壬午`);
  const ok2 = p2.year === '丙午' && p2.month === '丙申' && p2.day === '庚申' && p2.time === '壬午';
  console.log(`  ${ok2 ? '✅ 通过' : '❌ 失败'}\n`);

  // 完整排盘验证
  console.log('------ 完整排盘测试 ------');
  const f1 = fullPaiPanFromTime(2026, 8, 14, 14, 22);
  console.log(`示例①: ${f1.pan.pan}-${f1.pan.dun}-${f1.pan.ju}局`);
  console.log(`  贵神: ${f1.guiShen.dayGan}日${f1.guiShen.isNight ? '夜' : '昼'} → ${f1.guiShen.zhi}`);
  console.log(`  宫位数量: ${f1.palaces.length}`);
  f1.palaces.slice(0, 3).forEach((p, i) => {
    console.log(`  宫${i+1}: ${p.shen}/${p.xing}/${p.men}`);
  });

  const f2 = fullPaiPanFromTime(2026, 8, 14, 12, 22);
  console.log(`\n示例②: ${f2.pan.pan}-${f2.pan.dun}-${f2.pan.ju}局`);

  return ok1 && ok2;
}

// 兼容性导出 - 保持 server.js 不变
function fullPaiPan(year, month, day, hour, minute) {
  return fullPaiPanFromTime(year, month, day, hour, minute);
}

module.exports = { 
  getFourPillars, 
  fullPaiPan, 
  isNightHour, 
  hourZhi,
  fullPaiPanFromTime,
  solarToLunar,
  lunarToSolar
};

if (require.main === module) {
  const ok = test();
  console.log(`\n====== ${ok ? '全部验证通过 ✅' : '存在失败 ❌'} ======`);
  process.exit(ok ? 0 : 1);
}
