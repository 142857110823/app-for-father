// daliuren rules v1 — 大六壬规则表（冻结）
// 一级依据：公版《大六壬大全》《六壬粹言》
// 二级依据：lunar-javascript 节气表（仅用于月将分界核对）
// 不输出确定性吉凶承诺；不输出付费/批命结论

// ============ 基础常量 ============

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const DI_ZHI_INDEX = {};
DI_ZHI.forEach((z, i) => DI_ZHI_INDEX[z] = i);

// 地支五行
const ZHI_WUXING = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

// 地支阴阳（用于干支同位判定、八专课判定）
const ZHI_YINYANG = {
  '子': '阳', '丑': '阴', '寅': '阳', '卯': '阴',
  '辰': '阳', '巳': '阴', '午': '阳', '未': '阴',
  '申': '阳', '酉': '阴', '戌': '阳', '亥': '阴',
};

// 五行相克
const WUXING_KE = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

// ============ 月将表（按中气分界）============

// 中气名 → 该中气后的月将
// 顺序按时间从年初到年末：
//   雨水(2月)后=亥 → 春分后=戌 → 谷雨后=酉 → 小满后=申 → 夏至后=未 → 大暑后=午
//   处暑后=巳 → 秋分后=辰 → 霜降后=卯 → 小雪后=寅 → 冬至后=丑 → 大寒后=子
// 大寒后到下一次雨水之间，月将仍为「子」
const YUEJIANG_BY_QI = [
  // [中气名, 月将]
  ['雨水', '亥'],
  ['春分', '戌'],
  ['谷雨', '酉'],
  ['小满', '申'],
  ['夏至', '未'],
  ['大暑', '午'],
  ['处暑', '巳'],
  ['秋分', '辰'],
  ['霜降', '卯'],
  ['小雪', '寅'],
  ['冬至', '丑'],
  ['大寒', '子'],
];

// 月将顺序（按时间逆推）
// 月将即是「与太阳所在宫位对冲的地支」
// 雨水后太阳在亥宫，月将(降宫)为亥

/**
 * 求月将
 * @param {function} isAfterQi - (year, jieQiName) => boolean
 * @param {number} year
 * @returns {string} 月将地支
 */
function calcYueJiang(isAfterQi, year) {
  // 从后往前找：找到最后一个已过的中气
  // 注意跨年：若已过大寒，月将=子；若已过冬至(未过大寒)，月将=丑
  // 但跨年时需要同时检查「上一年的大寒」是否生效，因为大寒到次年雨水之间月将仍为「子」
  // 简化处理：先检查本年各中气，若本年一个都没过，则用上一年的最后一个中气（大寒→子）
  let lastQi = null;
  for (const [qi, jiang] of YUEJIANG_BY_QI) {
    if (isAfterQi(year, qi)) {
      lastQi = [qi, jiang];
    } else {
      break;  // YUEJIANG_BY_QI 按时间顺序，未过即可跳出
    }
  }
  if (lastQi) return lastQi[1];
  // 本年中气一个都没过（年初立春至雨水前），用去年的大寒→子
  // 检查去年大寒
  if (isAfterQi(year - 1, '大寒')) return '子';
  // 极端情况下回退到去年冬至
  if (isAfterQi(year - 1, '冬至')) return '丑';
  return '子';  // 默认值（理论上不会到这）
}

// ============ 干寄支（日干寄宫）============

const GAN_JI_ZHI = {
  '甲': '寅', '乙': '辰',
  '丙': '巳', '戊': '巳',
  '丁': '未', '己': '未',
  '庚': '申', '辛': '戌',
  '壬': '亥', '癸': '子',
};

// ============ 天将 ============

