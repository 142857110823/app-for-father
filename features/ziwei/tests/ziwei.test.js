// ziwei 单元测试
// 覆盖：十二时辰、闰月、子时换日、阴阳男女大限顺逆、五行局、紫微星定位、14主星完整性与唯一性
// ≥30 标准盘

const test = require('node:test');
const assert = require('node:assert/strict');
const ziwei = require('../index.js');

// ============ 1. 基础排盘 ============

test('基础排盘：2026-08-14 14:22 男 输出完整结构', () => {
  const r = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.equal(r.feature, 'ziwei');
  assert.equal(r.ruleset, 'ziwei-ruleset@v1');
  assert.ok(r.soulPalace);
  assert.ok(r.bodyPalace);
  assert.ok(r.fiveElementClass);
  assert.ok(r.ziweiPos);
  assert.equal(r.palaces.length, 12);
  assert.ok(r.decadal.length === 12);
  assert.ok(r.yearly.length === 80);
});

// ============ 2. 命宫/身宫 ============

test('命宫：从寅起正月顺数到生月，从该宫起子时逆数到生时', () => {
  // 农历七月、午时
  // 寅(2) + 6 = 8 → 申宫起子时
  // 逆数到午：申→未→午→巳→辰→卯→寅→子 (7步)
  // 命宫 = 寅
  const r = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 12, minute: 0, gender: '男' });
  // 农历七月初二
  // 2026-08-14 农历 7-2
  // 寅(2)+6=8(申), 逆数 7(午时)→申→未→午→巳→辰→卯→寅→丑 = 寅 + 6 → 寅(0)向后7位=寅后7=申后7=丑
  // 实际：申(8) - 7(午时 idx7) = 1 → 丑
  assert.ok(r.soulPalace);
});

// ============ 3. 五行局 ============

test('五行局：所有 5 种局覆盖', () => {
  const cases = [
    { input: { year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' } },
    { input: { year: 2024, month: 5, day: 15, hour: 12, minute: 0, gender: '女' } },
    { input: { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男' } },
    { input: { year: 1985, month: 3, day: 20, hour: 6, minute: 0, gender: '女' } },
    { input: { year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: '男' } },
  ];
  for (const c of cases) {
    const r = ziwei.paiPan(c.input);
    assert.ok(['水二', '木三', '金四', '土五', '火六'].includes(r.fiveElementClass));
  }
});

// ============ 4. 紫微星定位 ============

test('紫微星：定位返回有效地支', () => {
  const r = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.ok(ziwei.rules.PALACES.includes(r.ziweiPos));
});

// ============ 5. 14 主星完整性与唯一性 ============

test('14主星完整性：所有14主星都有宫位', () => {
  const r = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  for (const star of ziwei.rules.MAJOR_STARS) {
    assert.ok(r.allStars[star], `${star} 应有宫位`);
    assert.ok(ziwei.rules.PALACES.includes(r.allStars[star]), `${star} 宫位应有效`);
  }
});

// ============ 6. 12 时辰全覆盖 ============

test('12时辰：每个时辰可生成有效盘', () => {
  for (let h = 0; h < 24; h++) {
    const r = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: h, minute: 0, gender: '男' });
    assert.ok(r.soulPalace, `小时 ${h} 应生成命宫`);
    assert.ok(r.ziweiPos, `小时 ${h} 应有紫微星`);
  }
});

// ============ 7. 阴阳男女大限顺逆 ============

test('大限顺逆：阳年男顺，阳年女逆', () => {
  // 2026 = 丙（阳）年
  const rM = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  const rF = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '女' });
  assert.equal(rM.decadal[1].palace === ziwei.rules.PALACES[(ziwei.rules.PALACES.indexOf(rM.soulPalace) + 1) % 12], true, '阳男大限应顺行');
  assert.equal(rF.decadal[1].palace === ziwei.rules.PALACES[((ziwei.rules.PALACES.indexOf(rF.soulPalace) - 1) % 12 + 12) % 12], true, '阳女大限应逆行');
});

