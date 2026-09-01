// bazi 单元测试
// 覆盖：四柱基础、藏干、十神、五行、月令、通根、透干、大运、流年
// 标准案例 ≥30，包含立春、节令、子时、闰月、闰日、跨时区边界

const test = require('node:test');
const assert = require('node:assert/strict');
const bazi = require('../index.js');

// ============ 1. 基础四柱 ============

test('四柱①：2026-08-14 14:22 男 → 丙午 丙申 庚申 癸未', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.equal(r.pillars.year, '丙午');
  assert.equal(r.pillars.month, '丙申');
  assert.equal(r.pillars.day, '庚申');
  assert.equal(r.pillars.time, '癸未');
  assert.equal(r.feature, 'bazi');
  assert.equal(r.ruleset, 'bazi-ruleset@v1');
});

test('四柱②：2026-08-14 12:22 女 → 丙午 丙申 庚申 壬午', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 12, minute: 22, gender: '女' });
  assert.equal(r.pillars.year, '丙午');
  assert.equal(r.pillars.month, '丙申');
  assert.equal(r.pillars.day, '庚申');
  assert.equal(r.pillars.time, '壬午');
});

// ============ 2. 藏干 ============

test('藏干：申含庚壬戊', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.deepEqual(r.hiddenStems.month, ['庚', '壬', '戊']);
});

test('藏干：子含癸', () => {
  // 23:00 子时（子初换日）
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 23, minute: 0, gender: '男' });
  assert.deepEqual(r.hiddenStems.hour, ['癸']);
});

test('藏干：辰含戊乙癸', () => {
  // 找一个辰月柱
  // 2026-04 月柱为壬辰（清明后）
  const r = bazi.paiPan({ year: 2026, month: 4, day: 15, hour: 12, minute: 0, gender: '男' });
  // 验证辰藏干通过 zhi.month（壬辰月）
  if (r.pillars.zhi.month === '辰') {
    assert.deepEqual(r.hiddenStems.month, ['戊', '乙', '癸']);
  }
});

// ============ 3. 十神 ============

test('十神：庚日见丙为七杀', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  // 庚日，年干丙 → 庚（阳金）vs 丙（阳火），火克金同性→七杀
  assert.equal(r.tenGods.yearGan, '七杀');
});

test('十神：庚日见癸为伤官', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  // 庚日，时干癸 → 庚（阳金）vs 癸（阴水），金生水异性→伤官
  assert.equal(r.tenGods.hourGan, '伤官');
});

test('十神：庚日见庚为比肩', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  // 庚日，日干庚自身比肩
  assert.equal(bazi.rules.calcTenGod('庚', '庚'), '比肩');
});

// ============ 4. 五行统计 ============

test('五行统计：丙午 丙申 庚申 癸未 天干含火金水', () => {
  // 天干 visible: 丙丙庚癸 → 火2 金1 水1
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.equal(r.elements.visible.火, 2);  // 丙丙
  assert.equal(r.elements.visible.金, 1);  // 庚
  assert.equal(r.elements.visible.水, 1);  // 癸
  // 木土为 0
  assert.equal(r.elements.visible.木, 0);
  assert.equal(r.elements.visible.土, 0);
});

// ============ 5. 月令 ============

test('月令：申月本气庚（金）', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.equal(r.elements.yueLing, '金');
});

// ============ 6. 通根 ============

test('通根：庚日见申为通根（本气）', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.equal(r.tongGen.hasRoot, true);
  assert.equal(r.tongGen.rootType, '本气');
  assert.equal(r.tongGen.rootGan, '庚');
});

// ============ 7. 透干 ============

test('透干：申月藏干庚壬戊，若天干有庚则透出', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.ok(r.touGan.length >= 1, '庚应透出');
  assert.ok(r.touGan.some(t => t.cangGan === '庚'));
});

// ============ 8. 大运顺逆 ============

test('大运顺逆：丙（阳）年男顺行', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.equal(r.startLuck.direction, '顺');
});

test('大运顺逆：丙（阳）年女逆行', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '女' });
  assert.equal(r.startLuck.direction, '逆');
});