// 12天将顺序（从贵人起顺布）
const TIANJIANG = ['贵人', '腾蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];

// 昼夜贵人表：日干 → [昼贵, 夜贵]
// 口诀：甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸蛇兔藏，六辛逢马虎
const GUIREN_TABLE = {
  '甲': ['丑', '未'],
  '戊': ['丑', '未'],
  '庚': ['丑', '未'],
  '乙': ['子', '申'],
  '己': ['子', '申'],
  '丙': ['亥', '酉'],
  '丁': ['亥', '酉'],
  '壬': ['巳', '卯'],
  '癸': ['巳', '卯'],
  '辛': ['午', '寅'],
};

// 天将五行（用于解读，v1 仅记录）
const TIANJIANG_WUXING = {
  '贵人': '土', '腾蛇': '火', '朱雀': '火', '六合': '木',
  '勾陈': '土', '青龙': '木', '天空': '土', '白虎': '金',
  '太常': '土', '玄武': '水', '太阴': '金', '天后': '水',
};

// ============ 天地盘 ============

/**
 * 构建天盘
 * 天盘以 月将 加于 时支 上为基准
 * 即：天盘[时支位置] = 月将
 * 天盘[(时支位置 + i) % 12] = DI_ZHI[(月将位置 + i) % 12]
 *
 * @param {string} yueJiang 月将地支
 * @param {string} hourZhi 时辰地支
 * @returns {string[]} 长度12数组，索引为地盘位置(0=子)，值为天盘地支
 */
function buildTianPan(yueJiang, hourZhi) {
  const baseIdx = DI_ZHI_INDEX[hourZhi];
  const jiangIdx = DI_ZHI_INDEX[yueJiang];
  const tianPan = new Array(12);
  for (let i = 0; i < 12; i++) {
    const offset = ((baseIdx + i) % 12 + 12) % 12;
    const fromJiang = ((jiangIdx + i) % 12 + 12) % 12;
    tianPan[offset] = DI_ZHI[fromJiang];
  }
  return tianPan;
}

/**
 * 取天盘上的神：即地盘位置 pos 上面的天盘地支
 * @param {string[]} tianPan
 * @param {string} pos 地盘地支
 * @returns {string} 天盘地支
 */
function tianPanAt(tianPan, pos) {
  return tianPan[DI_ZHI_INDEX[pos]];
}

// ============ 四课 ============

/**
 * 计算四课
 * @param {string[]} tianPan
 * @param {string} dayGan 日干
 * @param {string} dayZhi 日支
 * @returns {object[]} 4课，每课 { up: 上神, down: 下神 }
 */
function calcFourLessons(tianPan, dayGan, dayZhi) {
  // 日干寄支
  const ganJiZhi = GAN_JI_ZHI[dayGan];
  // 第一课: 上=天盘[日干寄支], 下=日干寄支
  const up1 = tianPanAt(tianPan, ganJiZhi);
  // 第二课: 上=天盘[第一课上神], 下=第一课上神
  const up2 = tianPanAt(tianPan, up1);
  // 第三课: 上=天盘[日支], 下=日支
  const up3 = tianPanAt(tianPan, dayZhi);
  // 第四课: 上=天盘[第三课上神], 下=第三课上神
  const up4 = tianPanAt(tianPan, up3);

  return [
    { up: up1, down: ganJiZhi },
    { up: up2, down: up1 },
    { up: up3, down: dayZhi },
    { up: up4, down: up3 },
  ];
}

// ============ 五行克关系 ============

/**
 * 两支关系
 * @returns {string} '克上'(上克下)|'贼上'(下克上)|'比和'(同五行)|'无克'(相生/无关)
 *  注意：大六壬术语中：
 *  - 「上克下」：上神五行克下神五行 → 「贼」
 *  - 「下贼上」：下神五行克上神五行 → 「克」/「贼上」
 *  - 同五行为比和
 *  - 相生或无关系为「无克」
 */
function lessonRelation(up, down) {
  const wu = ZHI_WUXING[up];
  const wd = ZHI_WUXING[down];
  if (wu === wd) return '比和';
  if (WUXING_KE[wu] === wd) return '上克下';   // 上克下（贼）
  if (WUXING_KE[wd] === wu) return '下贼上';   // 下克上（克）
  return '无克';
}

// ============ 三传：贼克 → 比用 → 涉害 → 遥克 → 昴星 → 别责 → 八专 ============

/**
 * 贼克法：第一重审、第二元首
 * 规则：四课中所有「上下相克」的课称为「克课」
 *   - 1 个克课：取为初传
 *   - 0 个克课：进入下一法（遥克）
 *   - ≥2 个克课：进入比用法
 *
 * 区分：
 *   - 只有「上克下」的课(贼)：取该课上神 → 重审课
 *   - 只有「下贼上」的课(克)：取该课上神 → 元首课
 *   - 混合克课：进入比用
 *
 * @param {object[]} lessons 四课
 * @returns {{ initial: string|null, method: string|null, candidates: object[] }}
 */
function tryZeiKou(lessons) {
  const upKeList = [];  // 上克下
  const xiaZeiList = []; // 下贼上
  for (let i = 0; i < lessons.length; i++) {
    const rel = lessonRelation(lessons[i].up, lessons[i].down);
    if (rel === '上克下') upKeList.push({ index: i, ...lessons[i] });
    else if (rel === '下贼上') xiaZeiList.push({ index: i, ...lessons[i] });
  }

  // 单一贼课(上克下) → 重审
  if (upKeList.length === 1 && xiaZeiList.length === 0) {
    return { initial: upKeList[0].up, method: '重审', candidates: upKeList };
  }
  // 单一克课(下贼上) → 元首
  if (xiaZeiList.length === 1 && upKeList.length === 0) {
    return { initial: xiaZeiList[0].up, method: '元首', candidates: xiaZeiList };
  }
  // 多个克课 → 比用法
  if (upKeList.length + xiaZeiList.length >= 2) {
    return { initial: null, method: null, candidates: [...upKeList, ...xiaZeiList] };
  }
  // 无克课
  return { initial: null, method: null, candidates: [] };
}

/**
 * 比用法：当有多个克课
 * 规则：取与日干阴阳相同者
 *   - 上神与日干比和(同阴阳) → 取该上神为初传
 *   - 若多个比和 → 进入涉害法
 *
 * v1 实现：从克课中筛选与日干同阴阳的课
 * @param {object[]} candidates 克课候选
 * @param {string} dayGan 日干
 * @returns {{ initial: string|null, method: string|null }}
 */
function tryBiYong(candidates, dayGan) {
  const ganWuxing = GAN_WUXING_TABLE[dayGan];
  const ganYinYang = GAN_YINYANG_TABLE[dayGan];

  // 日干对应的「比和上神」：与日干同五行的地支
  // 但严格意义：上神与日干「同类」(同阴阳同五行)
  // 实操：以上神所属天干(用藏干)与日干同阴阳
  // v1 简化：用上神(地支)的阴阳与日干阴阳比较
  // 实际「比和」：上神与日干「相因」即上神为日干同类（同阴阳同五行）
  // 用 上神五行 == 日干五行 && 上神阴阳 == 日干阴阳
  const matches = [];
  for (const c of candidates) {
    const upYinYang = ZHI_YINYANG[c.up];
    const upWuxing = ZHI_WUXING[c.up];
    if (upWuxing === ganWuxing && upYinYang === ganYinYang) {
      matches.push(c);
    }
  }
  if (matches.length === 1) {
    return { initial: matches[0].up, method: '比用' };
  }
  if (matches.length >= 2) {
    // 进入涉害法
    return { initial: null, method: null };
  }
  // 无比和：进入涉害法（取所有克课，受克最深者）
  return { initial: null, method: null };
}

// 日干五行/阴阳表（避免循环依赖）
const GAN_WUXING_TABLE = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火',
  '戊': '土', '己': '土', '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};
const GAN_YINYANG_TABLE = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴',
  '戊': '阳', '己': '阴', '庚': '阳', '辛': '阴',
  '壬': '阳', '癸': '阴',
};