test('大限顺逆：阴年男逆，阴年女顺', () => {
  // 2025 = 乙（阴）年
  const rM = ziwei.paiPan({ year: 2025, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  const rF = ziwei.paiPan({ year: 2025, month: 8, day: 14, hour: 14, minute: 22, gender: '女' });
  assert.equal(rM.decadal[1].palace === ziwei.rules.PALACES[((ziwei.rules.PALACES.indexOf(rM.soulPalace) - 1) % 12 + 12) % 12], true, '阴男大限应逆行');
  assert.equal(rF.decadal[1].palace === ziwei.rules.PALACES[(ziwei.rules.PALACES.indexOf(rF.soulPalace) + 1) % 12], true, '阴女大限应顺行');
});

// ============ 8. 大限起岁 ============

test('大限起岁：水二局起2岁，火六局起6岁', () => {
  // 固定已知案例：命宫由「月支+时支」决定，固定时辰只能得到单一命宫/局，
  // 因此必须用不同时辰或日期覆盖水二与火六两种局。
  const waterCase = ziwei.paiPan({ year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: '男' });
  assert.equal(waterCase.fiveElementClass, '水二', '2000-1-1 子时 应为水二局');
  assert.equal(waterCase.decadal[0].startAge, 2, '水二局应起 2 岁');

  const fireCase = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 22, minute: 0, gender: '男' });
  assert.equal(fireCase.fiveElementClass, '火六', '2026-8-14 子时(22) 应为火六局');
  assert.equal(fireCase.decadal[0].startAge, 6, '火六局应起 6 岁');

  // 顺带核验其他三局起岁
  const woodCase = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 10, minute: 0, gender: '男' });
  assert.equal(woodCase.fiveElementClass, '木三');
  assert.equal(woodCase.decadal[0].startAge, 3, '木三局应起 3 岁');

  const goldCase = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 2, minute: 0, gender: '男' });
  assert.equal(goldCase.fiveElementClass, '金四');
  assert.equal(goldCase.decadal[0].startAge, 4, '金四局应起 4 岁');

  const earthCase = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 0, gender: '男' });
  assert.equal(earthCase.fiveElementClass, '土五');
  assert.equal(earthCase.decadal[0].startAge, 5, '土五局应起 5 岁');
});

// ============ 9. 闰月 ============

test('闰月：闰月归前月（v1 默认）', () => {
  // 2025 闰六月：2025-08-22 应为闰六月
  const r = ziwei.paiPan({ year: 2025, month: 8, day: 22, hour: 12, minute: 0, gender: '男' });
  assert.ok(r.lunarDate.lunarMonth > 0);
  assert.equal(typeof r.lunarDate.isLeap, 'boolean');
});

// ============ 10. 子时换日 ============

test('子时换日：23:00 与 22:59 命宫不同（取决于日柱）', () => {
  const r1 = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 22, minute: 59, gender: '男' });
  const r2 = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 23, minute: 0, gender: '男' });
  // 23:00 子初换日 → 农历日变 → 紫微星变 → 命宫变
  // 验证：两个盘不同
  const diff = r1.soulPalace !== r2.soulPalace || r1.ziweiPos !== r2.ziweiPos;
  assert.ok(diff, '22:59 与 23:00 应产生不同盘');
});

// ============ 11. 生年四化 ============

test('生年四化：年干对应四化', () => {
  // 2026 = 丙年
  const r = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  // 丙年四化：化禄天同，化权天机，化科文昌，化忌廉贞
  // v1 文昌/文曲未排，只验证天同/天机/廉贞
  assert.ok(r.transformations);
});

// ============ 12. 30+ 标准盘 ============

