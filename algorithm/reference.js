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
// ==== 2026-08-23 基于用户提供的 2(1)(1) 文档标准排盘表格截图逐格人工抽取 ====
// 13 宫索引：0=4尾 1=9  2=2尾 3=2首 4=7  5=6尾 6=6首 7=1  8=8首 9=8尾 10=3  11=4首 12=5中
// 每宫三列结构：
//   左列(神/星/门竖排)  |  中列(灵盘 / 天盘 / 人盘(地盘) / 地盘干 竖排4行)  |  右列(天罡 / 日排局 右对齐金色)
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
    // idx0 = 4[尾]（第一行第一列）：神=腾蛇 星=武曲 门=冲 灵=癸 天=辛 人=庚 地=壬 天罡=太乙
    { idx: 0, shen:'腾蛇', xing:'武曲', men:'冲', tian:'辛', di:'壬', ren:'庚', ling:'癸', tiangang:'太乙', riPai:'' },
    // idx1 = 9（第一行第二列）：神=朱雀 星=巨门 门=死 灵=辛 天=庚 人=戊 地=己 天罡=腾光
    { idx: 1, shen:'朱雀', xing:'巨门', men:'死', tian:'庚', di:'己', ren:'戊', ling:'辛', tiangang:'腾光', riPai:'' },
    // idx2 = 2[尾]（第一行第三列）：神=太常 星=天相 门=杜 灵=辛 天=戊 人=辛 地=丙 天罡=小吉 日排=六月13日
    { idx: 2, shen:'太常', xing:'天相', men:'杜', tian:'戊', di:'丙', ren:'辛', ling:'辛', tiangang:'小吉', riPai:'六月 13日' },
    // idx3 = 2[首]（第一行第四列）：神=白虎 星=文曲 门=伤 灵=戊 天=辛 人=庚 地=乙 天罡=传送
    { idx: 3, shen:'白虎', xing:'文曲', men:'伤', tian:'辛', di:'乙', ren:'庚', ling:'戊', tiangang:'传送', riPai:'' },
    // idx4 = 7（第二行第四列）：神=太阴 星=右弼 门=生 灵=乙 天=庚 人=丁 地=戊 天罡=从魁
    { idx: 4, shen:'太阴', xing:'右弼', men:'生', tian:'庚', di:'戊', ren:'丁', ling:'乙', tiangang:'从魁', riPai:'' },
    // idx5 = 6[尾]（第三行第四列）：神=九天 星=天机 门=从 灵=丙 天=丁 人=癸 地=己 天罡=河魁
    { idx: 5, shen:'九天', xing:'天机', men:'从', tian:'丁', di:'己', ren:'癸', ling:'丙', tiangang:'河魁', riPai:'' },
    // idx6 = 6[首]（第四行第四列）：神=天后 星=左辅 门=惊 灵=己 天=癸 人=壬 地=辛 天罡=登时
    { idx: 6, shen:'天后', xing:'左辅', men:'惊', tian:'癸', di:'辛', ren:'壬', ling:'己', tiangang:'登时', riPai:'' },
    // idx7 = 1（第四行第三列）：神=玄武 星=禄存 门=吉 灵=庚 天=壬 人=己 地=庚 天罡=神后
    { idx: 7, shen:'玄武', xing:'禄存', men:'吉', tian:'壬', di:'庚', ren:'己', ling:'庚', tiangang:'神后', riPai:'' },
    // idx8 = 8[首]（第四行第二列）：神=贵神 星=贪狼 门=景 灵=戊 天=己 人=丙 地=戊 天罡=大吉 · 贵神宫浅黄底
    { idx: 8, shen:'贵神', xing:'贪狼', men:'景', tian:'己', di:'戊', ren:'丙', ling:'戊', tiangang:'大吉', riPai:'' },
    // idx9 = 8[尾]（第四行第一列）：神=青龙 星=天梁 门=休 灵=己 天=丙 人=乙 地=辛 天罡=功曹
    { idx: 9, shen:'青龙', xing:'天梁', men:'休', tian:'丙', di:'辛', ren:'乙', ling:'己', tiangang:'功曹', riPai:'' },
    // idx10 = 3（第三行第一列）：神=六合 星=廉贞 门=天 灵=庚 天=乙 人=戊 地=庚 天罡=太冲
    { idx:10, shen:'六合', xing:'廉贞', men:'天', tian:'乙', di:'庚', ren:'戊', ling:'庚', tiangang:'太冲', riPai:'' },
    // idx11 = 4[首]（第二行第一列）：神=勾陈 星=天同 门=玄 灵=丁 天=戊 人=己 地=丁 天罡=天罡
    { idx:11, shen:'勾陈', xing:'天同', men:'玄', tian:'戊', di:'丁', ren:'己', ling:'丁', tiangang:'天罡', riPai:'' },
    // idx12 = 5中（跨2-3行/2-3列 合并 2×2）：神=玄灵 星=破军 门=开 灵=壬 天=己 人=辛 地=癸 · 中宫天罡留空
    { idx:12, shen:'玄灵', xing:'破军', men:'开', tian:'己', di:'癸', ren:'辛', ling:'壬', tiangang:'', riPai:'' }
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