/**
 * 涉害法：多个比和或无单一比和
 * 规则：取受克/受贼最多的课
 *   - 「涉害」：以地盘本宫所受克次数衡量深浅，最深者为初传
 * v1 简化：取克课中第一课（涉害深度计算 v1 仅记录，不参与判定）
 *
 * 严格规则：
 *   1. 计算上神在地盘回归本位过程中所受的克数（涉害深浅）
 *   2. 涉害相同 → 取先见者（先出现的课）
 *
 * @param {object[]} candidates 克课候选
 * @param {string[]} tianPan 天盘
 * @param {string} dayGan 日干
 * @returns {{ initial: string, method: string, harm: object[] }}
 */
function trySheHai(candidates, tianPan, dayGan) {
  // v1 实现：计算每个候选的涉害深度
  // 涉害深度 = 上神从天盘位置回归到地盘本位过程中所受的克数
  const harmResults = candidates.map(c => {
    const harm = calcSheHaiDepth(c.up, c.down, tianPan);
    return { ...c, harm };
  });
  // 按涉害深度降序，相同则按课序升序
  harmResults.sort((a, b) => {
    if (b.harm !== a.harm) return b.harm - a.harm;
    return a.index - b.index;
  });
  return { initial: harmResults[0].up, method: '涉害', harm: harmResults };
}

/**
 * 涉害深度：上神从天盘位回归本位所受克数
 * 简化：从下神位置逆推到上神本位，每经过一宫检查是否被克
 * @param {string} up 上神
 * @param {string} down 下神
 * @param {string[]} tianPan 天盘
 * @returns {number} 受克次数
 */
