const test = require('node:test');
const assert = require('node:assert/strict');
const { fullPaiPan } = require('../algorithm/qimen.js');

test('阴遁五局中宫使用标准三分区完整数据', () => {
  const result = fullPaiPan(
    ['丙午', '丙申', '庚申', '壬午'],
    '庚',
    false,
    { lunarMonth: 7, lunarDay: 2, shiZhi: '午' },
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
    { lunarMonth: 7, lunarDay: 2, shiZhi: '午' },
  );
  const actual = result.palaces.map((palace) => palace.riPaiJu);

  assert.deepEqual(actual, [
    '9/10',
    '6/7/8',
    '4/5',
    '1/2/3/29/30/31',
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
