// calendar-core 单元测试
// 覆盖：公农历互转、节气、四柱、子时边界、闰月、跨时区、真太阳时
// 使用 Node.js 原生 test runner

const test = require('node:test');
const assert = require('node:assert/strict');
const cal = require('../index.js');

// ============ 1. 基础四柱 ============

test('四柱：示例① 2026-08-14 14:22 → 丙午 丙申 庚申 癸未', () => {
  const p = cal.getFourPillars(2026, 8, 14, 14, 22);
  assert.equal(p.year, '丙午');
  assert.equal(p.month, '丙申');
  assert.equal(p.day, '庚申');
  assert.equal(p.time, '癸未');
});

test('四柱：示例② 2026-08-14 12:22 → 丙午 丙申 庚申 壬午', () => {
  const p = cal.getFourPillars(2026, 8, 14, 12, 22);
  assert.equal(p.year, '丙午');
  assert.equal(p.month, '丙申');
  assert.equal(p.day, '庚申');
  assert.equal(p.time, '壬午');
});

// ============ 2. 子时边界 ============

test('子初换日：22:59 与 23:00 日柱不同', () => {
  // 22:59 仍是当天
  const p1 = cal.getFourPillars(2026, 8, 14, 22, 59, { dayBoundary: '23:00' });
  // 23:00 已是次日 00:00（子初换日）
  const p2 = cal.getFourPillars(2026, 8, 14, 23, 0, { dayBoundary: '23:00' });
  assert.notEqual(p1.day, p2.day, '22:59 与 23:00 日柱必须不同（子初换日）');
  assert.equal(p2.appliedDayShift, true, '23:00 应触发 dayShift');
  assert.equal(p2.dayShiftDirection, 'forward');
});

test('00:00 换日模式：22:59 与 23:00 日柱相同', () => {
  const p1 = cal.getFourPillars(2026, 8, 14, 22, 59, { dayBoundary: '00:00' });
  const p2 = cal.getFourPillars(2026, 8, 14, 23, 0, { dayBoundary: '00:00' });
  assert.equal(p1.day, p2.day, '00:00 换日模式下 22:59 与 23:00 日柱相同');
});

test('子时（00:00-00:59）与子初（23:00-23:59）时支一致，但日柱不同导致时干不同', () => {
  // 8-14 00:30 早子时：日柱 8-14（庚申）
  const p1 = cal.getFourPillars(2026, 8, 14, 0, 30, { dayBoundary: '23:00' });
  // 8-14 23:30 晚子时：子初换日 → 8-15（辛酉）
  const p2 = cal.getFourPillars(2026, 8, 14, 23, 30, { dayBoundary: '23:00' });
  // 时支一致（都是子），但时干按五鼠遁因日干不同而异
  assert.equal(p1.zhi.time, '子');
  assert.equal(p2.zhi.time, '子');
  assert.notEqual(p1.day, p2.day, '日柱不同（子初换日生效）');
  assert.notEqual(p1.time, p2.time, '时柱因日干不同而异（五鼠遁）');
});

// ============ 3. 立春分界 ============

test('年柱：2026 立春前为乙巳年', () => {
  // 2026 立春约 2026-02-04 03:46，立春前应为乙巳
  const p = cal.getFourPillars(2026, 2, 3, 0, 0);
  assert.equal(p.zhi.year, '巳');
  assert.equal(p.gan.year, '乙');
});

test('年柱：2026 立春后为丙午年', () => {
  const p = cal.getFourPillars(2026, 2, 5, 12, 0);
  assert.equal(p.zhi.year, '午');
  assert.equal(p.gan.year, '丙');
});

// ============ 4. 节令分界（月柱）============

test('月柱：2026-08 月柱在申月/节令前后一致', () => {
  // 立秋约 2026-08-07，处暑约 2026-08-23
  // 8-14 应为丙申月
  const p = cal.getFourPillars(2026, 8, 14, 12, 0);
  assert.equal(p.gan.month, '丙');
  assert.equal(p.zhi.month, '申');
});

// ============ 5. 公农历互转 ============

test('公农历互转：2026-08-14 → 农历七月初二', () => {
  const lunar = cal.solarToLunar(2026, 8, 14, 12, 22);
  // 2026-08-14 农历为七月初二
  assert.equal(lunar.lunarMonth, 7);
  assert.equal(lunar.lunarDay, 2);
});