function calcSheHaiDepth(up, down, tianPan) {
  // 上神本位
  const upIdx = DI_ZHI_INDEX[up];
  const downIdx = DI_ZHI_INDEX[down];
  // 从下神位置逆推到上神本位
  const steps = ((downIdx - upIdx) % 12 + 12) % 12;
  let harmCount = 0;
  for (let i = 0; i <= steps; i++) {
    const pos = DI_ZHI[(upIdx + i) % 12];
    const wuPos = ZHI_WUXING[pos];
    const wuUp = ZHI_WUXING[up];
    // 上神在此宫被克（地盘宫克上神）
    if (WUXING_KE[wuPos] === wuUp) harmCount++;
  }
  return harmCount;
}

/**
 * 遥克法：四课无上下克
 * 规则：
 *   - 上神克日干(上克日)→「蒿矢」取该上神为初传
 *   - 日干克上神(日克上)→「弹射」取该上神为初传
 *   - 否则进入昴星法
 * @param {object[]} lessons 四课
 * @param {string} dayGan 日干
 * @returns {{ initial: string|null, method: string|null, candidates: object[] }}
 */
function tryYaoKou(lessons, dayGan) {
  const ganWuxing = GAN_WUXING_TABLE[dayGan];
  const upKeGan = [];  // 上神克日干
  const ganKeUp = []; // 日干克上神
  for (let i = 0; i < lessons.length; i++) {
    const upWuxing = ZHI_WUXING[lessons[i].up];
    if (WUXING_KE[upWuxing] === ganWuxing) {
      upKeGan.push({ index: i, ...lessons[i] });
    } else if (WUXING_KE[ganWuxing] === upWuxing) {
      ganKeUp.push({ index: i, ...lessons[i] });
    }
  }
  if (upKeGan.length > 0) {
    return { initial: upKeGan[0].up, method: '蒿矢', candidates: upKeGan };
  }
  if (ganKeUp.length > 0) {
    return { initial: ganKeUp[0].up, method: '弹射', candidates: ganKeUp };
  }
  return { initial: null, method: null, candidates: [] };
}

/**
 * 昴星法：无上下克、无遥克
 * 规则：阳日取地盘酉上神为初传；阴日取地盘酉上神俯视之法
 * v1 实现：阳日取酉上神，阴日取午上神（简化）
 *
 * 严格规则：
 *   - 阳日(日干为阳)：自酉宫仰视，取酉上神为初传
 *   - 阴日(日干为阴)：自午宫俯视，取午上神为初传
 *
 * @param {string[]} tianPan
 * @param {string} dayGan
 * @returns {{ initial: string, method: string }}
 */
function tryMaoXing(tianPan, dayGan) {
  const ganYinYang = GAN_YINYANG_TABLE[dayGan];
  if (ganYinYang === '阳') {
    // 阳日：酉上神
    const initial = tianPanAt(tianPan, '酉');
    return { initial, method: '昴星-仰视' };
  } else {
    // 阴日：午上神
    const initial = tianPanAt(tianPan, '午');
    return { initial, method: '昴星-俯视' };
  }
}

/**
 * 别责法：昴星无课可用时的退路
 * v1 简化：取合神（日干三合）的支上神
 * 实际：取日干三合局中与日干同气的支，加于本日干支上
 *
 * @param {string} dayGan
 * @param {string[]} tianPan
 * @returns {{ initial: string, method: string }}
 */
function tryBieZe(dayGan, tianPan) {
  // 日干三合局
  const sanHe = GAN_SANHE[dayGan];
  // 取三合中与日干同阴阳的支（日干寄支所在三合）
  // v1 简化：取日干三合中的中支
  const middle = sanHe[1];
  const initial = tianPanAt(tianPan, middle);
  return { initial, method: '别责' };
}

// 日干三合局（用于别责法）
const GAN_SANHE = {
  '甲': ['寅', '午', '戌'],
  '乙': ['亥', '卯', '未'],
  '丙': ['寅', '午', '戌'],
  '丁': ['亥', '卯', '未'],
  '戊': ['寅', '午', '戌'],
  '己': ['亥', '卯', '未'],
  '庚': ['巳', '酉', '丑'],
  '辛': ['申', '子', '辰'],
  '壬': ['巳', '酉', '丑'],
  '癸': ['申', '子', '辰'],
};