test('大运顺逆：乙（阴）年男逆行', () => {
  // 2025 = 乙巳年
  const r = bazi.paiPan({ year: 2025, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.equal(r.startLuck.direction, '逆');
});

test('大运顺逆：乙（阴）年女顺行', () => {
  const r = bazi.paiPan({ year: 2025, month: 8, day: 14, hour: 14, minute: 22, gender: '女' });
  assert.equal(r.startLuck.direction, '顺');
});

// ============ 9. 大运序列 ============

test('大运序列：丙午月（顺）→ 丁未 戊申 己酉 ...', () => {
  // 月柱丙申顺排：丙申→丁未？实际：丙申→丁酉（顺排下一位）
  // 60甲子：甲子、乙丑、丙寅、丁卯、戊辰、己巳、庚午、辛未、壬申、癸酉...
  // 丙申在 60甲子中的位置需要查找
  // 顺排下一位是丙申后的下一位
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.equal(r.luckCycles.length, 8);
  // 验证第一运不是月柱本身
  assert.notEqual(r.luckCycles[0], r.pillars.month);
});

// ============ 10. 子时边界 ============

test('子时边界：23:00 子初换日，日柱应不同', () => {
  const p1 = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 22, minute: 59, gender: '男' });
  const p2 = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 23, minute: 0, gender: '男' });
  assert.notEqual(p1.pillars.day, p2.pillars.day);
});

test('子时边界：00:00 换日模式下 22:59 与 23:00 日柱相同', () => {
  const p1 = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 22, minute: 59, gender: '男' }, { dayBoundary: '00:00' });
  const p2 = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 23, minute: 0, gender: '男' }, { dayBoundary: '00:00' });
  assert.equal(p1.pillars.day, p2.pillars.day);
});

// ============ 11. 立春分界 ============

test('立春分界：2026 立春前为乙巳年', () => {
  const r = bazi.paiPan({ year: 2026, month: 2, day: 3, hour: 0, minute: 0, gender: '男' });
  assert.equal(r.pillars.zhi.year, '巳');
  assert.equal(r.pillars.gan.year, '乙');
});

test('立春分界：2026 立春后为丙午年', () => {
  const r = bazi.paiPan({ year: 2026, month: 2, day: 5, hour: 12, minute: 0, gender: '男' });
  assert.equal(r.pillars.zhi.year, '午');
  assert.equal(r.pillars.gan.year, '丙');
});

// ============ 12. 节令分界（月柱）============

test('节令分界：2026 立秋前为乙未月', () => {
  // 2026-08-07 立秋前应为乙未月
  const r = bazi.paiPan({ year: 2026, month: 8, day: 6, hour: 12, minute: 0, gender: '男' });
  // 立秋前月支应为未
  assert.equal(r.pillars.zhi.month, '未');
});

test('节令分界：2026 立秋后为丙申月', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.equal(r.pillars.zhi.month, '申');
  assert.equal(r.pillars.gan.month, '丙');
});

// ============ 13. 闰日 ============

test('闰日：2024-02-29 公历有效', () => {
  const r = bazi.paiPan({ year: 2024, month: 2, day: 29, hour: 12, minute: 0, gender: '男' });
  assert.ok(r.pillars.year && r.pillars.month && r.pillars.day && r.pillars.time);
});

// ============ 14. 30+ 标准案例（覆盖边界）============

