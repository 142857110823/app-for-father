// meihua 单元测试
// 覆盖：时间起卦、数字起卦、余0边界、6动爻、互卦、变卦、体用、五行生克
// ≥30 标准案例

const test = require('node:test');
const assert = require('node:assert/strict');
const meihua = require('../index.js');

// ============ 1. 数字起卦基础 ============

test('数字起卦：1,1 → 乾为天，动爻2', () => {
  // 1%8=1→乾, 1%8=1→乾, (1+1)%6=2→动爻2
  const r = meihua.numberDivination({ numbers: [1, 1] });
  assert.equal(r.primaryHexagram.upper, '乾');
  assert.equal(r.primaryHexagram.lower, '乾');
  assert.equal(r.primaryHexagram.name, '乾为天');
  assert.equal(r.movingLine, 2);
});

test('数字起卦：8,8 → 余0→8（坤），动爻4', () => {
  // 8%8=0→8→坤, 8%8=0→8→坤, 16%6=4→动爻4
  const r = meihua.numberDivination({ numbers: [8, 8] });
  assert.equal(r.primaryHexagram.upper, '坤');
  assert.equal(r.primaryHexagram.lower, '坤');
  assert.equal(r.primaryHexagram.name, '坤为地');
  assert.equal(r.movingLine, 4);
});

test('数字起卦：1,6 → 乾坎，动爻1', () => {
  // 1%8=1→乾, 6%8=6→坎, 7%6=1→动爻1
  const r = meihua.numberDivination({ numbers: [1, 6] });
  assert.equal(r.primaryHexagram.upper, '乾');
  assert.equal(r.primaryHexagram.lower, '坎');
  assert.equal(r.primaryHexagram.name, '天水讼');
  assert.equal(r.movingLine, 1);
});

test('数字起卦：6,6 → 坎为水，动爻6', () => {
  // 6%8=6→坎, 6%8=6→坎, 12%6=0→6
  const r = meihua.numberDivination({ numbers: [6, 6] });
  assert.equal(r.primaryHexagram.name, '坎为水');
  assert.equal(r.movingLine, 6); // 余0→6
});

// ============ 2. 数字起卦边界 ============

test('数字起卦：相同数', () => {
  const r = meihua.numberDivination({ numbers: [5, 5] });
  assert.ok(r.primaryHexagram.name);
});

test('数字起卦：大整数', () => {
  const r = meihua.numberDivination({ numbers: [99999, 88888] });
  assert.ok(r.primaryHexagram.upper);
});

test('数字起卦：非法输入抛错', () => {
  assert.throws(() => meihua.numberDivination({ numbers: [] }), /两个正整数/);
  assert.throws(() => meihua.numberDivination({ numbers: [0, 5] }), /正整数/);
  assert.throws(() => meihua.numberDivination({ numbers: [-1, 5] }), /正整数/);
  assert.throws(() => meihua.numberDivination({ numbers: ['abc', 5] }), /正整数/);
});

// ============ 3. 时间起卦基础 ============

test('时间起卦：2026-08-14 14:22 应输出完整结果', () => {
  const r = meihua.timeDivination({ year: 2026, month: 8, day: 14, hour: 14, minute: 22 });
  assert.equal(r.feature, 'meihua');
  assert.equal(r.method, 'time');
  assert.ok(r.primaryHexagram.upper);
  assert.ok(r.primaryHexagram.lower);
  assert.ok(r.primaryHexagram.name);
  assert.ok(r.movingLine >= 1 && r.movingLine <= 6);
  assert.ok(r.mutualHexagram.name);
  assert.ok(r.changedHexagram.name);
  assert.ok(r.bodyTrigram);
  assert.ok(r.useTrigram);
  // 算术过程保留
  assert.ok(r.arithmetic.length >= 8);
});

test('时间起卦：推演过程含总数', () => {
  const r = meihua.timeDivination({ year: 2026, month: 8, day: 14, hour: 14, minute: 22 });
  const totalStep = r.arithmetic.find(s => s.step === '总数');
  assert.ok(totalStep);
  assert.equal(typeof totalStep.value, 'number');
});

// ============ 4. 时间起卦边界 ============

