// calendar-core 历法核心：纯函数，无 IO/无 UI
// 依赖：lunar-javascript (固定 ^1.6.11)
// 版本：v1.0.0 (2026-08-24 冻结)
//
// 默认规则：
//   - 子时换日：23:00 子初
//   - 年柱分界：立春
//   - 月柱分界：节令
//   - 时区：用户所在地，默认 Asia/Shanghai
//   - 真太阳时：可选，默认关闭

const { Solar, Lunar } = require('lunar-javascript');

// ============ 常量 ============

const CALENDAR_VERSION = 'calendar-core@1.0.0';

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 时辰地支 → 时段映射（子时跨 23:00-01:00）
// 子初换日：23:00 当天日柱+1
function hourToZhi(hour) {
  if (hour === 23 || hour === 0) return '子';
  // 1:00-2:59 丑, 3:00-4:59 寅, ...
  const idx = Math.floor((hour + 1) / 2) % 12;
  return DI_ZHI[idx];
}

// 是否为夜子时（23:00-23:59）
function isLateNightHour(hour, minute) {
  return hour === 23;
}

// 是否为早子时（00:00-00:59）
function isEarlyMorningHour(hour) {
  return hour === 0;
}

// ============ 标准化输入 ============

/**
 * 标准化历法输入
 * @param {object} input - { year, month, day, hour, minute, location?, longitude?, timezone? }
 * @param {object} options - { dayBoundary: '23:00'|'00:00', trueSolarTime: bool }
 * @returns {object} 标准化输入 + 选项
 */
function normalizeInput(input, options = {}) {
  const opts = {
    dayBoundary: options.dayBoundary || '23:00',
    trueSolarTime: options.trueSolarTime === true,
    timezone: options.timezone || input.timezone || 'Asia/Shanghai',
  };

  let { year, month, day, hour, minute } = input;
  if (minute == null) minute = 0;
  if (hour == null) hour = 0;

  // 真太阳时修正（可选，需经度）
  let trueSolarTimeApplied = false;
  let trueSolarOffsetMinutes = 0;
  if (opts.trueSolarTime && input.longitude != null) {
    // 时区中心经度（东八区为 120°E）
    const tzOffsetHours = 8; // 默认 Asia/Shanghai
    const tzCentralLongitude = tzOffsetHours * 15;
    const deltaLongitude = input.longitude - tzCentralLongitude;
    trueSolarOffsetMinutes = Math.round(deltaLongitude * 4); // 每度 4 分钟
    const totalMinutes = hour * 60 + minute + trueSolarOffsetMinutes;
    hour = Math.floor(totalMinutes / 60) % 24;
    minute = ((totalMinutes % 60) + 60) % 60;
    if (totalMinutes < 0) {
      // 跨日回退（罕见，仅极端西部）
      const d = new Date(Date.UTC(year, month - 1, day) - 86400000);
      year = d.getUTCFullYear();
      month = d.getUTCMonth() + 1;
      day = d.getUTCDate();
    }
    trueSolarTimeApplied = true;
  }

  return {
    normalizedInput: {
      year, month, day, hour, minute,
      longitude: input.longitude,
      location: input.location,
      timezone: opts.timezone,
    },
    options: opts,
    trueSolarTimeApplied,
    trueSolarOffsetMinutes,
  };
}

// ============ 公历 ↔ 农历 ============

/**
 * 公历转农历（含闰月标志）
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @returns {object} { lunarYear, lunarMonth, lunarDay, isLeap, lunarMonthIndex, jieQi }
 */
function solarToLunar(year, month, day, hour, minute = 0) {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const lunarMonth = lunar.getMonth();
  const lunarDay = lunar.getDay();
  const lunarYear = lunar.getYear();
  // lunar-javascript 的 getMonth() 返回负数表示闰月（如 -8 表示闰八月）
  const isLeap = lunarMonth < 0;
  const absMonth = Math.abs(lunarMonth);
  return {
    lunarYear,
    lunarMonth: absMonth,
    lunarDay,
    isLeap,
    lunarMonthIndex: isLeap ? -absMonth : absMonth,
    lunarMonthName: lunar.getMonthInChinese(),
    jieQi: lunar.getJieQi(),  // 当前节气名（若无返回空字符串）
    solarTerm: lunar.getJie(),  // 节令
    currentQi: lunar.getQi(),   // 中气
    ganZhiYear: lunar.getYearInGanZhi(),
    ganZhiMonth: lunar.getMonthInGanZhi(),
    ganZhiDay: lunar.getDayInGanZhi(),
  };
}

/**
 * 农历转公历
 * @param {number} lunarYear
 * @param {number} lunarMonth 正数=普通月, 负数=闰月
 * @param {number} lunarDay
 * @param {number} hour
 * @returns {object} 公历
 */