/**
 * 八专法：干支同位（日干寄宫与日支相同）
 * 规则：阳日取第一课上神前三辰为初传；阴日取第一课上神前五辰
 * v1 简化：取第一课上神对冲为初传
 *
 * 实际八专条件：
 *   - 甲寅、丁未、戊午、己未、庚申、癸亥日（干支同位）
 *   - 阳日取第一课上神前三辰
 *   - 阴日取第一课上神前五辰
 *
 * @param {object[]} lessons
 * @param {string} dayGan
 * @returns {{ initial: string, method: string }}
 */
function tryBaZhuan(lessons, dayGan) {
  const firstUp = lessons[0].up;
  const ganYinYang = GAN_YINYANG_TABLE[dayGan];
  // 阳日：前三辰（顺时针3步）
  // 阴日：前五辰（顺时针5步）
  // 「前」在大六壬中通常指顺时针前进
  const steps = ganYinYang === '阳' ? 3 : 5;
  const upIdx = DI_ZHI_INDEX[firstUp];
  const initial = DI_ZHI[(upIdx + steps) % 12];
  return { initial, method: '八专' };
}

/**
 * 伏吟法：天地盘相同（月将=时支）
 * 规则：以日干寄支的上神为初传
 *   - 阳日: 取第一课上神；若日干为阳，取寄支本身
 *   - 阴日: 取干之冲（即日干寄支对冲）
 *
 * v1 简化：取日干寄支上神（= 日干寄支本身，因为天盘=地盘）
 * @param {object[]} lessons
 * @param {string} dayGan
 * @returns {{ initial: string, method: string }}
 */
function tryFuYin(lessons, dayGan) {
  // 伏吟：天盘=地盘，所以第一课上神=日干寄支
  const ganJi = GAN_JI_ZHI[dayGan];
  const ganYinYang = GAN_YINYANG_TABLE[dayGan];
  if (ganYinYang === '阳') {
    return { initial: ganJi, method: '伏吟-阳' };
  } else {
    // 阴日取对冲
    const chong = DI_ZHI[(DI_ZHI_INDEX[ganJi] + 6) % 12];
    return { initial: chong, method: '伏吟-阴' };
  }
}

/**
 * 反吟法：天地盘对冲（月将=时支对冲）
 * 规则：取第四课上神为初传（无克时）
 *   - 若有克则按贼克法处理（不走反吟分支）
 * v1 简化：取第四课上神
 * @param {object[]} lessons
 * @returns {{ initial: string, method: string }}
 */
function tryFanYin(lessons) {
  return { initial: lessons[3].up, method: '反吟' };
}

// ============ 天将排列 ============

/**
 * 计算12天将位置
 * @param {string} dayGan 日干
 * @param {boolean} isNight 是否夜占
 * @param {string[]} tianPan 天盘
 * @returns {object[]} 长度12数组，索引为地盘位置，值为天将名
 */
function placeTianJiang(dayGan, isNight, tianPan) {
  const [dayGui, nightGui] = GUIREN_TABLE[dayGan];
  const guirenZhi = isNight ? nightGui : dayGui;
  // 贵人本身在天盘上的位置
  // 实操：贵人所在的地盘位置 = 天盘上 guirenZhi 的位置（即 guirenZhi 在天盘哪个索引）
  // 注意：天将是布在天盘上的，所以是「天盘上的贵人所在的地盘位」
  // v1 实现：在地盘上找到天盘=guirenZhi 的位置
  const guirenPos = tianPan.indexOf(guirenZhi);
  const result = new Array(12).fill(null);
  // 贵人从此位置起，顺时针(昼)或逆时针(夜)布12天将
  const direction = isNight ? -1 : 1;  // 夜逆布、昼顺布
  for (let i = 0; i < 12; i++) {
    const pos = ((guirenPos + direction * i) % 12 + 12) % 12;
    result[pos] = TIANJIANG[i];
  }
  return { positions: result, guirenZhi, guirenPos, direction };
}

// ============ 中末传 ============

/**
 * 中传、末传
 * 规则：中传 = 天盘[初传位置]；末传 = 天盘[中传位置]
 * @param {string} initial 初传上神
 * @param {string[]} tianPan
 * @returns {{ initial: string, initialDown: string, middle: string, middleDown: string, last: string, lastDown: string }}
 */
function calcMiddleLast(initial, tianPan) {
  const initialDown = initial;  // 初传上神同时也是中传的查表位置
  // 中传上神 = 天盘[初传位置]
  const middle = tianPanAt(tianPan, initial);
  const middleDown = middle;
  const last = tianPanAt(tianPan, middle);
  const lastDown = last;
  return {
    initial,
    initialDown,
    middle,
    middleDown,
    last,
    lastDown,
  };
}