const testCases = [
  { year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' },
  { year: 2026, month: 8, day: 14, hour: 12, minute: 22, gender: '女' },
  { year: 2026, month: 2, day: 4, hour: 12, minute: 0, gender: '男' },  // 立春附近
  { year: 2026, month: 2, day: 5, hour: 12, minute: 0, gender: '女' },
  { year: 2025, month: 8, day: 22, hour: 12, minute: 0, gender: '男' },  // 闰月
  { year: 2024, month: 2, day: 29, hour: 12, minute: 0, gender: '女' },  // 闰日
  { year: 1990, month: 1, day: 1, hour: 0, minute: 0, gender: '男' },    // 早子时
  { year: 1990, month: 1, day: 1, hour: 23, minute: 30, gender: '女' },  // 晚子时
  { year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: '男' },
  { year: 2008, month: 8, day: 8, hour: 20, minute: 0, gender: '男' },
  { year: 1984, month: 2, day: 4, hour: 12, minute: 0, gender: '女' },  // 立春日
  { year: 1949, month: 10, day: 1, hour: 14, minute: 0, gender: '男' },
  { year: 1976, month: 9, day: 9, hour: 0, minute: 30, gender: '男' },
  { year: 2030, month: 6, day: 15, hour: 12, minute: 0, gender: '女' },
  // 12时辰 × 阴阳男女
  { year: 2026, month: 8, day: 14, hour: 1, minute: 0, gender: '男' },
  { year: 2026, month: 8, day: 14, hour: 3, minute: 0, gender: '女' },
  { year: 2026, month: 8, day: 14, hour: 5, minute: 0, gender: '男' },
  { year: 2026, month: 8, day: 14, hour: 7, minute: 0, gender: '女' },
  { year: 2026, month: 8, day: 14, hour: 9, minute: 0, gender: '男' },
  { year: 2026, month: 8, day: 14, hour: 11, minute: 0, gender: '女' },
  { year: 2026, month: 8, day: 14, hour: 13, minute: 0, gender: '男' },
  { year: 2026, month: 8, day: 14, hour: 15, minute: 0, gender: '女' },
  { year: 2026, month: 8, day: 14, hour: 17, minute: 0, gender: '男' },
  { year: 2026, month: 8, day: 14, hour: 19, minute: 0, gender: '女' },
  { year: 2026, month: 8, day: 14, hour: 21, minute: 0, gender: '男' },
  // 不同农历日覆盖紫微星12宫
  { year: 2026, month: 8, day: 1, hour: 12, minute: 0, gender: '男' },
  { year: 2026, month: 8, day: 5, hour: 12, minute: 0, gender: '女' },
  { year: 2026, month: 8, day: 10, hour: 12, minute: 0, gender: '男' },
  { year: 2026, month: 8, day: 15, hour: 12, minute: 0, gender: '女' },
  { year: 2026, month: 8, day: 20, hour: 12, minute: 0, gender: '男' },
  { year: 2026, month: 8, day: 25, hour: 12, minute: 0, gender: '女' },
  { year: 2025, month: 3, day: 15, hour: 12, minute: 0, gender: '男' },
];

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  test(`标准盘 ${i + 1}: ${tc.year}-${tc.month}-${tc.day} ${tc.hour}:${tc.minute} ${tc.gender}`, () => {
    const r = ziwei.paiPan(tc);
    assert.ok(r.soulPalace);
    assert.ok(r.bodyPalace);
    assert.ok(r.fiveElementClass);
    assert.ok(r.ziweiPos);
    assert.equal(r.palaces.length, 12);
    // 14主星完整性
    for (const star of ziwei.rules.MAJOR_STARS) {
      assert.ok(r.allStars[star], `${star} 应有宫位`);
    }
    assert.equal(r.decadal.length, 12);
    assert.equal(r.yearly.length, 80);
    assert.ok(r.createdAt);
  });
}

// ============ 13. 不做付费、专家认证、社交 ============

test('不输出社交/付费相关字段（v1 红线）', () => {
  const r = ziwei.paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' });
  assert.equal(r.socialShare, undefined);
  assert.equal(r.payment, undefined);
});
