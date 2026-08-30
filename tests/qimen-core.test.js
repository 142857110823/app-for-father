const test = require('node:test');
const assert = require('node:assert/strict');
const { fullPaiPan } = require('../algorithm/qimen.js');
const { fullPaiPanFromTime } = require('../algorithm/pillars.js');

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

  // 第 N 月 = 当天农历月份（七月，小月 29 天）
  assert.deepEqual(actual, [
    '4/5',       // idx0 八月
    '1/2/3/29',  // idx1 七月（第 N 月）
    '27/28',     // idx2 六月
    '25/26',     // idx3 五月
    '22/23/24',  // idx4 四月
    '20/21',     // idx5 三月
    '18/19',     // idx6 二月
    '15/16/17',  // idx7 正月
    '13/14',     // idx8 十二月
    '11/12',     // idx9 十一月
    '8/9/10',    // idx10 十月
    '6/7',       // idx11 九月
    '',          // idx12 中宫
  ]);
});

test('日排局第N月尾簇按农历实际天数截断（2026-02-26 阳遁3局）', () => {
  // 2026-02-26 16:55 → 丙午 庚寅 辛未 丙申 → 阳遁3局；当天为农历正月初十，正月大月 30 天
  const result = fullPaiPan(
    ['丙午', '庚寅', '辛未', '丙申'],
    '辛',
    false,
    { lunarMonth: 1, lunarDay: 10, shiZhi: '申', paiJuMonthDays: 30 },
  );

  assert.equal(result.dun, '阳遁');
  assert.equal(result.ju, 3);
  // 第 N 月 = 当天农历月份（正月），原始宫位 idx7（坎宫）：30 天大月 → 1/2/3/29/30，不出现 31
  assert.equal(result.palaces[7].riPaiJu, '1/2/3/29/30');
  // 全盘不得出现 31 日
  for (const palace of result.palaces) {
    assert.equal(palace.riPaiJu.includes('31'), false);
  }
});

test('2026年农历小月腊月日排局不出现30日', () => {
  // 2026-02-01 07:00 → 阴遁2局，当天为农历腊月（十二月）小月 29 天
  const result = fullPaiPanFromTime(2026, 2, 1, 7, 0);
  assert.equal(result.pan.dun, '阴遁');
  assert.equal(result.pan.ju, 2);
  assert.equal(result.paiJuMonthDays, 29);
  // 第 N 月 = 当天农历月份（十二月），原始宫位 idx8（8首）应只显示 1/2/3/29，不得出现 30
  assert.equal(result.palaces[8].riPaiJu, '1/2/3/29');
  for (const palace of result.palaces) {
    assert.equal(palace.riPaiJu.includes('30'), false, `宫位 ${palace.index} 日排局不应含30: ${palace.riPaiJu}`);
  }
});

test('同一时辰同时输出阳遁与阴遁两套结果', () => {
  const result = fullPaiPanFromTime(2026, 8, 14, 12, 22);
  assert.equal(result.yangResult.pan.dun, '阳遁');
  assert.equal(result.yinResult.pan.dun, '阴遁');
  assert.notEqual(result.yangResult.pan.ju, result.yinResult.pan.ju);
  assert.notDeepEqual(result.yangResult.palaces, result.yinResult.palaces, '两盘宫位内容应不同');
  assert.equal(result.pan.dun, result.yinResult.pan.dun, 'result.pan 应保持原自然遁');
});
