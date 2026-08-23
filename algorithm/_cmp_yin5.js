// 阴遁5局完整7字段对比：神/星/门/灵盘/天盘/人盘/地盘展示
// 以用户截图为唯一真值
const { fullPaiPan } = require('./qimen.js');

const pillars = ['丙午', '丙申', '庚申', '壬午'];
const dayGan = '庚';
const result = fullPaiPan(pillars, dayGan, false, { lunarMonth:7, lunarDay:13, shiZhi:'午' });

// 截图基准值（从用户提供的4×4表格逐格人工抽取）
// 中分区4行=灵盘/天盘/人盘/地盘；右列天罡/日排局另列
const STD = [
  // idx0=4尾: 神=腾蛇 星=武曲 门=冲  灵=癸 天=辛 人=庚 地=壬
  {idx:0, shen:'腾蛇', xing:'武曲', men:'冲', ling:'癸', tian:'辛', ren:'庚', di:'壬'},
  // idx1=9:    神=朱雀 星=巨门 门=死  灵=辛 天=庚 人=戊 地=己
  {idx:1, shen:'朱雀', xing:'巨门', men:'死', ling:'辛', tian:'庚', ren:'戊', di:'己'},
  // idx2=2尾:  神=太常 星=天相 门=杜  灵=辛 天=戊 人=辛 地=丙  riPai=六月13日
  {idx:2, shen:'太常', xing:'天相', men:'杜', ling:'辛', tian:'戊', ren:'辛', di:'丙', riPai:'六月 13日'},
  // idx3=2首:  神=白虎 星=文曲 门=伤  灵=戊 天=辛 人=庚 地=乙
  {idx:3, shen:'白虎', xing:'文曲', men:'伤', ling:'戊', tian:'辛', ren:'庚', di:'乙'},
  // idx4=7:    神=太阴 星=右弼 门=生  灵=乙 天=庚 人=丁 地=戊
  {idx:4, shen:'太阴', xing:'右弼', men:'生', ling:'乙', tian:'庚', ren:'丁', di:'戊'},
  // idx5=6尾:  神=九天 星=天机 门=从  灵=丙 天=丁 人=癸 地=己
  {idx:5, shen:'九天', xing:'天机', men:'从', ling:'丙', tian:'丁', ren:'癸', di:'己'},
  // idx6=6首:  神=天后 星=左辅 门=惊  灵=己 天=癸 人=壬 地=辛
  {idx:6, shen:'天后', xing:'左辅', men:'惊', ling:'己', tian:'癸', ren:'壬', di:'辛'},
  // idx7=1:    神=玄武 星=禄存 门=吉  灵=庚 天=壬 人=己 地=庚
  {idx:7, shen:'玄武', xing:'禄存', men:'吉', ling:'庚', tian:'壬', ren:'己', di:'庚'},
  // idx8=8首:  神=贵神 星=贪狼 门=景  灵=戊 天=己 人=丙 地=戊
  {idx:8, shen:'贵神', xing:'贪狼', men:'景', ling:'戊', tian:'己', ren:'丙', di:'戊'},
  // idx9=8尾:  神=青龙 星=天梁 门=休  灵=己 天=丙 人=乙 地=辛
  {idx:9, shen:'青龙', xing:'天梁', men:'休', ling:'己', tian:'丙', ren:'乙', di:'辛'},
  // idx10=3:   神=六合 星=廉贞 门=天  灵=庚 天=乙 人=戊 地=庚
  {idx:10, shen:'六合', xing:'廉贞', men:'天', ling:'庚', tian:'乙', ren:'戊', di:'庚'},
  // idx11=4首: 神=勾陈 星=天同 门=玄  灵=丁 天=戊 人=己 地=丁
  {idx:11, shen:'勾陈', xing:'天同', men:'玄', ling:'丁', tian:'戊', ren:'己', di:'丁'},
  // idx12=5中: 神=玄灵 星=破军 门=开  灵=壬 天=己 人=辛 地=癸
  {idx:12, shen:'玄灵', xing:'破军', men:'开', ling:'壬', tian:'己', ren:'辛', di:'癸'}
];

console.log('====== 阴遁5局：算法输出 vs 截图基准（7字段）======\n');

let totalErr = 0;
const FIELDS = [
  {k:'shen',     label:'神'},
  {k:'xing',     label:'星'},
  {k:'men',      label:'门'},
  {k:'lingGan',  label:'灵盘', refK:'ling'},
  {k:'tianGan',  label:'天盘', refK:'tian'},
  {k:'renPan',   label:'人盘', refK:'ren'},
  {k:'diGanDisplay', label:'地盘(展)', refK:'di'},
  {k:'diGan',    label:'diGan-内部'},
  {k:'riPaiJu',  label:'日排局', refK:'riPai'}
];

for (const s of STD) {
  const p = result.palaces[s.idx];
  const errs = [];
  for (const f of FIELDS) {
    const actual = p[f.k] || '';
    const expect = s[f.refK || f.k] !== undefined ? (s[f.refK || f.k] || '') : null;
    if (expect === null) continue;
    if (actual !== expect) errs.push(`${f.label}:算[${actual||'空'}]≠标[${expect||'空'}]`);
  }
  if (errs.length) {
    totalErr += errs.length;
    console.log(`❌ 宫${s.idx}(洛书${p.luoshu}${p.label}): ${errs.length}错`);
    errs.forEach(e => console.log(`   ${e}`));
  } else {
    console.log(`✅ 宫${s.idx}(洛书${p.luoshu}${p.label})：神${p.shen}/星${p.xing}/门${p.men} 灵${p.lingGan}天${p.tianGan}人${p.renPan}地${p.diGanDisplay||'空'} 完全通过`);
  }
}

console.log(`\n总计差异字段：${totalErr} 处`);
console.log('\n====== 算法输出人盘(diGan=renPan) 13宫一览 ======');
for (let i = 0; i < 13; i++) {
  const p = result.palaces[i];
  console.log(`  宫${i}(洛书${p.luoshu}${p.label}): diGan=${p.diGan} renPan=${p.renPan} diGanDisplay=${p.diGanDisplay||'空'} tianGan=${p.tianGan} lingGan=${p.lingGan}`);
}
