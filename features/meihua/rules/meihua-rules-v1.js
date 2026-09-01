// meihua rules v1 — 梅花易数规则表
// 一级依据：公版《梅花易数》（邵雍）

// ============ 先天八卦数 ============
// 乾1 兑2 离3 震4 巽5 坎6 艮7 坤8
const XIANTIAN_BAGUA = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
const XIANTIAN_NUMBER = { '乾': 1, '兑': 2, '离': 3, '震': 4, '巽': 5, '坎': 6, '艮': 7, '坤': 8 };

// ============ 八卦五行 ============
const BAGUA_WUXING = {
  '乾': '金', '兑': '金',
  '离': '火', '震': '木', '巽': '木',
  '坎': '水', '艮': '土', '坤': '土',
};

// ============ 八卦方位 ============
const BAGUA_FANGWEI = {
  '乾': '西北', '坎': '北', '艮': '东北', '震': '东',
  '巽': '东南', '离': '南', '坤': '西南', '兑': '西',
};

// ============ 八卦象类 ============
const BAGUA_XIANG = {
  '乾': '天', '兑': '泽', '离': '火', '震': '雷',
  '巽': '风', '坎': '水', '艮': '山', '坤': '地',
};

// ============ 64 卦表（上下卦组合）============
// 卦名按"上卦+下卦"组合，行=上卦，列=下卦
// 索引: BAGUA_64[upperIdx][lowerIdx]
// upperIdx/lowerIdx 0-7 对应 乾兑离震巽坎艮坤
// 命名约定："X Y Z" 中 X=上卦象，Y=下卦象，Z=卦名
//   例如 上乾下坎 → "天水讼"（上乾=天，下坎=水）
const BAGUA_64_NAMES = [
  // 上乾
  ['乾为天', '天泽履', '天火同人', '天雷无妄', '天风姤', '天水讼', '天山遁', '天地否'],
  // 上兑
  ['泽天夬', '兑为泽', '泽火革', '泽雷随', '泽风大过', '泽水困', '泽山咸', '泽地萃'],
  // 上离
  ['火天大有', '火泽睽', '离为火', '火雷噬嗑', '火风鼎', '火水未济', '火山旅', '火地晋'],
  // 上震
  ['雷天大壮', '雷泽归妹', '雷火丰', '震为雷', '雷风恒', '雷水解', '雷山小过', '雷地豫'],
  // 上巽
  ['风天小畜', '风泽中孚', '风火家人', '风雷益', '巽为风', '风水涣', '风山渐', '风地观'],
  // 上坎
  ['水天需', '水泽节', '水火既济', '水雷屯', '水风井', '坎为水', '水山蹇', '水地比'],
  // 上艮
  ['山天大畜', '山泽损', '山火贲', '山雷颐', '山风蛊', '山水蒙', '艮为山', '山地剥'],
  // 上坤
  ['地天泰', '地泽临', '地火明夷', '地雷复', '地风升', '地水师', '地山谦', '坤为地'],
];

function getHexagramName(upper, lower) {
  const u = XIANTIAN_BAGUA.indexOf(upper);
  const l = XIANTIAN_BAGUA.indexOf(lower);
  if (u < 0 || l < 0) return '?';
  return BAGUA_64_NAMES[u][l];
}

// ============ 五行生克 ============
const WUXING_SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const WUXING_KE = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

function getWuxingRelation(a, b) {
  if (a === b) return '比和';
  if (WUXING_SHENG[a] === b) return '相生';  // a 生 b
  if (WUXING_SHENG[b] === a) return '被生';  // b 生 a
  if (WUXING_KE[a] === b) return '相克';      // a 克 b
  if (WUXING_KE[b] === a) return '被克';      // b 克 a
  return '?';
}

// ============ 互卦取爻规则 ============
// 取二三四爻为下互，三四五爻为上互
// 二爻=原卦第2爻(0-based 1), 三爻=原卦第3爻(0-based 2), 四爻=原卦第4爻(0-based 3)
// 五爻=原卦第5爻(0-based 4)
// 互卦下卦：原2-3-4爻，互卦上卦：原3-4-5爻
// 在梅花易数中，互卦提取原卦2、3、4爻为下卦，3、4、5爻为上卦

// 卦由6爻组成，自下而上编号 1-6
// 互卦下卦：原卦2、3、4爻
// 互卦上卦：原卦3、4、5爻
function calcMutualHexagram(yaoLines) {
  // yaoLines: [0..5] 自下而上，0=阳，1=阴
  if (yaoLines.length < 6) return null;
  const lower = [yaoLines[1], yaoLines[2], yaoLines[3]];
  const upper = [yaoLines[2], yaoLines[3], yaoLines[4]];
  return { upper, lower };
}

// 三爻 → 卦名
function trigramFromYao(lines) {
  // 三爻自下而上：1-2-3
  // 阳阳阳=乾、阴阳阴=震等
  // 编码：1=阳，0=阴，自下而上
  const key = lines.join('');
  const map = {
    '111': '乾', '000': '坤',
    '100': '震', '011': '巽',
    '010': '坎', '101': '离',
    '001': '艮', '110': '兑'
  };
  return map[key] || '?';
}

// ============ 变卦 ============
// 动爻变（阳变阴，阴变阳）
function calcChangedHexagram(yaoLines, movingLine) {
  // movingLine: 1-6
  const changed = [...yaoLines];
  changed[movingLine - 1] = changed[movingLine - 1] === 1 ? 0 : 1;
  return changed;
}

// ============ 体用判定 ============
// 动爻所在卦为"用卦"，另一为"体卦"
// 上卦（4-5-6 爻）动 → 上卦为用，下卦为体
// 下卦（1-2-3 爻）动 → 下卦为用，上卦为体
function calcTiYong(yaoLines, movingLine) {
  if (movingLine >= 1 && movingLine <= 3) {
    // 动在下卦
    return { body: 'upper', use: 'lower' };
  } else {
    // 动在上卦
    return { body: 'lower', use: 'upper' };
  }
}

// ============ 导出 ============

module.exports = {
  RULESET_VERSION: 'meihua-ruleset@v1',
  XIANTIAN_BAGUA,
  XIANTIAN_NUMBER,
  BAGUA_WUXING,
  BAGUA_FANGWEI,
  BAGUA_XIANG,
  BAGUA_64_NAMES,
  getHexagramName,
  WUXING_SHENG,
  WUXING_KE,
  getWuxingRelation,
  calcMutualHexagram,
  trigramFromYao,
  calcChangedHexagram,
  calcTiYong,
};
