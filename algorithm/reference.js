// 参考文档解析数据
// 来源：排盘-【阴盘-阳遁-5局】.docx、排盘-【阴盘-阴遁-5局】 2(1)(1).docx
// 用途：作为算法校准与单元测试的 Ground Truth

// 十三宫空间索引定义（与 algorithm/qimen.js 中的 GONG_LAYOUT 保持一致）
// 0:4尾  1:9  2:2尾  3:2首  4:7  5:6尾  6:6首  7:1  8:8首  9:8尾  10:3  11:4首  12:5中
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
// 单元格格式：神 / 星 / 门 / 天盘干 / 地盘干 / 暗干 / 灵盘干 / 天罡 / 日排局
const YANG_DUN_5 = {
  pan: '阴盘',
  dun: '阳遁',
  ju: 5,
  pillars: ['丙午', '丙申', '庚申', '癸未'],
  dayGan: '庚',
  isNight: false,
  guiShenZhi: '丑',
  palaces: [
    { idx: 0,  shen: '白虎', xing: '武曲', men: '死', tian: '庚', di: '乙', an: '辛', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 1,  shen: '朱雀', xing: '巨门', men: '开', tian: '戊', di: '辛', an: '丁', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 2,  shen: '青龙', xing: '天相', men: '生', tian: '辛', di: '癸', an: '戊', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 3,  shen: '勾陈', xing: '文曲', men: '从', tian: '庚', di: '壬', an: '乙', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 4,  shen: '天后', xing: '右弼', men: '天', tian: '丁', di: '辛', an: '辛', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 5,  shen: '太阴', xing: '天机', men: '杜', tian: '癸', di: '庚', an: '庚', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 6,  shen: '玄武', xing: '左辅', men: '伤', tian: '壬', di: '己', an: '己', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 7,  shen: '六合', xing: '禄存', men: '惊', tian: '己', di: '辛', an: '丙', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 8,  shen: '贵神', xing: '贪狼', men: '玄', tian: '丙', di: '戊', an: '壬', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 9,  shen: '腾蛇', xing: '天梁', men: '冲', tian: '乙', di: '己', an: '癸', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 10, shen: '玄灵', xing: '廉贞', men: '景', tian: '戊', di: '丁', an: '己', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 11, shen: '九天', xing: '天同', men: '休', tian: '己', di: '丙', an: '庚', lingGan: '', tiangang: '', riPaiJu: '' },
    { idx: 12, shen: '太常', xing: '破军', men: '吉', tian: '辛', di: '戊', an: '戊', lingGan: '', tiangang: '', riPaiJu: '' }
  ]
};

// 阴盘-阴遁-5局（2026-08-14 12:22 丙午 丙申 庚申 壬午）
// 农历七月十三 午时 (lunarMonth=7, lunarDay=13, shiZhi='午')
// 神盘(TABLE 16) 星盘(TABLE 9) 门盘(TABLE 2/5) 天干(TABLE 0) 按 2(1)(1) 文档校准
const YIN_DUN_5 = {
  pan: '阴盘',
  dun: '阴遁',
  ju: 5,
  pillars: ['丙午', '丙申', '庚申', '壬午'],
  dayGan: '庚',
  isNight: false,
  guiShenZhi: '丑',
  lunarMonth: 7,
  lunarDay: 13,
  shiZhi: '午',
  palaces: [
    { idx: 0,  shen: '腾蛇', xing: '天相', men: '天', tian: '庚', di: '癸', an: '己', lingGan: '', tiangang: '太乙', riPaiJu: '' },
    { idx: 1,  shen: '朱雀', xing: '右弼', men: '景', tian: '丙', di: '庚', an: '丙', lingGan: '', tiangang: '腾光', riPaiJu: '' },
    { idx: 2,  shen: '太常', xing: '巨门', men: '吉', tian: '癸', di: '己', an: '癸', lingGan: '', tiangang: '小吉', riPaiJu: '六月 13日' },
    { idx: 3,  shen: '白虎', xing: '天梁', men: '死', tian: '壬', di: '己', an: '壬', lingGan: '', tiangang: '传送', riPaiJu: '' },
    { idx: 4,  shen: '太阴', xing: '破军', men: '惊', tian: '己', di: '丁', an: '己', lingGan: '', tiangang: '从魁', riPaiJu: '' },
    { idx: 5,  shen: '九天', xing: '武曲', men: '开', tian: '辛', di: '丙', an: '辛', lingGan: '', tiangang: '河魁', riPaiJu: '' },
    { idx: 6,  shen: '天后', xing: '天同', men: '冲', tian: '庚', di: '戊', an: '庚', lingGan: '', tiangang: '登时', riPaiJu: '' },
    { idx: 7,  shen: '玄武', xing: '贪狼', men: '休', tian: '乙', di: '戊', an: '乙', lingGan: '', tiangang: '神后', riPaiJu: '' },
    { idx: 8,  shen: '贵神', xing: '左辅', men: '从', tian: '丁', di: '辛', an: '丁', lingGan: '', tiangang: '大吉', riPaiJu: '' },
    { idx: 9,  shen: '青龙', xing: '天机', men: '生', tian: '戊', di: '己', an: '戊', lingGan: '', tiangang: '功曹', riPaiJu: '' },
    { idx: 10, shen: '六合', xing: '禄存', men: '伤', tian: '辛', di: '辛', an: '辛', lingGan: '', tiangang: '太冲', riPaiJu: '' },
    { idx: 11, shen: '勾陈', xing: '文曲', men: '杜', tian: '己', di: '壬', an: '己', lingGan: '', tiangang: '天罡', riPaiJu: '' },
    { idx: 12, shen: '玄灵', xing: '廉贞', men: '玄', tian: '戊', di: '戊', an: '辛', lingGan: '', tiangang: '', riPaiJu: '' }
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