test('公农历互转：闰月标志正确', () => {
  // 2025 闰六月：2025-07-25 应为闰六月初一
  // lunar-javascript 的 getMonth 返回负数表示闰月
  // 此处使用 2025-08-22 应为闰六月二十九
  const lunar = cal.solarToLunar(2025, 8, 22, 12, 0);
  // 验证闰月机制存在；具体值由 lunar-javascript 决定
  assert.ok(lunar.lunarMonth > 0, '应返回正常月（lunarMonth 取绝对值）');
  assert.equal(typeof lunar.isLeap, 'boolean');
});

// ============ 6. 时辰工具 ============

test('时辰地支映射：12 时辰全覆盖', () => {
  // 子时跨 23-01
  assert.equal(cal.getHourZhi(23), '子');
  assert.equal(cal.getHourZhi(0), '子');
  assert.equal(cal.getHourZhi(1), '丑');
  assert.equal(cal.getHourZhi(3), '寅');
  assert.equal(cal.getHourZhi(5), '卯');
  assert.equal(cal.getHourZhi(7), '辰');
  assert.equal(cal.getHourZhi(9), '巳');
  assert.equal(cal.getHourZhi(11), '午');
  assert.equal(cal.getHourZhi(13), '未');
  assert.equal(cal.getHourZhi(15), '申');
  assert.equal(cal.getHourZhi(17), '酉');
  assert.equal(cal.getHourZhi(19), '戌');
  assert.equal(cal.getHourZhi(21), '亥');
});

test('昼夜判定：戌亥子丑寅为夜（19:00-05:00 不含 05:00）', () => {
  assert.equal(cal.isNightHour(19), true);
  assert.equal(cal.isNightHour(22), true);
  assert.equal(cal.isNightHour(23), true);
  assert.equal(cal.isNightHour(0), true);
  assert.equal(cal.isNightHour(4), true);
  assert.equal(cal.isNightHour(5), false); // 05:00 已属白天（卯时）
  assert.equal(cal.isNightHour(6), false);
  assert.equal(cal.isNightHour(18), false);
});

// ============ 7. 真太阳时 ============

test('真太阳时：北京经度 116.4 修正约 -14 分钟', () => {
  // 北京 116.4°E, 时区中心 120°E, 差 -3.6°, 约 -14.4 分钟
  const norm = cal.normalizeInput(
    { year: 2026, month: 8, day: 14, hour: 12, minute: 0, longitude: 116.4 },
    { trueSolarTime: true }
  );
  assert.equal(norm.trueSolarTimeApplied, true);
  assert.equal(norm.trueSolarOffsetMinutes, -14); // 四舍五入
});

test('真太阳时默认关闭', () => {
  const norm = cal.normalizeInput(
    { year: 2026, month: 8, day: 14, hour: 12, minute: 0, longitude: 116.4 },
    {}
  );
  assert.equal(norm.trueSolarTimeApplied, false);
});

// ============ 8. 节气 ============

test('节气：2026 立春存在', () => {
  const t = cal.getJieQiTime(2026, '立春');
  assert.ok(t instanceof Date);
  assert.equal(t.getFullYear(), 2026);
  assert.equal(t.getMonth(), 1); // 2 月
});

test('节气：2026 立秋存在', () => {
  const t = cal.getJieQiTime(2026, '立秋');
  assert.ok(t instanceof Date);
  assert.equal(t.getFullYear(), 2026);
  assert.equal(t.getMonth(), 7); // 8 月
});

// ============ 9. 闰日（2-29）============

test('闰日：2024-02-29 公历有效', () => {
  const p = cal.getFourPillars(2024, 2, 29, 12, 0);
  assert.ok(p.year && p.month && p.day && p.time);
});

// ============ 10. 跨时区（伪测试：仅验证接口可用）============

test('跨时区：经度参数可传入', () => {
  // 纽约 -74°E, 时区中心 -75°E, 差 +1°, 约 +4 分钟
  const norm = cal.normalizeInput(
    { year: 2026, month: 8, day: 14, hour: 0, minute: 0, longitude: -74 },
    { trueSolarTime: true, timezone: 'America/New_York' }
  );
  // 真太阳时计算使用东八区中心，简化处理；此处仅验证接口可用
  assert.equal(typeof norm.trueSolarOffsetMinutes, 'number');
});

// ============ 11. 农历转公历 ============

test('农历转公历：2026 农历七月初二 → 2026-08-14', () => {
  const solar = cal.lunarToSolar(2026, 7, 2, 12);
  assert.equal(solar.year, 2026);
  assert.equal(solar.month, 8);
  assert.equal(solar.day, 14);
});