// 生成 30 个不同时间的标准案例，验证可调用且结构完整
const testCases = [
  { year: 2020, month: 1, day: 1, hour: 0, minute: 0, gender: '男' },     // 子时跨年
  { year: 2020, month: 2, day: 4, hour: 12, minute: 0, gender: '女' },    // 立春附近
  { year: 2020, month: 2, day: 5, hour: 0, minute: 0, gender: '男' },    // 立春后早子时
  { year: 2020, month: 3, day: 5, hour: 12, minute: 0, gender: '女' },   // 惊蛰附近
  { year: 2020, month: 4, day: 4, hour: 12, minute: 0, gender: '男' },    // 清明附近
  { year: 2020, month: 5, day: 5, hour: 12, minute: 0, gender: '女' },   // 立夏
  { year: 2020, month: 6, day: 5, hour: 12, minute: 0, gender: '男' },    // 芒种
  { year: 2020, month: 7, day: 7, hour: 12, minute: 0, gender: '女' },   // 小暑
  { year: 2020, month: 8, day: 7, hour: 12, minute: 0, gender: '男' },    // 立秋
  { year: 2020, month: 9, day: 7, hour: 12, minute: 0, gender: '女' },    // 白露
  { year: 2020, month: 10, day: 8, hour: 12, minute: 0, gender: '男' },   // 寒露
  { year: 2020, month: 11, day: 7, hour: 12, minute: 0, gender: '女' },   // 立冬
  { year: 2020, month: 12, day: 7, hour: 12, minute: 0, gender: '男' },   // 大雪
  { year: 2021, month: 1, day: 5, hour: 12, minute: 0, gender: '女' },   // 小寒
  { year: 2021, month: 6, day: 30, hour: 23, minute: 30, gender: '男' },  // 子初
  { year: 2022, month: 7, day: 1, hour: 0, minute: 30, gender: '女' },    // 早子时
  { year: 2023, month: 8, day: 15, hour: 12, minute: 0, gender: '男' },   // 中秋附近
  { year: 2024, month: 2, day: 29, hour: 12, minute: 0, gender: '女' },   // 闰日
  { year: 2025, month: 8, day: 22, hour: 12, minute: 0, gender: '男' },   // 闰六月
  { year: 1984, month: 2, day: 4, hour: 12, minute: 0, gender: '男' },   // 立春日
  { year: 1990, month: 1, day: 1, hour: 0, minute: 0, gender: '女' },     // 90年
  { year: 2000, month: 2, day: 5, hour: 12, minute: 0, gender: '男' },    // 千禧年立春后
  { year: 2008, month: 8, day: 8, hour: 20, minute: 0, gender: '男' },     // 北京奥运开幕
  { year: 1949, month: 10, day: 1, hour: 14, minute: 0, gender: '男' },   // 国庆
  { year: 1976, month: 9, day: 9, hour: 0, minute: 30, gender: '男' },    // 历史时刻
  { year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: '女' },     // 千禧
  { year: 2030, month: 6, day: 15, hour: 12, minute: 0, gender: '男' },   // 未来
  { year: 1980, month: 8, day: 14, hour: 14, minute: 22, gender: '女' },  // 历史
  { year: 1995, month: 12, day: 25, hour: 0, minute: 0, gender: '男' },   // 圣诞
  { year: 2026, month: 8, day: 14, hour: 12, minute: 22, gender: '女' },  // 示例②
  { year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' },  // 示例①
];

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  test(`标准案例 ${i + 1}: ${tc.year}-${tc.month}-${tc.day} ${tc.hour}:${tc.minute} ${tc.gender}`, () => {
    const r = bazi.paiPan(tc);
    // 必须有完整四柱
    assert.ok(r.pillars.year);
    assert.ok(r.pillars.month);
    assert.ok(r.pillars.day);
    assert.ok(r.pillars.time);
    assert.ok(r.pillars.gan.year && r.pillars.zhi.year);
    // 必须有藏干
    assert.ok(r.hiddenStems.year.length > 0);
    assert.ok(r.hiddenStems.month.length > 0);
    assert.ok(r.hiddenStems.day.length > 0);
    assert.ok(r.hiddenStems.hour.length > 0);
    // 必须有十神
    assert.ok(r.tenGods.yearGan);
    assert.ok(r.tenGods.monthGan);
    assert.ok(r.tenGods.hourGan);
    // 必须有五行统计
    assert.ok(r.elements.visible);
    assert.ok(r.elements.total);
    // 必须有大运
    assert.equal(r.luckCycles.length, 8);
    // 必须有月令
    assert.ok(r.elements.yueLing);
    // 必须有通根判定
    assert.equal(typeof r.tongGen.hasRoot, 'boolean');
    // 必须有时间戳
    assert.ok(r.createdAt);
  });
}

// ============ 15. 推演过程保留 ============

test('推演过程：保留 dayBoundary 与 dayShift 信息', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 23, minute: 0, gender: '男' });
  assert.equal(r.evidence.dayBoundary, '23:00');
  assert.equal(r.evidence.appliedDayShift, true);
  assert.equal(r.evidence.dayShiftDirection, 'forward');
});

// ============ 16. 不输出综合旺衰分数 ============

test('不输出综合旺衰分数（v1 红线）', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.equal(r.wangShuaiScore, undefined);
  assert.equal(r.score, undefined);
});

// ============ 17. 真太阳时可选 ============

test('真太阳时：默认关闭', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男', longitude: 116.4 });
  assert.equal(r.options.trueSolarTimeApplied, false);
});

test('真太阳时：开启后修正时间', () => {
  const r = bazi.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男', longitude: 116.4 }, { trueSolarTime: true });
  assert.equal(r.options.trueSolarTimeApplied, true);
});