test('时间起卦：子时跨日（23:00）', () => {
  // 23:00 子初换日，时支=子，但日柱可能变化
  const r1 = meihua.timeDivination({ year: 2026, month: 8, day: 14, hour: 22, minute: 59 });
  const r2 = meihua.timeDivination({ year: 2026, month: 8, day: 14, hour: 23, minute: 0 });
  // 子初换日前后总数可能不同（日柱不同）
  assert.ok(r1.evidence.totalSum > 0);
  assert.ok(r2.evidence.totalSum > 0);
});

test('时间起卦：跨农历月（立春附近）', () => {
  // 立春前后年支数应不同
  const r1 = meihua.timeDivination({ year: 2026, month: 2, day: 3, hour: 0, minute: 0 });  // 立春前
  const r2 = meihua.timeDivination({ year: 2026, month: 2, day: 5, hour: 12, minute: 0 });  // 立春后
  // 年支数应不同
  const y1 = r1.arithmetic.find(s => s.step === '年支数');
  const y2 = r2.arithmetic.find(s => s.step === '年支数');
  assert.notEqual(y1.value, y2.value);
});

test('时间起卦：跨年（除夕→春节）', () => {
  // 2025-12-31 → 2026-01-01
  const r1 = meihua.timeDivination({ year: 2025, month: 12, day: 31, hour: 12, minute: 0 });
  const r2 = meihua.timeDivination({ year: 2026, month: 1, day: 1, hour: 12, minute: 0 });
  assert.ok(r1.evidence.totalSum > 0);
  assert.ok(r2.evidence.totalSum > 0);
});

// ============ 5. 八卦序数全覆盖 ============

test('八卦序数：1-8 对应 乾兑离震巽坎艮坤', () => {
  for (let i = 1; i <= 8; i++) {
    const r = meihua.numberDivination({ numbers: [i, 1] });
    assert.equal(r.primaryHexagram.upper, meihua.rules.XIANTIAN_BAGUA[i - 1]);
  }
});

test('八卦序数：9 取余→1（乾）', () => {
  const r = meihua.numberDivination({ numbers: [9, 1] });
  assert.equal(r.primaryHexagram.upper, '乾');
});

// ============ 6. 6 动爻全覆盖 ============

test('6 动爻全覆盖', () => {
  // 通过调整数字让动爻分别为 1-6
  // 已知 (a+b) % 6 = movingLine，余0时为6
  // a=1: 1%8=乾, 不同 b 让动爻遍历
  // 找一组数让动爻分别为1-6
  const cases = [
    { numbers: [1, 5], expected: 6 },    // 1+5=6, 6%6=0→6
    { numbers: [1, 6], expected: 1 },    // 1+6=7, 7%6=1
    { numbers: [1, 7], expected: 2 },    // 1+7=8, 8%6=2
    { numbers: [1, 8], expected: 3 },    // 1+8=9, 9%6=3
    { numbers: [1, 9], expected: 4 },    // 1+9=10, 10%6=4
    { numbers: [1, 10], expected: 5 },   // 1+10=11, 11%6=5
  ];
  for (const tc of cases) {
    const r = meihua.numberDivination({ numbers: tc.numbers });
    assert.equal(r.movingLine, tc.expected, `${tc.numbers} 应得动爻 ${tc.expected}`);
  }
});

// ============ 7. 体用判定 ============

test('体用：动爻在1-3（下卦动）→ 下卦为用', () => {
  // 1,6 → 动1（下卦动）
  const r = meihua.numberDivination({ numbers: [1, 6] });
  assert.equal(r.movingLine, 1);
  assert.equal(r.bodyTrigram, '乾');  // 上卦
  assert.equal(r.useTrigram, '坎');   // 下卦
});

test('体用：动爻在4-6（上卦动）→ 上卦为用', () => {
  // 1,9 → 动4（上卦动）
  const r = meihua.numberDivination({ numbers: [1, 9] });
  assert.equal(r.movingLine, 4);
  assert.equal(r.useTrigram, '乾');   // 上卦
  assert.equal(r.bodyTrigram, '乾');  // 下卦（同为乾）
});

// ============ 8. 互卦与变卦 ============

