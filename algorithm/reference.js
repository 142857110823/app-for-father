// 参考文档解析数据
// 来源：排盘-【阴盘-阴遁-5局】 2(1)(1).docx（最高权威）+ 天罡.docx
// 用途：作为算法校准与单元测试的 Ground Truth
// 数据抽取基准：
//   - 人盘(ren)  : TABLE 0
//   - 门盘(men)  : TABLE 1（原始宫位表，非旋转后）
//   - 星盘(xing) : TABLE 2（原始宫位表，非旋转后）
//   - 宫位标识   : TABLE 3
//   - 神盘(shen) : TABLE 4 / TABLE 16 / TABLE 24（原始宫位表）
//   - 天盘(tian) : TABLE 13/25 实际排盘结果（已旋转）
//   - 地盘(di)   : TABLE 13/25 实际排盘结果
//   - 灵盘(ling) : TABLE 23/25 实际排盘结果
//   - 天罡       : TABLE 25（基于天罡.docx TABLE 6 查表法起始宫=idx6，顺时针填12要素）
//   - 日排局     : TABLE 25（基于农历日13匹配日期簇）
// 13 宫索引：0=4尾 1=9  2=2尾 3=2首 4=7  5=6尾 6=6首 7=1  8=8首 9=8尾 10=3  11=4首 12=5中

// 十三宫空间索引定义（与 algorithm/qimen.js 中的 GONG_LAYOUT 保持一致）
const GONG_ORDER = [
  { idx: 0, pos: 4, label: '尾' },
  { idx: 1, pos: 9, label: '' },
  { idx: 2, pos: 2, label: '尾' },
  { idx: 3, pos: 2, label: '首' },
  { idx: 4, pos: 7, label: '' },
  { idx: 5, pos: 6, label: '尾' },
  { idx: 6, pos: 6, label: '首' },
  { idx: 7, pos: 1, label: '' },
  { idx: 8, pos: 8, label: '首' },
  { idx: 9, pos: 8, label: '尾' },
  { idx: 10, pos: 3, label: '' },
  { idx: 11, pos: 4, label: '首' },
  { idx: 12, pos: 5, label: '' }
];

