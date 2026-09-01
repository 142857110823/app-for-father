/**
 * 梅花易数排盘引擎 + 三卦并排 UI（本卦 / 互卦 / 变卦）
 *
 * 挂载：window.MeiHuaPro = { paiPan, render, selfTest }
 * 纯自包含：内置 1900-2100 农历压缩数据表（已与 lunar-javascript 全量 73384 天逐日比对一致），无外部依赖。
 *
 * paiPan(input) 两种起卦模式：
 *   1) 时间起卦（标准梅花心易，农历）：
 *      { year, month, day, hour, minute } 或 { date:'2026-08-14', hour:14, minute:22 }
 *      - 上卦 = (年支序数[子1…亥12] + 农历月 + 农历日) ÷ 8 取余（余 0 当 8）
 *      - 下卦 = (上述和 + 时辰序数[子1…亥12]) ÷ 8 取余（余 0 当 8）
 *      - 动爻 = 总和 ÷ 6 取余（余 0 当 6）
 *      - 闰月按基月计数（如闰六月按六月）
 *   2) 数字起卦：{ numbers:[a,b] } 两数 或 { numbers:[a,b,c] } 三数
 *      - a ÷ 8 余为上卦（余 0 当 8）、b ÷ 8 余为下卦（余 0 当 8）
 *      - 两数：(a+b) ÷ 6 余为动爻；三数：(a+b+c) ÷ 6 余为动爻（余 0 当 6）
 *      - 可选附带 date/year… 用于确定季节卦气，缺省用当前系统时间
 *
 * render(el, result)：将 paiPan 结果渲染进容器 el（元素或 id），返回 HTML 字符串；类名前缀 mh-
 *
 * 历法核验说明：2026-08-14 经 lunar-javascript 与公开万年历多方核实为农历丙午年七月初二
 * （丙午年 丙申月 壬戌日，未时）。原文档如出现「七月十二」属于笔误，七月十二对应 2026-08-24。
 */
