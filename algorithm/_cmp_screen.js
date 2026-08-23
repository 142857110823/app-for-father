/**
 * 对比：阴遁5局 13宫基准值（来自用户提供的标准截图）
 * vs 当前算法 fullPaiPanFromTime(2026,8,14,12,22) 的输出
 * 
 * 截图四柱：丙午 丙申 庚申 壬午 → 阴盘-阴遁-5局
 * 
 * 截图标准（每宫四干=灵盘/天盘/人盘/地盘）：
 * idx0(4尾)   神=腾蛇  星=武曲  门=冲    四干=癸/辛/庚/壬
 * idx1(9)     神=朱雀  星=巨门  门=死    四干=辛/庚/戊/己
 * idx2(2尾)   神=太常  星=天相  门=杜    四干=辛/戊/辛/丙
 * idx3(2首)   神=白虎  星=文曲  门=伤    四干=戊/辛/庚/乙
 * idx11(4首)  神=勾陈  星=天同  门=玄    四干=丁/戊/己/丁
 * idx12(中5)  神=玄灵  星=破军  门=开    四干=壬/己/辛/癸
 * idx4(7)     神=太阴  星=右弼  门=生    四干=乙/庚/丁/戊
 * idx10(3)    神=六合  星=廉贞  门=天    四干=庚/乙/戊/庚
 * idx5(6尾)   神=九天  星=天机  门=从    四干=丙/丁/癸/己
 * idx9(8尾)   神=青龙  星=天梁  门=休    四干=己/丙/乙/辛
 * idx8(8首)   神=贵神  星=贪狼  门=景    四干=戊/己/丙/戊   ← 特殊底色
 * idx7(1)     神=玄武  星=禄存  门=吉    四干=庚/壬/己/庚
 * idx6(6首)   神=天后  星=左辅  门=惊    四干=己/癸/壬/辛
 */

const { fullPaiPanFromTime } = require('./pillars.js');

// 截图标准基准（按 idx 0..12 顺序）
const STD = [
  { idx:0,  shen:'腾蛇', xing:'武曲', men:'冲', ling:'癸', tian:'辛', ren:'庚', di:'壬' },
  { idx:1,  shen:'朱雀', xing:'巨门', men:'死', ling:'辛', tian:'庚', ren:'戊', di:'己' },
  { idx:2,  shen:'太常', xing:'天相', men:'杜', ling:'辛', tian:'戊', ren:'辛', di:'丙' },
  { idx:3,  shen:'白虎', xing:'文曲', men:'伤', ling:'戊', tian:'辛', ren:'庚', di:'乙' },
  { idx:4,  shen:'太阴', xing:'右弼', men:'生', ling:'乙', tian:'庚', ren:'丁', di:'戊' },
  { idx:5,  shen:'九天', xing:'天机', men:'从', ling:'丙', tian:'丁', ren:'癸', di:'己' },
  { idx:6,  shen:'天后', xing:'左辅', men:'惊', ling:'己', tian:'癸', ren:'壬', di:'辛' },
  { idx:7,  shen:'玄武', xing:'禄存', men:'吉', ling:'庚', tian:'壬', ren:'己', di:'庚' },
  { idx:8,  shen:'贵神', xing:'贪狼', men:'景', ling:'戊', tian:'己', ren:'丙', di:'戊' },
  { idx:9,  shen:'青龙', xing:'天梁', men:'休', ling:'己', tian:'丙', ren:'乙', di:'辛' },
  { idx:10, shen:'六合', xing:'廉贞', men:'天', ling:'庚', tian:'乙', ren:'戊', di:'庚' },
  { idx:11, shen:'勾陈', xing:'天同', men:'玄', ling:'丁', tian:'戊', ren:'己', di:'丁' },
  { idx:12, shen:'玄灵', xing:'破军', men:'开', ling:'壬', tian:'己', ren:'辛', di:'癸' },
];

const res = fullPaiPanFromTime(2026, 8, 14, 12, 22);
console.log('排盘信息:', res.pan, '四柱:', res.pillarArr);

let diff = 0, total = 0;
const FIELDS = [
  ['shen','神'], ['xing','星'], ['men','门'],
  ['lingGan','灵盘'], ['tianGan','天盘'],
  ['renPan', '人盘'], ['diGanDisplay','地盘展']
];

for (let i = 0; i < 13; i++) {
  const std = STD[i];
  const act = res.palaces[std.idx];
  console.log(`\n=== 宫 idx${std.idx} (洛${act.luoshu}${act.label}) ===`);
  
  const row = [];
  for (const [f, label] of FIELDS) {
    total++;
    let stdVal = std[{shen:'shen',xing:'xing',men:'men',lingGan:'ling',tianGan:'tian',renPan:'ren',diGanDisplay:'di'}[f]];
    let actVal = (f === 'diGanDisplay') ? (act[f] || act.diGan) : (act[f] || '');
    const ok = stdVal === actVal;
    if (!ok) diff++;
    const mark = ok ? '  ' : '✗';
    console.log(`${mark} ${label}: 期望「${stdVal}」 实际「${actVal}」`);
  }
}

console.log(`\n====== 总计：${total-diff}/${total} 通过，${diff} 差异 ======`);
process.exit(diff > 0 ? 1 : 0);