// ============ 主三传求取流程 ============

/**
 * 求三传
 * @param {object[]} lessons 四课
 * @param {string[]} tianPan 天盘
 * @param {string} dayGan 日干
 * @param {string} dayZhi 日支
 * @param {string} yueJiang 月将
 * @param {string} hourZhi 时支
 * @returns {{ initial, middle, last, method, trace: object }}
 */
function calcSanChuan(lessons, tianPan, dayGan, dayZhi, yueJiang, hourZhi) {
  const trace = {};

  // 1. 先判定伏吟/反吟
  // 伏吟：月将 == 时支 → 天盘 == 地盘
  if (yueJiang === hourZhi) {
    const r = tryFuYin(lessons, dayGan);
    const trans = calcMiddleLast(r.initial, tianPan);
    trace.fuYin = r;
    return { ...trans, method: r.method, trace };
  }
  // 反吟：月将 == 时支对冲
  if (DI_ZHI_INDEX[yueJiang] === (DI_ZHI_INDEX[hourZhi] + 6) % 12) {
    // 反吟优先按贼克法处理，无克才走反吟
    const zei = tryZeiKou(lessons);
    if (zei.initial) {
      const trans = calcMiddleLast(zei.initial, tianPan);
      trace.zeiKou = zei;
      return { ...trans, method: zei.method, trace };
    }
    const r = tryFanYin(lessons);
    const trans = calcMiddleLast(r.initial, tianPan);
    trace.fanYin = r;
    return { ...trans, method: r.method, trace };
  }

  // 2. 贼克法
  const zei = tryZeiKou(lessons);
  trace.zeiKou = zei;
  if (zei.initial) {
    const trans = calcMiddleLast(zei.initial, tianPan);
    return { ...trans, method: zei.method, trace };
  }

  // 3. 比用法（多个克课）
  if (zei.candidates.length >= 2) {
    const bi = tryBiYong(zei.candidates, dayGan);
    trace.biYong = bi;
    if (bi.initial) {
      const trans = calcMiddleLast(bi.initial, tianPan);
      return { ...trans, method: bi.method, trace };
    }
    // 4. 涉害法
    const she = trySheHai(zei.candidates, tianPan, dayGan);
    trace.sheHai = she;
    const trans = calcMiddleLast(she.initial, tianPan);
    return { ...trans, method: she.method, trace };
  }

  // 5. 遥克法（无上下克）
  const yao = tryYaoKou(lessons, dayGan);
  trace.yaoKou = yao;
  if (yao.initial) {
    const trans = calcMiddleLast(yao.initial, tianPan);
    return { ...trans, method: yao.method, trace };
  }

  // 6. 八专判定（干支同位）
  const ganJi = GAN_JI_ZHI[dayGan];
  if (ganJi === dayZhi) {
    const ba = tryBaZhuan(lessons, dayGan);
    trace.baZhuan = ba;
    const trans = calcMiddleLast(ba.initial, tianPan);
    return { ...trans, method: ba.method, trace };
  }

  // 7. 昴星法
  const mao = tryMaoXing(tianPan, dayGan);
  trace.maoXing = mao;
  // 昴星无解时退到别责（v1 简化：直接用昴星结果）
  const trans = calcMiddleLast(mao.initial, tianPan);
  return { ...trans, method: mao.method, trace };
}

// ============ 导出 ============

module.exports = {
  // 常量
  TIAN_GAN,
  DI_ZHI,
  DI_ZHI_INDEX,
  ZHI_WUXING,
  ZHI_YINYANG,
  WUXING_KE,
  YUEJIANG_BY_QI,
  GAN_JI_ZHI,
  TIANJIANG,
  GUIREN_TABLE,
  TIANJIANG_WUXING,
  GAN_WUXING_TABLE,
  GAN_YINYANG_TABLE,
  GAN_SANHE,
  // 函数
  calcYueJiang,
  buildTianPan,
  tianPanAt,
  calcFourLessons,
  lessonRelation,
  tryZeiKou,
  tryBiYong,
  trySheHai,
  tryYaoKou,
  tryMaoXing,
  tryBieZe,
  tryBaZhuan,
  tryFuYin,
  tryFanYin,
  placeTianJiang,
  calcMiddleLast,
  calcSanChuan,
  calcSheHaiDepth,
};