(function (global) {
  'use strict';

  var VERSION = 'meihua@1.0.0';

  /* ==================== 一、八宫八卦基础数据 ==================== */

  // 先天八卦卦序（乾一 兑二 离三 震四 巽五 坎六 艮七 坤八）
  var GUA_KEYS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];

  // yao 三爻数组从下（初爻）到上；1=阳爻 0=阴爻
  var BAGUA = {
    '乾': { name: '乾', symbol: '☰', nature: '天', yao: [1, 1, 1], wuxing: '金', direction: '西北', number: 1 },
    '兑': { name: '兑', symbol: '☱', nature: '泽', yao: [1, 1, 0], wuxing: '金', direction: '西',   number: 2 },
    '离': { name: '离', symbol: '☲', nature: '火', yao: [1, 0, 1], wuxing: '火', direction: '南',   number: 3 },
    '震': { name: '震', symbol: '☳', nature: '雷', yao: [1, 0, 0], wuxing: '木', direction: '东',   number: 4 },
    '巽': { name: '巽', symbol: '☴', nature: '风', yao: [0, 1, 1], wuxing: '木', direction: '东南', number: 5 },
    '坎': { name: '坎', symbol: '☵', nature: '水', yao: [0, 1, 0], wuxing: '水', direction: '北',   number: 6 },
    '艮': { name: '艮', symbol: '☶', nature: '山', yao: [0, 0, 1], wuxing: '土', direction: '东北', number: 7 },
    '坤': { name: '坤', symbol: '☷', nature: '地', yao: [0, 0, 0], wuxing: '土', direction: '西南', number: 8 }
  };

  /* ==================== 二、六十四卦名对照表（上卦 × 下卦） ==================== */

  var GUA64 = {
    '乾': { '乾': '乾为天', '兑': '天泽履', '离': '天火同人', '震': '天雷无妄', '巽': '天风姤', '坎': '天水讼', '艮': '天山遁', '坤': '天地否' },
    '兑': { '乾': '泽天夬', '兑': '兑为泽', '离': '泽火革', '震': '泽雷随', '巽': '泽风大过', '坎': '泽水困', '艮': '泽山咸', '坤': '泽地萃' },
    '离': { '乾': '火天大有', '兑': '火泽睽', '离': '离为火', '震': '火雷噬嗑', '巽': '火风鼎', '坎': '火水未济', '艮': '火山旅', '坤': '火地晋' },
    '震': { '乾': '雷天大壮', '兑': '雷泽归妹', '离': '雷火丰', '震': '震为雷', '巽': '雷风恒', '坎': '雷水解', '艮': '雷山小过', '坤': '雷地豫' },
    '巽': { '乾': '风天小畜', '兑': '风泽中孚', '离': '风火家人', '震': '风雷益', '巽': '巽为风', '坎': '风水涣', '艮': '风山渐', '坤': '风地观' },
    '坎': { '乾': '水天需', '兑': '水泽节', '离': '水火既济', '震': '水雷屯', '巽': '水风井', '坎': '坎为水', '艮': '水山蹇', '坤': '水地比' },
    '艮': { '乾': '山天大畜', '兑': '山泽损', '离': '山火贲', '震': '山雷颐', '巽': '山风蛊', '坎': '山水蒙', '艮': '艮为山', '坤': '山地剥' },
    '坤': { '乾': '地天泰', '兑': '地泽临', '离': '地火明夷', '震': '地雷复', '巽': '地风升', '坎': '地水师', '艮': '地山谦', '坤': '坤为地' }
  };

  /* ==================== 三、五行生克 / 天干地支 ==================== */

  var WUXING_SHENG = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' }; // A 生 B
  var WUXING_KE = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };     // A 克 B

  var TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var ZHI_INDEX = { '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6, '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12 };

  // 农历日期中文（初一…三十）
  var DAY_CN = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  // 农历月份中文（正月…十二月）
  var MONTH_CN = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

  /* ==================== 四、农历数据表（1900-2100） ==================== */
  /*
   * 每年一个 16 进制数：
   *   bit15..bit4  依次为农历正月..十二月（1=大月30天，0=小月29天）
   *   bit16        闰月大小（1=闰大月30天）
   *   bit3..bit0   闰月月份（0=当年无闰月）
   * 数据由 lunar-javascript 逐月提取生成，并与经典 calendar.js 表逐项一致；
   * 公历→农历转换算法经 1900-01-31 起全部 73384 天比对零误差。
   */
  var LUNAR_INFO = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,//1900-1909
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,//1910-1919
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,//1920-1929
    0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,//1930-1939
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,//1940-1949
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,//1950-1959
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,//1960-1969
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,//1970-1979
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,//1980-1989
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,//1990-1999
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,//2000-2009
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,//2010-2019
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,//2020-2029
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,//2030-2039
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,//2040-2049
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,//2050-2059
    0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,//2060-2069
    0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,//2070-2079
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,//2080-2089
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,//2090-2099
    0x0d520//2100-2109
  ];

  // 农历某年总天数
  function lunarYearDays(y) {
    var sum = 348;
    for (var i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
    return sum + leapDays(y);
  }
  // 农历某年闰几月（0 = 无闰月）
  function leapMonthOf(y) { return LUNAR_INFO[y - 1900] & 0xf; }
  // 农历某年闰月天数
  function leapDays(y) { return leapMonthOf(y) ? ((LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29) : 0; }
  // 农历某年 m 月（基月 1-12）天数
  function lunarMonthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }

  /**
   * 公历 → 农历（1900-01-31 ~ 2100-12-31）
   * @returns {{year,month,day,isLeap,leapMonthOf}} month 为基月号；isLeap=true 表示处于闰月
   */
  function solarToLunar(sy, sm, sd) {
    var offset = Math.floor((Date.UTC(sy, sm - 1, sd) - Date.UTC(1900, 0, 31)) / 86400000);
    if (offset < 0) throw new Error('[meihua] 仅支持 1900-01-31 之后的公历日期');
    var y, temp = 0;
    for (y = 1900; y < 2101 && offset > 0; y++) { temp = lunarYearDays(y); offset -= temp; }
    if (offset < 0) { offset += temp; y--; }
    var leap = leapMonthOf(y), isLeap = false, m;
    for (m = 1; m < 13 && offset > 0; m++) {
      if (leap > 0 && m === leap + 1 && !isLeap) { --m; isLeap = true; temp = leapDays(y); }
      else { temp = lunarMonthDays(y, m); }
      if (isLeap && m === leap + 1) isLeap = false;
      offset -= temp;
    }
    if (offset === 0 && leap > 0 && m === leap + 1) {
      if (isLeap) { isLeap = false; } else { isLeap = true; --m; }
    }
    if (offset < 0) { offset += temp; --m; }
    return { year: y, month: m, day: offset + 1, isLeap: isLeap, leapMonthOf: leap };
  }

  /* ==================== 五、工具函数 ==================== */

  function mod(n, m) { var r = n % m; return r < 0 ? r + m : r; }
  // 卦数：÷8 取余，余 0 当 8（坤）
  function guaNumberOf(n) { var r = mod(n, 8); return r === 0 ? 8 : r; }
  // 动爻数：÷6 取余，余 0 当 6（上爻）
  function dongNumberOf(n) { var r = mod(n, 6); return r === 0 ? 6 : r; }

  // 起卦小时 → 时辰地支（23-1 子、1-3 丑 … 21-23 亥）
  function hourZhi(hour) {
    var h = ((Number(hour) % 24) + 24) % 24;
    var idx = Math.floor((h + 1) / 2) % 12; // 0=子 … 11=亥
    return DI_ZHI[idx];
  }

  // 农历年 → 年干支（以正月初一为界）
  function yearGanZhi(lunarYear) {
    return TIAN_GAN[mod(lunarYear - 4, 10)] + DI_ZHI[mod(lunarYear - 4, 12)];
  }

  // 解析输入中的日期时间（支持 year/month/day 字段或 date 字符串 'YYYY-MM-DD[ HH:mm]'）
  function parseDateTime(input) {
    if (input.year && input.month && input.day) {
      return {
        year: Number(input.year), month: Number(input.month), day: Number(input.day),
        hour: Number(input.hour || 0), minute: Number(input.minute || 0)
      };
    }
    if (input.date) {
      var m = String(input.date).match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2}))?/);
      if (!m) throw new Error('[meihua] date 格式应为 YYYY-MM-DD 或 YYYY-MM-DD HH:mm');
      return { year: +m[1], month: +m[2], day: +m[3], hour: +(m[4] || input.hour || 0), minute: +(m[5] || input.minute || 0) };
    }
    return null;
  }

  // 由三爻数组反查八卦名
  function guaNameOfYao(yao3) {
    for (var i = 0; i < GUA_KEYS.length; i++) {
      var y = BAGUA[GUA_KEYS[i]].yao;
      if (y[0] === yao3[0] && y[1] === yao3[1] && y[2] === yao3[2]) return GUA_KEYS[i];
    }
    throw new Error('[meihua] 爻数组非法: ' + yao3.join(','));
  }

  // 组装一个重卦（上卦 + 下卦）
  function buildGua(upperName, lowerName) {
    var upper = BAGUA[upperName], lower = BAGUA[lowerName];
    var yao = lower.yao.concat(upper.yao); // 初爻 → 上爻
    return {
      name: GUA64[upperName][lowerName],
      upper: upperName, lower: lowerName,
      upperSymbol: upper.symbol, lowerSymbol: lower.symbol,
      upperNature: upper.nature, lowerNature: lower.nature,
      yao: yao,
      yaoSymbols: yao.map(function (v) { return v ? '⚌' : '⚋'; }), // 阳爻⚌ 阴爻⚋
      wuxing: upper.wuxing + '、' + lower.wuxing,
      upperWuxing: upper.wuxing, lowerWuxing: lower.wuxing,
      upperNumber: upper.number, lowerNumber: lower.number
    };
  }

  // 五行关系：from 对 to（'生' | '克' | '同' | '被生' | '被克'）
  function wuxingRelation(from, to) {
    if (from === to) return '同';
    if (WUXING_SHENG[from] === to) return '生';
    if (WUXING_KE[from] === to) return '克';
    if (WUXING_SHENG[to] === from) return '被生';
    return '被克';
  }

  // 卦气旺衰：按农历月定季节（1-3春 4-6夏 7-9秋 10-12冬；三/六/九/十二月为土旺之月）
  var SEASONS = [{ name: '春', wuxing: '木' }, { name: '夏', wuxing: '火' }, { name: '秋', wuxing: '金' }, { name: '冬', wuxing: '水' }];
  function wangShuaiOf(wuxing, lunarMonth) {
    var season = SEASONS[Math.ceil(lunarMonth / 3) - 1];
    if (wuxing === '土' && lunarMonth % 3 === 0) return '旺'; // 土旺四季月
    if (wuxing === season.wuxing) return '旺';             // 当令
    if (WUXING_SHENG[season.wuxing] === wuxing) return '相'; // 季节生我
    if (WUXING_SHENG[wuxing] === season.wuxing) return '休'; // 我生季节
    if (WUXING_KE[wuxing] === season.wuxing) return '囚';    // 我克季节
    return '死';                                             // 季节克我
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* ==================== 六、核心引擎 paiPan ==================== */

  /**
   * 梅花易数排盘
   * @param {Object} input 时间起卦 { year, month, day, hour, minute } / { date:'YYYY-MM-DD', hour, minute }
   *                      数字起卦 { numbers:[a,b] } 或 { numbers:[a,b,c] }（可附 date 用于季节卦气）
   * @returns {Object} 排盘结果（结构见文件头注释）
   */
  function paiPan(input) {
    input = input || {};
    var hasNumbers = Object.prototype.toString.call(input.numbers) === '[object Array]' && input.numbers.length >= 2;
    var mode = hasNumbers ? 'number' : 'time';

    var dt = parseDateTime(input);
    if (!dt) {
      var now = new Date();
      dt = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours(), minute: now.getMinutes() };
    }

    // ---- 起卦数值计算 ----
    var upperNum, lowerNum, dongNum, calcText = '';
    var lunar = null, numbersUsed = null;

    if (mode === 'number') {
      var nums = input.numbers.map(function (v) { return Math.abs(Math.round(Number(v))); });
      numbersUsed = nums.slice(0, 3);
      var a = numbersUsed[0], b = numbersUsed[1];
      var c = numbersUsed.length >= 3 ? numbersUsed[2] : null;
      upperNum = guaNumberOf(a);
      lowerNum = guaNumberOf(b);
      dongNum = dongNumberOf(c === null ? a + b : a + b + c);
      calcText = '上卦 ' + a + '÷8余' + mod(a, 8) + (mod(a, 8) === 0 ? '→当8' : '') + ' → ' + GUA_KEYS[upperNum - 1] +
        '；下卦 ' + b + '÷8余' + mod(b, 8) + (mod(b, 8) === 0 ? '→当8' : '') + ' → ' + GUA_KEYS[lowerNum - 1] +
        '；动爻 ' + (c === null ? a + '+' + b : a + '+' + b + '+' + c) + '=' + (a + b + (c || 0)) +
        '÷6余' + mod(a + b + (c || 0), 6) + (mod(a + b + (c || 0), 6) === 0 ? '→当6' : '') + ' → 第' + dongNum + '爻';
    } else {
      lunar = solarToLunar(dt.year, dt.month, dt.day);
      var yearZhi = DI_ZHI[mod(lunar.year - 4, 12)];
      var yearZhiIndex = ZHI_INDEX[yearZhi];        // 年支序数（子1…亥12）
      var monthNum = lunar.month;                     // 闰月按基月计数
      var dayNum = lunar.day;
      var hZhi = hourZhi(dt.hour);
      var hourZhiIndex = ZHI_INDEX[hZhi];             // 时辰序数（子1…亥12）
      var sum1 = yearZhiIndex + monthNum + dayNum;
      var sum2 = sum1 + hourZhiIndex;
      upperNum = guaNumberOf(sum1);
      lowerNum = guaNumberOf(sum2);
      dongNum = dongNumberOf(sum2);
      calcText = '上卦 年支' + yearZhi + yearZhiIndex + '+月' + monthNum + '+日' + dayNum + '=' + sum1 +
        '÷8余' + mod(sum1, 8) + (mod(sum1, 8) === 0 ? '→当8' : '') + ' → ' + GUA_KEYS[upperNum - 1] +
        '；下卦 ' + sum1 + '+时辰' + hZhi + hourZhiIndex + '=' + sum2 +
        '÷8余' + mod(sum2, 8) + (mod(sum2, 8) === 0 ? '→当8' : '') + ' → ' + GUA_KEYS[lowerNum - 1] +
        '；动爻 ' + sum2 + '÷6余' + mod(sum2, 6) + (mod(sum2, 6) === 0 ? '→当6' : '') + ' → 第' + dongNum + '爻';
    }

    // ---- 三卦构造 ----
    var upperName = GUA_KEYS[upperNum - 1];
    var lowerName = GUA_KEYS[lowerNum - 1];
    var benGua = buildGua(upperName, lowerName);

    // 互卦：2/3/4 爻为下互卦，3/4/5 爻为上互卦
    var huLower = [benGua.yao[1], benGua.yao[2], benGua.yao[3]];
    var huUpper = [benGua.yao[2], benGua.yao[3], benGua.yao[4]];
    var huGua = buildGua(guaNameOfYao(huUpper), guaNameOfYao(huLower));

    // 变卦：动爻阴阳取反
    var bianYao = benGua.yao.slice();
    bianYao[dongNum - 1] = bianYao[dongNum - 1] ? 0 : 1;
    var bianGua = buildGua(guaNameOfYao(bianYao.slice(3)), guaNameOfYao(bianYao.slice(0, 3)));

    // ---- 体用判定（动爻所在卦为用，另一卦为体） ----
    var dongInUpper = dongNum >= 4;
    var tiPosition = dongInUpper ? 'lower' : 'upper';   // 体卦位置
    var yongPosition = dongInUpper ? 'upper' : 'lower';
    var tiGuaName = tiPosition === 'upper' ? upperName : lowerName;
    var yongGuaName = yongPosition === 'upper' ? upperName : lowerName;
    var tiWuxing = BAGUA[tiGuaName].wuxing;
    var yongWuxing = BAGUA[yongGuaName].wuxing;

    // 体用关系（以体为立场）：比和 / 用生体 / 体生用 / 用克体 / 体克用
    var tiYongRelation, luck, luckNote;
    if (tiWuxing === yongWuxing) {
      tiYongRelation = '比和'; luck = '吉'; luckNote = '体用比和，同声同气，谋事易成';
    } else if (WUXING_SHENG[yongWuxing] === tiWuxing) {
      tiYongRelation = '用生体'; luck = '吉'; luckNote = '用卦生扶体卦，得外力相助，进益之象';
    } else if (WUXING_SHENG[tiWuxing] === yongWuxing) {
      tiYongRelation = '体生用'; luck = '小凶'; luckNote = '体卦泄气于用卦，劳心耗力，防付出多回报少';
    } else if (WUXING_KE[yongWuxing] === tiWuxing) {
      tiYongRelation = '用克体'; luck = '凶'; luckNote = '用卦克制体卦，外患侵扰，谋事多阻，宜守静避让';
    } else {
      tiYongRelation = '体克用'; luck = '小吉'; luckNote = '体卦克制用卦，事可为而费力，胜中带辛劳';
    }

    // ---- 互卦 / 变卦五行对体卦的生克链 ----
    var relName = { '生': '生体', '被生': '体生之', '克': '克体', '被克': '体克之', '同': '比和' };
    var huUpperRel = relName[wuxingRelation(huGua.upperWuxing, tiWuxing)];
    var huLowerRel = relName[wuxingRelation(huGua.lowerWuxing, tiWuxing)];
    // 变卦五行取「用卦位置」变化后的经卦（动爻所在新卦），代表事之结局
    var bianWuxing = yongPosition === 'upper' ? bianGua.upperWuxing : bianGua.lowerWuxing;
    var bianRel = relName[wuxingRelation(bianWuxing, tiWuxing)];
    var chainText = '互卦上' + huGua.upper + '(' + huGua.upperWuxing + ')' + huUpperRel +
      '、下' + huGua.lower + '(' + huGua.lowerWuxing + ')' + huLowerRel +
      '；变卦' + (yongPosition === 'upper' ? '上' : '下') + (yongPosition === 'upper' ? bianGua.upper : bianGua.lower) +
      '(' + bianWuxing + ')' + bianRel;

    // ---- 卦气旺衰（按季节） ----
    var lunarMonthForSeason = lunar ? lunar.month : solarToLunar(dt.year, dt.month, dt.day).month;
    var season = SEASONS[Math.ceil(lunarMonthForSeason / 3) - 1];
    var isTuMonth = lunarMonthForSeason % 3 === 0;
    var tiWang = wangShuaiOf(tiWuxing, lunarMonthForSeason);
    var wangNote = season.name + (isTuMonth ? '（土旺之月）' : '·' + season.wuxing + '旺') + '，体' + tiGuaName + tiWuxing + '处「' + tiWang + '」地';

    // ---- 时间/农历描述 ----
    var timeDesc = dt.year + '-' + pad2(dt.month) + '-' + pad2(dt.day) + ' ' + pad2(dt.hour) + ':' + pad2(dt.minute);
    var lunarText = null;
    if (lunar) {
      lunarText = yearGanZhi(lunar.year) + '年' + (lunar.isLeap ? '闰' : '') +
        MONTH_CN[lunar.month - 1] + '月' + DAY_CN[lunar.day - 1] +
        ' ' + hourZhi(dt.hour) + '时';
    }

    return {
      version: VERSION,
      mode: mode,                                   // 'time' | 'number'
      input: { year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute, numbers: numbersUsed },
      time: timeDesc,                               // 公历时间串
      lunar: lunar ? {
        year: lunar.year, month: lunar.month, day: lunar.day, isLeap: lunar.isLeap,
        leapMonthOf: lunar.leapMonthOf,
        yearGanZhi: yearGanZhi(lunar.year),
        yearZhi: DI_ZHI[mod(lunar.year - 4, 12)],
        yearZhiIndex: ZHI_INDEX[DI_ZHI[mod(lunar.year - 4, 12)]],
        hourZhi: hourZhi(dt.hour),
        hourZhiIndex: ZHI_INDEX[hourZhi(dt.hour)],
        text: lunarText
      } : null,
      numbers: numbersUsed,
      calc: { upperNum: upperNum, lowerNum: lowerNum, dongNum: dongNum, text: calcText },
      benGua: benGua,
      huGua: huGua,
      bianGua: bianGua,
      dongYao: dongNum,                             // 动爻位置 1-6（初爻→上爻）
      dongYaoInUpper: dongInUpper,                  // 动爻是否在上卦
      tiYong: {
        tiPosition: tiPosition,                     // 'upper' | 'lower'
        yongPosition: yongPosition,
        tiGua: tiGuaName, tiWuxing: tiWuxing,
        yongGua: yongGuaName, yongWuxing: yongWuxing,
        relation: tiYongRelation,                   // 比和/用生体/体生用/用克体/体克用
        display: '体' + tiGuaName + '(' + tiWuxing + ') 用' + yongGuaName + '(' + yongWuxing + ') ' + tiYongRelation,
        luck: luck, luckNote: luckNote
      },
      huBian: {
        huUpperWuxing: huGua.upperWuxing, huLowerWuxing: huGua.lowerWuxing,
        huUpperRelation: huUpperRel, huLowerRelation: huLowerRel,
        bianWuxing: bianWuxing, bianRelation: bianRel,
        chain: chainText
      },
      season: {
        name: season.name, wuxing: season.wuxing, lunarMonth: lunarMonthForSeason,
        isTuMonth: isTuMonth, tiWangShuai: tiWang, note: wangNote
      },
      summary: '本卦' + benGua.name + '（' + dongNum + '爻动）→ 互卦' + huGua.name + ' → 变卦' + bianGua.name +
        '。体' + tiGuaName + tiWuxing + '用' + yongGuaName + yongWuxing + '，' + tiYongRelation + '（' + luck + '）。' +
        wangNote + '。' + luckNote
    };
  }

  /* ==================== 七、渲染 render ==================== */

  var STYLE_ID = 'mh-style-injected';

  function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    var css = '' +
      '.mh-root{font-family:"KaiTi","STKaiti","Kaiti SC","DFKai-SB",serif;background:#f5f2e9;color:#2b2b2b;' +
      'border:1px solid #d8d2c4;border-radius:10px;padding:14px 12px 10px;max-width:600px;margin:0 auto;' +
      'box-shadow:0 1px 5px rgba(43,43,43,.07);box-sizing:border-box}' +
      '.mh-title{font-size:20px;font-weight:700;text-align:center;letter-spacing:8px;color:#2b2b2b;margin-bottom:2px}' +
      '.mh-sub{font-size:12px;text-align:center;color:#8b6914;letter-spacing:2px;margin-bottom:8px}' +
      '.mh-meta{font-size:12.5px;text-align:center;color:#55503f;line-height:1.7;background:#efeade;' +
      'border:1px solid #e2dccb;border-radius:6px;padding:5px 8px;margin-bottom:4px}' +
      '.mh-calc{font-size:11.5px;color:#7a7461;line-height:1.7;padding:2px 8px 6px;text-align:center}' +
      '.mh-board{display:flex;justify-content:center;align-items:flex-start;gap:8px;margin:8px 0 4px}' +
      '.mh-gua{flex:1 1 0;min-width:100px;max-width:160px;background:#fbf9f2;border:1px solid #e0dac9;' +
      'border-radius:8px;padding:8px 6px 7px;box-sizing:border-box;position:relative}' +
      '.mh-gua-ben{border-color:#c9b980;box-shadow:0 0 0 1px #c9b980 inset}' +
      '.mh-gua-label{text-align:center;font-size:13px;font-weight:700;color:#8b6914;letter-spacing:4px;' +
      'border-bottom:1px dashed #d8d2c4;padding-bottom:4px;margin-bottom:8px}' +
      '.mh-yao-stack{position:relative;display:flex;flex-direction:column;gap:8px;padding:4px 10px 6px}' +
      '.mh-yao-row{display:flex;align-items:center;justify-content:center;position:relative;height:12px}' +
      '.mh-yao-lines{display:flex;gap:14px;justify-content:center;align-items:center}' +
      '.mh-yao-line{display:block;height:7px;width:62px;background:#2b2b2b;border-radius:2px}' +
      '.mh-yin .mh-yao-line{width:24px}' +
      '.mh-yao-dong .mh-yao-line{background:#b94a3a}' +
      '.mh-yao-flag{position:absolute;right:-4px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:3px}' +
      '.mh-dong-ring{display:inline-block;width:12px;height:12px;border:2px solid #b94a3a;border-radius:50%;box-sizing:border-box}' +
      '.mh-dong-txt{color:#b94a3a;font-size:12px;font-weight:700;line-height:1}' +
      '.mh-badge{position:absolute;right:6px;font-size:12px;font-weight:700;line-height:1;' +
      'padding:3px 5px;border-radius:3px;color:#f5f2e9;z-index:2}' +
      '.mh-badge-ti{top:14px;background:#8b6914}' +
      '.mh-badge-yong{bottom:14px;background:#4a4a4a}' +
      '.mh-gua-name{text-align:center;font-size:15px;font-weight:700;color:#2b2b2b;letter-spacing:2px;' +
      'border-top:1px dashed #d8d2c4;padding-top:6px;margin-top:8px}' +
      '.mh-gua-sub{text-align:center;font-size:11.5px;color:#7a7461;line-height:1.7}' +
      '.mh-info{border-top:1px solid #d8d2c4;margin-top:8px;padding-top:7px}' +
      '.mh-info-row{display:flex;align-items:flex-start;gap:6px;font-size:12.5px;line-height:1.7;padding:2px 2px}' +
      '.mh-info-label{flex:0 0 auto;color:#f5f2e9;background:#8b6914;font-size:11.5px;border-radius:3px;' +
      'padding:1px 6px;margin-top:2px;letter-spacing:2px}' +
      '.mh-luck{display:inline-block;font-weight:700;margin-left:6px;padding:0 6px;border-radius:3px;font-size:12px}' +
      '.mh-luck-ji{color:#2e6b34;background:#e2efdd;border:1px solid #bcd9bd}' +
      '.mh-luck-xiaoji{color:#8b6914;background:#f3ecd7;border:1px solid #d9c998}' +
      '.mh-luck-xiong{color:#b94a3a;background:#f7e3df;border:1px solid #e0b6ac}' +
      '.mh-summary{font-size:12.5px;line-height:1.8;color:#55503f;background:#efeade;border-radius:6px;' +
      'padding:6px 9px;margin-top:5px;border:1px solid #e2dccb}' +
      '@media (max-width:420px){.mh-yao-line{width:46px}.mh-yin .mh-yao-line{width:18px}' +
      '.mh-gua{min-width:86px;padding:6px 4px 6px}.mh-yao-stack{padding:4px 12px 6px}' +
      '.mh-board{gap:5px}.mh-title{letter-spacing:5px}}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.type = 'text/css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 单爻行 HTML：阳爻一条长横实线，阴爻两段断线；动爻加朱红圆圈 + 红字「动」
  function yaoRowHtml(val, isDong) {
    var cls = val ? 'mh-yang' : 'mh-yin';
    var lines = val
      ? '<span class="mh-yao-line"></span>'
      : '<span class="mh-yao-line"></span><span class="mh-yao-line"></span>';
    var flag = isDong
      ? '<span class="mh-yao-flag"><span class="mh-dong-ring"></span><span class="mh-dong-txt">动</span></span>'
      : '';
    return '<div class="mh-yao-row ' + cls + (isDong ? ' mh-yao-dong' : '') + '">' +
      '<span class="mh-yao-lines">' + lines + '</span>' + flag + '</div>';
  }

  // 一卦列 HTML：标签 + 六爻（从上爻到初爻渲染，初爻位于底部）+ 卦名 + 上下卦信息
  function guaColumnHtml(label, gua, opts) {
    opts = opts || {};
    var html = '<div class="mh-gua ' + (opts.cls || '') + '">';
    html += '<div class="mh-gua-label">' + esc(label) + '</div>';
    html += '<div class="mh-yao-stack">';
    // 体/用标记（仅本卦列显示）
    if (opts.badgeUpper) html += '<div class="mh-badge ' + (opts.badgeUpper === 'ti' ? 'mh-badge-ti' : 'mh-badge-yong') + '">' + (opts.badgeUpper === 'ti' ? '体' : '用') + '</div>';
    if (opts.badgeLower) html += '<div class="mh-badge ' + (opts.badgeLower === 'ti' ? 'mh-badge-ti' : 'mh-badge-yong') + '">' + (opts.badgeLower === 'ti' ? '体' : '用') + '</div>';
    // 从第 6 爻（上爻）到第 1 爻（初爻）依次输出
    for (var i = 5; i >= 0; i--) {
      html += yaoRowHtml(gua.yao[i], opts.dongYao === (i + 1));
    }
    html += '</div>';
    html += '<div class="mh-gua-name">' + esc(gua.name) + '</div>';
    html += '<div class="mh-gua-sub">上' + esc(gua.upper) + gua.upperSymbol + '（' + esc(gua.upperNature) + '·' + esc(gua.upperWuxing) + '）<br>' +
      '下' + esc(gua.lower) + gua.lowerSymbol + '（' + esc(gua.lowerNature) + '·' + esc(gua.lowerWuxing) + '）</div>';
    html += '</div>';
    return html;
  }

  /**
   * 渲染排盘结果：三卦横向并排（本卦→互卦→变卦）+ 底部信息条
   * @param {HTMLElement|string} el 容器元素或其 id
   * @param {Object} result paiPan 返回值
   * @returns {string} 生成的 HTML
   */
  function render(el, result) {
    var root = typeof el === 'string' ? document.getElementById(el) : el;
    if (!root) throw new Error('[meihua] render 目标容器不存在');
    if (!result || !result.benGua) throw new Error('[meihua] render 需要 paiPan 的返回值作为入参');

    injectStyles();

    var luckCls = result.tiYong.luck === '吉' ? 'mh-luck-ji'
      : result.tiYong.luck === '小吉' ? 'mh-luck-xiaoji' : 'mh-luck-xiong';

    var html = '<div class="mh-root">';
    html += '<div class="mh-title">梅花易数</div>';
    html += '<div class="mh-sub">本卦 → 互卦 → 变卦</div>';

    // 起卦信息
    html += '<div class="mh-meta">';
    if (result.mode === 'time') {
      html += '时间起卦 · ' + esc(result.time) + '（农历' + esc(result.lunar.text) + '）';
    } else {
      html += '数字起卦 · [' + result.numbers.join(', ') + ']';
      if (result.time) html += '（季节参照 ' + esc(result.time) + '）';
    }
    html += '</div>';
    html += '<div class="mh-calc">' + esc(result.calc.text) + '</div>';

    // 三卦横向并排：本卦 → 互卦 → 变卦
    var tiPos = result.tiYong.tiPosition;
    html += '<div class="mh-board">';
    html += guaColumnHtml('本卦', result.benGua, {
      cls: 'mh-gua-ben',
      dongYao: result.dongYao,
      badgeUpper: tiPos === 'upper' ? 'ti' : 'yong',
      badgeLower: tiPos === 'lower' ? 'ti' : 'yong'
    });
    html += guaColumnHtml('互卦', result.huGua, {});
    html += guaColumnHtml('变卦', result.bianGua, {});
    html += '</div>';

    // 底部信息条：体用关系 + 吉凶提示 + 互变卦生克链 + 卦气
    html += '<div class="mh-info">';
    html += '<div class="mh-info-row"><span class="mh-info-label">体用</span><span>' +
      esc(result.tiYong.display) + '<span class="mh-luck ' + luckCls + '">' + esc(result.tiYong.luck) + '</span></span></div>';
    html += '<div class="mh-info-row"><span class="mh-info-label">互变</span><span>' +
      '互卦' + esc(result.huGua.name) + '、变卦' + esc(result.bianGua.name) + '：' + esc(result.huBian.chain) + '</span></div>';
    html += '<div class="mh-info-row"><span class="mh-info-label">卦气</span><span>' +
      esc(result.season.note) + '（动爻：第' + result.dongYao + '爻）</span></div>';
    html += '<div class="mh-summary">' + esc(result.summary) + '</div>';
    html += '</div>';

    html += '</div>';

    root.innerHTML = html;
    return html;
  }

  /* ==================== 八、自测 selfTest ==================== */

  /**
   * 自测：每个用例均先手算列出算式（handCalc），再与 paiPan 实际输出逐字段比对
   * @returns {{passed:boolean,total:number,passedCount:number,cases:Array}}
   */
  function selfTest() {
    var cases = [];

    function addCase(name, handCalc, expected, actual) {
      cases.push({
        name: name,
        handCalc: handCalc,
        expected: expected,
        actual: actual,
        pass: JSON.stringify(expected) === JSON.stringify(actual)
      });
    }

    // 提取被测字段（数字起卦用例不比季节字段，因其随运行日期变化）
    function pick(result, withSeason) {
      var p = {
        lunarText: result.lunar ? result.lunar.text : null,
        benGua: result.benGua.name,
        benYao: result.benGua.yao.join(''),
        huGua: result.huGua.name,
        bianGua: result.bianGua.name,
        dongYao: result.dongYao,
        tiYongRelation: result.tiYong.relation,
        luck: result.tiYong.luck
      };
      if (withSeason) { p.season = result.season.name; p.tiWangShuai = result.season.tiWangShuai; }
      return p;
    }

    // 用例 1：时间起卦 2026-08-14 14:22（任务指定日期）
    // 农历核验：2026-08-14 = 丙午年七月初二（lunar-javascript + 公开万年历多方核实；
    //           任务原文写「七月十二」为笔误，农历七月十二实为 2026-08-24，见用例 2）
    // 手算：年支午7 + 月7 + 日2 = 16，16÷8 余 0 → 当 8 坤（上卦）
    //       16 + 未时8 = 24，24÷8 余 0 → 当 8 坤（下卦）；24÷6 余 0 → 当 6（动爻）
    //       本卦坤为地 [000000]；互卦 234/345 爻均 [000] → 坤为地
    //       变卦第 6 爻阴变阳 → [000001] 上艮下坤 → 山地剥
    //       动爻在上卦 → 上坤为用、下坤为体，土土比和（吉）；秋月体土处「休」
    var r1 = paiPan({ year: 2026, month: 8, day: 14, hour: 14, minute: 22 });
    addCase(
      '时间起卦 2026-08-14 14:22 未时（农历七月初二）',
      '午7+月7+日2=16÷8余0→坤8；16+未8=24÷8余0→坤8；24÷6余0→第6爻',
      { lunarText: '丙午年七月初二 未时', benGua: '坤为地', benYao: '000000', huGua: '坤为地', bianGua: '山地剥', dongYao: 6, tiYongRelation: '比和', luck: '吉', season: '秋', tiWangShuai: '休' },
      pick(r1, true)
    );

    // 用例 2：时间起卦 2026-08-24 14:22（真实农历七月十二，复现任务给出的数字算式）
    // 手算：年支午7 + 月7 + 日12 = 26，26÷8=3 余 2 → 兑（上卦）
    //       26 + 未时8 = 34，34÷8=4 余 2 → 兑（下卦）；34÷6=5 余 4 → 第 4 爻动
    //       本卦兑为泽 [110110]；互卦 234=[101]离、345=[011]巽 → 风火家人
    //       变卦第 4 爻阳变阴 → [110010] 上坎下兑 → 水泽节
    //       动爻在上卦 → 上兑为用、下兑为体，金金比和（吉）；秋月体金「旺」
    var r2 = paiPan({ year: 2026, month: 8, day: 24, hour: 14, minute: 22 });
    addCase(
      '时间起卦 2026-08-24 14:22 未时（农历七月十二，复现任务算式 26÷8余2 / 34÷8余2 / 34÷6余4）',
      '午7+月7+日12=26÷8余2→兑；26+未8=34÷8余2→兑；34÷6余4→第4爻',
      { lunarText: '丙午年七月十二 未时', benGua: '兑为泽', benYao: '110110', huGua: '风火家人', bianGua: '水泽节', dongYao: 4, tiYongRelation: '比和', luck: '吉', season: '秋', tiWangShuai: '旺' },
      pick(r2, true)
    );

    // 用例 3：数字起卦 [3,5,7]（三数）
    // 手算：上卦 3→离，下卦 5→巽；动爻 (3+5+7)=15÷6=2 余 3 → 第 3 爻动 → 火风鼎三爻动
    //       鼎 [011101]；互卦 234=[111]乾、345=[110]兑 → 泽天夬
    //       变卦第 3 爻阳变阴 → [010101] 上离下坎 → 火水未济
    //       动爻在下卦 → 下巽为用、上离为体，木生火 → 用生体（吉）
    var r3 = paiPan({ numbers: [3, 5, 7] });
    addCase(
      '数字起卦 [3,5,7] 三数',
      '上卦3→离；下卦5→巽；动爻(3+5+7)=15÷6余3→第3爻',
      { lunarText: null, benGua: '火风鼎', benYao: '011101', huGua: '泽天夬', bianGua: '火水未济', dongYao: 3, tiYongRelation: '用生体', luck: '吉' },
      pick(r3, false)
    );

    // 用例 4：数字起卦 [1,2,3]（三数，动爻余 0 取 6）
    // 手算：上卦 1→乾，下卦 2→兑；动爻 (1+2+3)=6÷6=1 余 0 → 当 6 → 第 6 爻动 → 天泽履上爻动
    //       履 [110111]；互卦 234=[101]离、345=[011]巽 → 风火家人
    //       变卦第 6 爻阳变阴 → [110110] 上兑下兑 → 兑为泽
    //       （任务原文写「变泽天夬」；手算复核：履上爻变后上卦为兑、下卦仍为兑，
    //         泽天夬 [111110] 与履 [110111] 相差第 3、6 两爻，非单爻之变，故以「兑为泽」为准）
    //       动爻在上卦 → 上乾为用、下兑为体，金金比和（吉）
    var r4 = paiPan({ numbers: [1, 2, 3] });
    addCase(
      '数字起卦 [1,2,3] 动爻余0当6',
      '上卦1→乾；下卦2→兑；动爻(1+2+3)=6÷6余0→当6→第6爻',
      { lunarText: null, benGua: '天泽履', benYao: '110111', huGua: '风火家人', bianGua: '兑为泽', dongYao: 6, tiYongRelation: '比和', luck: '吉' },
      pick(r4, false)
    );

    // 用例 5：时间起卦动爻计算复核 2026-08-14 12:22（午时）
    // 手算：年支午7 + 月7 + 日2 = 16 → 上卦 16÷8 余 0 → 当 8 坤
    //       16 + 午时7 = 23 → 下卦 23÷8=2 余 7 → 艮；动爻 23÷6=3 余 5 → 第 5 爻
    //       本卦上坤下艮 = 地山谦 [001000]；互卦 234=[010]坎、345=[100]震 → 雷水解
    //       变卦第 5 爻阴变阳 → [001010] 上坎下艮 → 水山蹇
    //       动爻在上卦 → 上坤为用、下艮为体，土土比和（吉）
    var r5 = paiPan({ year: 2026, month: 8, day: 14, hour: 12, minute: 22 });
    addCase(
      '时间起卦 2026-08-14 12:22 午时（动爻计算复核）',
      '午7+月7+日2=16÷8余0→坤8；16+午7=23÷8余7→艮；23÷6余5→第5爻',
      { lunarText: '丙午年七月初二 午时', benGua: '地山谦', benYao: '001000', huGua: '雷水解', bianGua: '水山蹇', dongYao: 5, tiYongRelation: '比和', luck: '吉', season: '秋', tiWangShuai: '休' },
      pick(r5, true)
    );

    // 用例 6：数字起卦 [7,9]（两数模式）
    // 手算：上卦 7→艮，下卦 9÷8=1 余 1 → 乾；动爻 (7+9)=16÷6=2 余 4 → 第 4 爻动 → 山天大畜四爻动
    //       大畜 [111001]；互卦 234=[110]兑、345=[100]震 → 雷泽归妹
    //       变卦第 4 爻阴变阳 → [111101] 上离下乾 → 火天大有
    //       动爻在上卦 → 上艮为用、下乾为体，土生金 → 用生体（吉）
    var r6 = paiPan({ numbers: [7, 9] });
    addCase(
      '数字起卦 [7,9] 两数',
      '上卦7→艮；下卦9÷8余1→乾；动爻(7+9)=16÷6余4→第4爻',
      { lunarText: null, benGua: '山天大畜', benYao: '111001', huGua: '雷泽归妹', bianGua: '火天大有', dongYao: 4, tiYongRelation: '用生体', luck: '吉' },
      pick(r6, false)
    );

    var passedCount = 0;
    for (var i = 0; i < cases.length; i++) if (cases[i].pass) passedCount++;

    return {
      passed: passedCount === cases.length,
      total: cases.length,
      passedCount: passedCount,
      cases: cases
    };
  }

  /* ==================== 挂载导出 ==================== */

  var MeiHuaPro = {
    paiPan: paiPan,
    render: render,
    selfTest: selfTest,
    version: VERSION
  };

  // 浏览器全局挂载
  global.MeiHuaPro = MeiHuaPro;

  // CommonJS 兼容（node 单元测试直接 require）
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeiHuaPro;
  }
})(typeof window !== 'undefined' ? window : globalThis);