function lunarToSolar(lunarYear, lunarMonth, lunarDay, hour = 0) {
  // lunar-javascript Lunar.fromYmdHms 接收闰月时 month 为负数
  const lunar = Lunar.fromYmdHms(lunarYear, lunarMonth, lunarDay, hour, 0, 0);
  const solar = lunar.getSolar();
  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    hour,
  };
}

// ============ 节气 ============

/**
 * 获取某年某节气的精确时刻
 * @param {number} year
 * @param {string} jieQiName - 如 '立春'、'惊蛰'、'清明'
 * @returns {Date} 节气时刻
 */
function getJieQiTime(year, jieQiName) {
  const lunar = Lunar.fromYmdHms(year, 1, 1, 0, 0, 0);
  const jieQiTable = lunar.getJieQiTable();
  const dt = jieQiTable[jieQiName];
  if (!dt) return null;
  return new Date(dt.getYear(), dt.getMonth() - 1, dt.getDay(), dt.getHour(), dt.getMinute(), dt.getSecond());
}

/**
 * 判断给定时刻是否已过某节气
 */
function isAfterJieQi(year, month, day, hour, minute, jieQiName) {
  const jieQiTime = getJieQiTime(year, jieQiName);
  if (!jieQiTime) return false;
  const target = new Date(year, month - 1, day, hour, minute, 0);
  return target.getTime() >= jieQiTime.getTime();
}

// ============ 干支（四柱）============

/**
 * 计算四柱干支
 * 关键规则：
 *   - 年柱：以立春为分界（非农历正月初一）
 *   - 月柱：以节令为分界（非农历初一）
 *   - 日柱：子初 23:00 换日（默认）；可选 00:00 换日
 *   - 时柱：12 时辰，子时跨 23-01
 *
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day
 * @param {number} hour 0-23
 * @param {number} minute 0-59
 * @param {object} options - { dayBoundary: '23:00'|'00:00' }
 * @returns {object} { year, month, day, time, gan, zhi, dayBoundary, evidence }
 */
function getFourPillars(year, month, day, hour, minute = 0, options = {}) {
  const dayBoundary = options.dayBoundary || '23:00';

  // 子初换日：23:00-23:59 算下一日的日柱
  // lunar-javascript 默认使用早子时（00:00 换日），所以需要手动调整
  let solarYear = year;
  let solarMonth = month;
  let solarDay = day;
  let solarHour = hour;
  let solarMinute = minute;
  let appliedDayShift = false;
  let dayShiftDirection = '';

  if (dayBoundary === '23:00' && hour === 23) {
    // 子初换日：将时间推到次日 00:00，与 lunar-javascript 的早子时对齐
    const next = new Date(Date.UTC(year, month - 1, day) + 86400000);
    solarYear = next.getUTCFullYear();
    solarMonth = next.getUTCMonth() + 1;
    solarDay = next.getUTCDate();
    solarHour = 0;
    solarMinute = minute;
    appliedDayShift = true;
    dayShiftDirection = 'forward';  // 23:00 当天 → 次日 00:00
  }

  const solar = Solar.fromYmdHms(solarYear, solarMonth, solarDay, solarHour, solarMinute, 0);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();

  return {
    year: bazi.getYear(),
    month: bazi.getMonth(),
    day: bazi.getDay(),
    time: bazi.getTime(),
    gan: {
      year: bazi.getYearGan(),
      month: bazi.getMonthGan(),
      day: bazi.getDayGan(),
      time: bazi.getTimeGan(),
    },
    zhi: {
      year: bazi.getYearZhi(),
      month: bazi.getMonthZhi(),
      day: bazi.getDayZhi(),
      time: bazi.getTimeZhi(),
    },
    dayBoundary,
    appliedDayShift,
    dayShiftDirection,
    evidence: {
      originalInput: { year, month, day, hour, minute },
      shiftedInput: { solarYear, solarMonth, solarDay, solarHour, solarMinute },
    },
  };
}

// ============ 时辰工具 ============

/**
 * 公历小时 → 时辰地支
 */
function getHourZhi(hour) {
  return hourToZhi(hour);
}

/**
 * 是否为夜时辰（戌、亥、子、丑、寅，即 19:00-05:00）
 * 用于贵人昼夜判定
 */
function isNightHour(hour) {
  return hour >= 19 || hour < 5;
}

// ============ 导出 ============

module.exports = {
  CALENDAR_VERSION,
  TIAN_GAN,
  DI_ZHI,
  // 标准化
  normalizeInput,
  // 公农历互转
  solarToLunar,
  lunarToSolar,
  // 节气
  getJieQiTime,
  isAfterJieQi,
  // 四柱
  getFourPillars,
  // 时辰工具
  hourToZhi,
  getHourZhi,
  isNightHour,
  isLateNightHour,
  isEarlyMorningHour,
};
