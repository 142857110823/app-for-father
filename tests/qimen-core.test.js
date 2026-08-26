const test = require('node:test');
const assert = require('node:assert/strict');
const { fullPaiPan } = require('../algorithm/qimen.js');

test('阴遁五局中宫使用标准三分区完整数据', () => {
  const result = fullPaiPan(
    ['丙午', '丙申', '庚申', '壬午'],
    '庚',
    false,
    { lunarMonth: 7, lunarDay: 2, shiZhi: '午', paiJuMonthDays: 29 },
  );
  const center = result.palaces[12];

  assert.deepEqual(
    {
      shen: center.shen,
      xing: center.xing,
      men: center.men,
      lingGan: center.lingGan,
      tianGan: center.tianGan,
      renPan: center.renPan,
      diGan: center.diGan,
      tiangang: center.tiangang,
      riPaiJu: center.riPaiJu,
    },
    {
      shen: '太常',
      xing: '贪狼',
      men: '休',
      lingGan: '癸',
      tianGan: '乙',
      renPan: '戊',
      diGan: '乙',
      tiangang: '',
      riPaiJu: '',
    },
  );
});

test('日排局按农历月份固定原始宫位且保留完整日期簇', () => {
  const result = fullPaiPan(
    ['丙午', '丙申', '庚申', '壬午'],
    '庚',
    false,
    { lunarMonth: 7, lunarDay: 2, shiZhi: '午', paiJuMonthDays: 29 },
  );
  const actual = result.palaces.map((palace) => palace.riPaiJu);

  assert.deepEqual(actual, [
    '9/10',
    '6/7/8',
    '4/5',
    '1/2/3/29',
    '27/28',
    '25/26',
    '23/24',
    '20/21/22',
    '18/19',
    '16/17',
    '13/14/15',
    '11/12',
    '',
  ]);
});

test('日排局第N月尾簇按农历实际天数截断（2026-02-26 阳遁3局）', () => {
  // 2026-02-26 16:55 → 丙午 庚寅 辛未 丙申 → 阳遁3局；丙午年三月 30 天
  const result = fullPaiPan(
    ['丙午', '庚寅', '辛未', '丙申'],
    '辛',
    false,
    { lunarMonth: 1, lunarDay: 10, shiZhi: '申', paiJuMonthDays: 30 },
  );

  assert.equal(result.dun, '阳遁');
  assert.equal(result.ju, 3);
  // 三月原始宫位 idx5（6尾）：30 天大月 → 1/2/3/29/30，不出现 31
  assert.equal(result.palaces[5].riPaiJu, '1/2/3/29/30');
  // 全盘不得出现 31 日
  for (const palace of result.palaces) {
    assert.equal(palace.riPaiJu.includes('31'), false);
  }
});
