// 四柱干支计算（公历时间 → 年月日时四柱）
// 基于 lunar-javascript 农历库
const { Solar } = require('lunar-javascript');
const { fullPaiPan: corePaiPan, determinePan, determineGuiShen, SHEN, XING, MEN, GONG_LAYOUT } = require('./qimen.js');

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

  const result = corePaiPan(pillarArr, dayGan, night, { lunarMonth, lunarDay, shiZhi });

  return {
    input: { year, month, day, hour, minute },
    pillars,
    pillarArr,
    pan: {
      pan: result.pan,
      dun: result.dun,
      ju: result.ju,
      ganSum: result.ganSum,
      zhiSum: result.zhiSum
    },
    guiShen: result.guiShen,
    palaces: result.palaces,
    layout: result.layout,
    luoshuCoords: result.luoshuCoords,
    calibrated: result.calibrated,
    lunarMonth,
    lunarDay,
    shiZhi,
    extraContext: { lunarMonth, lunarDay, shiZhi }
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
  fullPaiPanFromTime 
};

if (require.main === module) {
  const ok = test();
  console.log(`\n====== ${ok ? '全部验证通过 ✅' : '存在失败 ❌'} ======`);
  process.exit(ok ? 0 : 1);
}