// 阴盘-阳遁-5局（2026-08-14 14:22 丙午 丙申 庚申 癸未）
// 待用户提供标准阳遁5局文档后逐格校准，当前保留旧数据
const YANG_DUN_5 = {
  pan: '阴盘',
  dun: '阳遁',
  ju: 5,
  pillars: ['丙午', '丙申', '庚申', '癸未'],
  dayGan: '庚',
  isNight: false,
  guiShenZhi: '丑',
  palaces: [
    { idx: 0,  shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 1,  shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 2,  shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 3,  shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 4,  shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 5,  shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 6,  shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 7,  shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 8,  shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 9,  shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 10, shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 11, shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' },
    { idx: 12, shen: '', xing: '', men: '', tian: '', di: '', ren: '', ling: '', tiangang: '', riPai: '' }
  ]
};

// 阴盘-阴遁-5局（2026-08-14 12:22 丙午 丙申 庚申 壬午）
// 天罡起点使用实际农历七月午时查表；日排局使用 5 局对应的“第五月”完整版。
// ==== 2026-08-23 基于排盘-【阴盘-阴遁-5局】 2(1)(1).docx TABLE 25 逐格人工抽取 ====
// 字段：shen(神) / xing(星) / men(门) / tian(天盘) / di(地盘) / ren(人盘) / ling(灵盘) / tiangang(天罡) / riPai(日排局)
// 三个原始宫位映射表（TABLE 0/1/2/4 反推）：
//   中宫标准：太常/贪狼/休门 | 癸/乙/乙/戊
// 2026-08-26 阴历逻辑修正：丙午年五月为 29 天小月，2首(idx3) 尾簇由 1/2/3/29/30/31 截断为 1/2/3/29
const YIN_DUN_5 = {
  pan: '阴盘',
  dun: '阴遁',
  ju: 5,
  pillars: ['丙午', '丙申', '庚申', '壬午'],
  dayGan: '庚',
  isNight: false,
  guiShenZhi: '丑',
  lunarMonth: 7,
  lunarDay: 2,
  shiZhi: '午',
  paiJuMonthDays: 29,
  palaces: [
    // idx0 = 4[尾] Row1Col1: 勾陈+己+巨门+癸+吉门+癸+庚 | 天罡=河魁 | 日排=9/10
    { idx: 0,  shen:'勾陈', xing:'巨门', men:'吉', tian:'癸', di:'癸', ren:'庚', ling:'己', tiangang:'河魁', riPai:'9/10' },
    // idx1 = 9     Row1Col2: 太阴+己+天同+庚+冲门+庚+丙 | 天罡=登时 | 日排=6/7/8
    { idx: 1,  shen:'太阴', xing:'天同', men:'冲', tian:'庚', di:'庚', ren:'丙', ling:'己', tiangang:'登时', riPai:'6/7/8' },
    // idx2 = 2[尾] Row1Col3: 天后+庚+天相+庚+天门+己+癸 | 天罡=神后 | 日排=4/5
    { idx: 2,  shen:'天后', xing:'天相', men:'天', tian:'庚', di:'己', ren:'癸', ling:'庚', tiangang:'神后', riPai:'4/5' },
    // idx3 = 2[首] Row1Col4: 玄灵+戊+文曲+己+杜门+己+壬 | 天罡=大吉 | 日排=1/2/3/29（五月29天小月，尾簇截断）
    { idx: 3,  shen:'玄灵', xing:'文曲', men:'杜', tian:'己', di:'己', ren:'壬', ling:'戊', tiangang:'大吉', riPai:'1/2/3/29' },
    // idx4 = 7     Row2Col4: 朱雀+丙+左辅+丁+从门+丁+己 | 天罡=功曹 | 日排=27/28 (4月特殊月，天罡.docx第五月表)
    { idx: 4,  shen:'朱雀', xing:'左辅', men:'从', tian:'丁', di:'丁', ren:'己', ling:'丙', tiangang:'功曹', riPai:'27/28' },
    // idx5 = 6[尾] Row3Col4: 白虎+壬+右弼+丙+景门+丙+辛 | 天罡=太冲 | 日排=25/26 (3月，天罡.docx第五月表)
    { idx: 5,  shen:'白虎', xing:'右弼', men:'景', tian:'丙', di:'丙', ren:'辛', ling:'壬', tiangang:'太冲', riPai:'25/26' },
    // idx6 = 6[首] Row4Col4: 玄武+乙+天机+戊+生门+戊+庚 | 天罡=天罡(起始) | 日排=23/24
    { idx: 6,  shen:'玄武', xing:'天机', men:'生', tian:'戊', di:'戊', ren:'庚', ling:'乙', tiangang:'天罡', riPai:'23/24' },
    // idx7 = 1     Row4Col3: 九天+辛+廉贞+戊+玄门+戊+乙 | 天罡=太乙 | 日排=20/21/22
    { idx: 7,  shen:'九天', xing:'廉贞', men:'玄', tian:'戊', di:'戊', ren:'乙', ling:'辛', tiangang:'太乙', riPai:'20/21/22' },
    // idx8 = 8[首] Row4Col2: 贵神+丁+武曲+辛+开门+辛+丁 | 天罡=腾光 | 日排=18/19 · 贵神宫浅黄底
    { idx: 8,  shen:'贵神', xing:'武曲', men:'开', tian:'辛', di:'辛', ren:'丁', ling:'丁', tiangang:'腾光', riPai:'18/19' },
    // idx9 = 8[尾] Row4Col1: 青龙+戊+破军+己+惊门+己+戊 | 天罡=小吉 | 日排=16/17
    { idx: 9,  shen:'青龙', xing:'破军', men:'惊', tian:'己', di:'己', ren:'戊', ling:'戊', tiangang:'小吉', riPai:'16/17' },
    // idx10= 3     Row3Col1: 腾蛇+庚+禄存+辛+伤门+辛+辛 | 天罡=传送 | 日排=13/14/15 (实际lunarDay=2不在该簇，无替换)
    { idx:10,  shen:'腾蛇', xing:'禄存', men:'伤', tian:'辛', di:'辛', ren:'辛', ling:'庚', tiangang:'传送', riPai:'13/14/15' },
    // idx11= 4[首] Row2Col1: 六合+辛+天梁+壬+死门+壬+己 | 天罡=从魁 | 日排=11/12
    { idx:11,  shen:'六合', xing:'天梁', men:'死', tian:'壬', di:'壬', ren:'己', ling:'辛', tiangang:'从魁', riPai:'11/12' },
    // idx12= 5中   跨2-3行/2-3列 合并 2×2: 太常+贪狼+休门 | 癸+乙+乙+戊
    { idx:12,  shen:'太常', xing:'贪狼', men:'休', tian:'乙', di:'乙', ren:'戊', ling:'癸', tiangang:'', riPai:'' }
  ]
};

// 门名映射：参考 docx 中的"天门"即默认序列中的"天"
const MEN_NAME_MAP = {
  '天门': '天'
};

module.exports = {
  GONG_ORDER,
  YANG_DUN_5,
  YIN_DUN_5,
  MEN_NAME_MAP
};