test('互卦：本卦→互卦取 2,3,4 + 3,4,5 爻', () => {
  // 乾为天（111 111）互卦为乾（111 + 111）
  const r = meihua.numberDivination({ numbers: [1, 1] });
  assert.equal(r.mutualHexagram.upper, '乾');
  assert.equal(r.mutualHexagram.lower, '乾');
  assert.equal(r.mutualHexagram.name, '乾为天');
});

test('变卦：动爻变阳为阴/阴为阳', () => {
  // 乾为天动2 → 上卦乾，下卦离 → 天火同人
  const r = meihua.numberDivination({ numbers: [1, 1] }); // 动2
  assert.equal(r.movingLine, 2);
  // 乾(111 111) 动第2爻 → 111 101 = 乾+离 = 天火同人
  assert.equal(r.changedHexagram.name, '天火同人');
});

// ============ 9. 五行生克 ============

test('五行：体卦生用卦 → 相生', () => {
  // 体乾（金）生坎（水）→ 金生水 → 相生
  // 找一个卦让体为乾、用为坎
  // 1,6 → 动1 → 上卦乾体，下卦坎用 → 体生用
  const r = meihua.numberDivination({ numbers: [1, 6] });
  assert.equal(r.bodyTrigram, '乾');
  assert.equal(r.useTrigram, '坎');
  assert.equal(r.elementRelations.relation, '相生');
});

test('五行：体用同卦 → 比和', () => {
  // 1,1 → 乾乾，体用同金 → 比和
  const r = meihua.numberDivination({ numbers: [1, 1] });
  assert.equal(r.elementRelations.relation, '比和');
});

// ============ 10. 30+ 标准案例 ============

const testCases = [
  { numbers: [1, 1] }, { numbers: [1, 2] }, { numbers: [1, 3] },
  { numbers: [1, 4] }, { numbers: [1, 5] }, { numbers: [1, 6] },
  { numbers: [1, 7] }, { numbers: [1, 8] }, { numbers: [1, 9] },
  { numbers: [1, 10] },
  { numbers: [2, 3] }, { numbers: [2, 4] }, { numbers: [2, 5] },
  { numbers: [3, 5] }, { numbers: [3, 7] },
  { numbers: [4, 4] }, { numbers: [5, 5] }, { numbers: [6, 6] },
  { numbers: [7, 7] }, { numbers: [8, 8] },
  { numbers: [13, 7] }, { numbers: [21, 14] }, { numbers: [99, 1] },
  { numbers: [100, 1] }, { numbers: [365, 24] },
  { numbers: [10, 20] }, { numbers: [20, 30] }, { numbers: [50, 60] },
  { numbers: [77, 88] }, { numbers: [123, 456] },
  // 时间起卦案例
  { year: 2026, month: 8, day: 14, hour: 14, minute: 22 },
  { year: 2026, month: 8, day: 14, hour: 12, minute: 22 },
  { year: 2026, month: 2, day: 4, hour: 12, minute: 0 },
  { year: 2025, month: 8, day: 22, hour: 12, minute: 0 },
  { year: 2024, month: 2, day: 29, hour: 12, minute: 0 },
];

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  test(`标准案例 ${i + 1}: ${tc.numbers ? `数字[${tc.numbers}]` : `${tc.year}-${tc.month}-${tc.day} ${tc.hour}:${tc.minute}`}`, () => {
    const r = tc.numbers
      ? meihua.numberDivination({ numbers: tc.numbers })
      : meihua.timeDivination(tc);
    assert.ok(r.primaryHexagram.name);
    assert.ok(r.primaryHexagram.upper);
    assert.ok(r.primaryHexagram.lower);
    assert.ok(r.primaryHexagram.yaoLines.length === 6);
    assert.ok(r.movingLine >= 1 && r.movingLine <= 6);
    assert.ok(r.mutualHexagram.name);
    assert.ok(r.changedHexagram.name);
    assert.ok(r.bodyTrigram);
    assert.ok(r.useTrigram);
    assert.ok(r.elementRelations.relation);
    assert.ok(r.createdAt);
  });
}

// ============ 11. 不输出吉凶承诺 ============

test('不输出确定性吉凶承诺（v1 红线）', () => {
  const r = meihua.numberDivination({ numbers: [1, 1] });
  assert.equal(r.jiXiong, undefined);
  assert.equal(r.fortune, undefined);
});
