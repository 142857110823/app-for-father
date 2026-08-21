// 参考文档解析数据
// 来源：排盘-【阴盘-阳遁-5局】.docx、排盘-【阴盘-阴遁-5局】.docx
// 用途：作为算法校准与单元测试的 Ground Truth

// 十三宫空间索引定义（与 public/index.html 中的 LAYOUT 保持一致）
// 0:4首 1:9 2:2首 3:4尾 4:5中 5:7 6:3 7:6尾 8:8尾 9:8首 10:1 11:6首 12:2尾
const GONG_ORDER = [
  { idx: 0, pos: 4, label: '首' },
  { idx: 1, pos: 9, label: '' },
  { idx: 2, pos: 2, label: '首' },
  { idx: 3, pos: 4, label: '尾' },
  { idx: 4, pos: 5, label: '' },
  { idx: 5, pos: 7, label: '' },
  { idx: 6, pos: 3, label: '' },
  { idx: 7, pos: 6, label: '尾' },
  { idx: 8, pos: 8, label: '尾' },
  { idx: 9, pos: 8, label: '首' },
  { idx: 10, pos: 1, label: '' },
  { idx: 11, pos: 6, label: '首' },
  { idx: 12, pos: 2, label: '尾' }
];

// 阴盘-阳遁-5局（2026-08-14 14:22 丙午 丙申 庚申 癸未）
// 单元格格式：神 / 星 / 门 / 天盘干 / 地盘干 / 暗干
const YANG_DUN_5 = {
  pan: '阴盘',
  dun: '阳遁',
  ju: 5,
  pillars: ['丙午', '丙申', '庚申', '癸未'],
  dayGan: '庚',
  isNight: false,
  guiShenZhi: '丑',
  palaces: [
    { idx: 0,  shen: '白虎', xing: '武曲', men: '死门', tian: '庚', di: '乙', an: '辛' },
    { idx: 1,  shen: '朱雀', xing: '巨门', men: '开门', tian: '戊', di: '辛', an: '丁' },
    { idx: 2,  shen: '青龙', xing: '天相', men: '生门', tian: '辛', di: '癸', an: '戊' },
    { idx: 3,  shen: '勾陈', xing: '文曲', men: '从门', tian: '庚', di: '壬', an: '乙' },
    { idx: 4,  shen: '九地', xing: '破军', men: '吉门', tian: '辛', di: '戊', an: '戊' },
    { idx: 5,  shen: '天后', xing: '右弼', men: '天门', tian: '丁', di: '辛', an: '辛' },
    { idx: 6,  shen: '九天', xing: '天同', men: '休门', tian: '己', di: '丙', an: '庚' },
    { idx: 7,  shen: '太阴', xing: '天机', men: '杜门', tian: '癸', di: '庚', an: '庚' },
    { idx: 8,  shen: '玄灵', xing: '廉贞', men: '景门', tian: '戊', di: '丁', an: '己' },
    { idx: 9,  shen: '贵神', xing: '贪狼', men: '玄门', tian: '丙', di: '戊', an: '壬' },
    { idx: 10, shen: '六合', xing: '禄存', men: '惊门', tian: '己', di: '辛', an: '丙' },
    { idx: 11, shen: '腾蛇', xing: '天梁', men: '冲门', tian: '乙', di: '己', an: '癸' },
    { idx: 12, shen: '玄武', xing: '左辅', men: '伤门', tian: '壬', di: '己', an: '己' }
  ]
};

// 阴盘-阴遁-5局（2026-08-14 12:22 丙午 丙申 庚申 壬午）
// 单元格格式（docx 提供）：星 / 门 / 天盘干 / 地盘干 / 暗干；神需按规则补全
// 注：阴遁5局 docx 中宫为 贪狼/休门/戊，此处把神补为九地（按默认序列中心位）
const YIN_DUN_5 = {
  pan: '阴盘',
  dun: '阴遁',
  ju: 5,
  pillars: ['丙午', '丙申', '庚申', '壬午'],
  dayGan: '庚',
  isNight: false,
  guiShenZhi: '丑',
  palaces: [
    { idx: 0,  shen: '白虎', xing: '巨门', men: '吉门', tian: '癸', di: '庚', an: '庚' },
    { idx: 1,  shen: '朱雀', xing: '天同', men: '冲门', tian: '庚', di: '丙', an: '丙' },
    { idx: 2,  shen: '青龙', xing: '天相', men: '天门', tian: '庚', di: '癸', an: '癸' },
    { idx: 3,  shen: '勾陈', xing: '文曲', men: '杜门', tian: '己', di: '壬', an: '壬' },
    { idx: 4,  shen: '九地', xing: '贪狼', men: '休门', tian: '',  di: '戊', an: ''  },
    { idx: 5,  shen: '天后', xing: '左辅', men: '从门', tian: '丁', di: '己', an: '己' },
    { idx: 6,  shen: '九天', xing: '天梁', men: '死门', tian: '壬', di: '己', an: '己' },
    { idx: 7,  shen: '太阴', xing: '右弼', men: '景门', tian: '丙', di: '辛', an: '辛' },
    { idx: 8,  shen: '玄灵', xing: '禄存', men: '伤门', tian: '辛', di: '辛', an: '辛' },
    { idx: 9,  shen: '贵神', xing: '武曲', men: '开门', tian: '辛', di: '丁', an: '丁' },
    { idx: 10, shen: '腾蛇', xing: '廉贞', men: '玄门', tian: '戊', di: '乙', an: '乙' },
    { idx: 11, shen: '朱雀', xing: '破军', men: '惊门', tian: '己', di: '戊', an: '戊' },
    { idx: 12, shen: '六合', xing: '天机', men: '生门', tian: '戊', di: '庚', an: '庚' }
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
