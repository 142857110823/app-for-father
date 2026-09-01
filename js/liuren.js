/**
 * liuren.js —— 十三宫奇门遁甲 APP · 大六壬课式模块（自包含，无任何外部依赖）
 *
 * 挂载方式：UMD 风格，浏览器挂 window.LiuRenPro，Node 中挂 global.window.LiuRenPro（并 module.exports）
 * 对外 API：
 *   window.LiuRenPro.paiPan({ year, month, day, hour, minute })
 *   window.LiuRenPro.render(el, result)
 *   window.LiuRenPro.selfTest()
 *
 * 课式引擎：四柱（节气月柱，寿星近似 + Meeus 太阳黄经迭代，独立实现）→ 月将（太阳过宫，
 *           按中气换将）→ 天地盘（月将加占时）→ 四课（日干寄宫）→ 三传（九宗门）→
 *           十二天将（贵人起、顺逆布）→ 空亡 / 遁干 / 六亲。
 *
 * 九宗门判定顺序（依《六壬大全·课经》《六壬指南》考证）：
 *   ① 伏吟（天盘=地盘）：有克取克（六乙/六癸日干上神发用），无克阳日取干上神、
 *      阴日取支上神，中末以刑传（自刑为杜传格：初传自刑则中传投干/支上神，
 *      中传再自刑或刑回初传则末传取冲）。
 *      ※ 伏吟课体优先于遥克/昴星/别责/八专——《六壬大全》伏吟课首例即干支同位之
 *        癸丑日午将午时，证明伏吟先于八专判定。
 *   ② 返吟（天盘与地盘对冲）：有克照贼克/比用/涉害取初传，中传取初传之冲、末传
 *      取中传之冲（无依格）；无克取日支驿马为初传、中传支上神、末传干上神（无亲格，
 *      仅丁己辛之丑未六日）。
 *   ③ 贼克法：下贼上为贼（重审），无贼取上克下为克（元首）。
 *   ④ 比用法：多克贼取与日干阴阳相比者（知一）。
 *   ⑤ 涉害法：俱比/俱不比时，自上神所临地盘位顺行至本家，贼课数克我者、克课数我
 *      克者为深浅；同深取临四孟者、再同取临四仲者、再同取课序先见（缀瑕从简）。
 *   ⑥ 遥克法：二三四课上神遥克日干为蒿矢（先），日干遥克二三四课上神为弹射（后），
 *      多者取与日干相比者，再取先见。
 *      ※ 八专日（干支同位：甲寅/丁未/己未/庚申/癸丑）上下无克时不复取遥，
 *        直入八专法——《注解大六壬指南·心印赋》"无克不复取遥矣"。
 *   ⑦ 昴星法：四课全备无克无遥，阳日取地盘酉位上天盘支为初传（仰视）、中传支上神、
 *      末传干上神；阴日取天盘酉所临地盘支为初传（俯视）、中传干上神、末传支上神。
 *   ⑧ 别责法：四课不全三课备，阳日取干合之干寄宫上神为初传，阴日取日支三合前一位
 *      支为初传；中末皆用干上神。
 *   ⑨ 八专法：干支同位两课无克，阳日以干上神天盘顺数三位（连本位）为初传，阴日以
 *      第四课上神天盘逆数三位为初传；中末皆用干上神。
 *
 * 时间约定：东八区民用时；日柱 (JDN+49) mod 60；23:00 起晚子时日柱进位次日。
 * 昼夜贵人：占时为卯辰巳午未申用昼贵，酉戌亥子丑寅用夜贵。
 */
(function (global) {
  'use strict';

  /* ================================================================
   * 一、基础数据表
   * ================================================================ */

  // 十天干（索引 0-9，甲=0）
  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  // 十二地支（索引 0-11，子=0）
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  // 天干五行：木火土金水（索引 0-4）
  var GAN_WX = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  // 地支五行：子水、丑土、寅木、卯木、辰土、巳火、午火、未土、申金、酉金、戌土、亥水
  var ZHI_WX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  // 天干阴阳：0 阳 1 阴
  var GAN_YINYANG = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  // 地支阴阳：子阳丑阴……
  var ZHI_YINYANG = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  // 五行名称
  var WX_NAME = ['木', '火', '土', '金', '水'];
  // 五行相生：木生火生土生金生水生木
  var WX_SHENG = [1, 2, 3, 4, 0];
  // 五行相克：木克土、火克金、土克水、金克木、水克火（索引=五行，值=所克五行索引）
  var WX_KE = [2, 3, 4, 0, 1];

  // 十干寄宫（地盘支索引）：甲寄寅、乙寄辰、丙寄巳、丁寄未、戊寄巳、
  // 己寄未、庚寄申、辛寄戌、壬寄亥、癸寄丑
  var GAN_GONG = [2, 4, 5, 7, 5, 7, 8, 10, 11, 1];

  // 月将名（按支索引 0-11）：子神后、丑大吉、寅功曹、卯太冲、辰天罡、巳太乙、
  // 午胜光、未小吉、申传送、酉从魁、戌河魁、亥登明
  var YUEJIANG_NAME = ['神后', '大吉', '功曹', '太冲', '天罡', '太乙', '胜光', '小吉', '传送', '从魁', '河魁', '登明'];

  // 十二天将固定序（贵人前一位螣蛇，依次至天后），顺逆随贵人
  var TIANJIANG = ['贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];

  // 昼贵 / 夜贵（按日干索引）
  // 甲戊庚牛羊（昼丑夜未）、乙己鼠猴（昼子夜申）、丙丁猪鸡（昼亥夜酉）、
  // 壬癸蛇兔（昼巳夜卯）、六辛马虎（昼午夜寅）
  var GUI_ZHOU = [1, 0, 11, 11, 1, 0, 1, 6, 5, 5];
  var GUI_YE = [7, 8, 9, 9, 7, 8, 7, 2, 3, 3];

  // 三刑：寅刑巳、巳刑申、申刑寅；丑刑戌、戌刑未、未刑丑；子刑卯、卯刑子；辰午酉亥自刑
  var XING = [3, 10, 5, 0, 4, 8, 6, 1, 2, 9, 7, 11];
  // 六冲
  function chong(z) { return (z + 6) % 12; }
  // 驿马（按日支）：申子辰马在寅、寅午戌马在申、巳酉丑马在亥、亥卯未马在巳
  var YIMA = [2, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5];
  // 天干五合：甲己、乙庚、丙辛、丁壬、戊癸
  var GAN_HE = [5, 6, 7, 8, 9, 0, 1, 2, 3, 4];

  // 四孟（寅申巳亥）/ 四仲（子午卯酉）地盘位集合，涉害深浅同深时取用
  var SI_MENG = { 2: 1, 8: 1, 5: 1, 11: 1 };
  var SI_ZHONG = { 0: 1, 6: 1, 3: 1, 9: 1 };

  // 六甲旬空亡（旬首组合序 0/10/20/30/40/50 → 甲子/甲戌/甲申/甲午/甲辰/甲寅）
  var XUN_KONGWANG = ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑'];

  // 24 节气名称（按公历年 1-12 月顺序：小寒…冬至）
  var TERM_NAMES = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满',
    '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
    '立冬', '小雪', '大雪', '冬至'];
  // 24 节气太阳黄经（春分 0°，小寒 285°）
  var TERM_LONG = [285, 300, 315, 330, 345, 0, 15, 30, 45, 60,
    75, 90, 105, 120, 135, 150, 165, 180, 195, 210,
    225, 240, 255, 270];
  // 定月柱的十二「节」索引（小寒、立春、惊蛰……大雪 = 偶数索引）
  var JIE_INDEX = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  // 换月将的十二「中气」索引（大寒、雨水、春分……冬至 = 奇数索引）
  // 中气 tIdx → 月将支索引 = ((25 - tIdx) / 2) % 12：
  //   大寒(1)→子0、雨水(3)→亥11、春分(5)→戌10、谷雨(7)→酉9、小满(9)→申8、
  //   夏至(11)→未7、大暑(13)→午6、处暑(15)→巳5、秋分(17)→辰4、霜降(19)→卯3、
  //   小雪(21)→寅2、冬至(23)→丑1
  var ZHONGQI_INDEX = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];

  // 主色板（宣纸白 / 墨色 / 暗金，楷体优先）
  var THEME = {
    bg: '#f5f2e9', ink: '#2b2b2b', gold: '#8b6914',
    fontFamily: "KaiTi, 'Kaiti SC', STKaiti, serif"
  };

  /* ================================================================
   * 二、历法工具（儒略日互转 + 节气计算，东八区民用时）
   * ================================================================ */

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  // 公历 -> 儒略日（含时刻，北京钟面轴）
  function gregorianToJD(y, m, d, hour, minute) {
    var h = (hour || 0) + (minute || 0) / 60;
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    var jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) -
      Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    return jdn + h / 24 - 0.5;
  }

  // 儒略日 -> 显示字符串
  function jdToGregorian(jd) {
    var z = Math.floor(jd + 0.5);
    var f = jd + 0.5 - z;
    var a = z;
    if (z >= 2299161) {
      var alpha = Math.floor((z - 1867216.25) / 36524.25);
      a = z + 1 + alpha - Math.floor(alpha / 4);
    }
    var b = a + 1524;
    var c = Math.floor((b - 122.1) / 365.25);
    var d0 = Math.floor(365.25 * c);
    var e = Math.floor((b - d0) / 30.6001);
    var day = b - d0 - Math.floor(30.6001 * e);
    var month = e < 14 ? e - 1 : e - 13;
    var year = month > 2 ? c - 4716 : c - 4715;
    var totalMin = Math.round(f * 1440);
    var hour = Math.floor(totalMin / 60) % 24;
    var minute = totalMin % 60;
    return { year: year, month: month, day: day, hour: hour, minute: minute };
  }

  function jdStr(jd) {
    var g = jdToGregorian(jd);
    return g.year + '-' + pad2(g.month) + '-' + pad2(g.day) + ' ' + pad2(g.hour) + ':' + pad2(g.minute);
  }

  // Meeus 低精度太阳视黄经（度）
  function sunLongitude(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var Mr = M * Math.PI / 180;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
      + 0.000289 * Math.sin(3 * Mr);
    var lambda = (L0 + C) % 360;
    if (lambda < 0) lambda += 360;
    return lambda;
  }

  // 角度差归一化到 (-180, 180]
  function angleDiff(target, current) {
    var d = (target - current) % 360;
    if (d > 180) d -= 360;
    if (d <= -180) d += 360;
    return d;
  }

  // 节气典型日期表（初值用，索引同 TERM_NAMES）
  var TERM_MD = [[1, 5], [1, 20], [2, 4], [2, 19], [3, 5], [3, 20], [4, 5], [4, 20],
    [5, 5], [5, 21], [6, 6], [6, 21], [7, 7], [7, 23], [8, 7], [8, 23],
    [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 21]];

  // 节气序数 n（1900 年小寒 = 0）-> 典型日期正午儒略日初值
  function solarTermApprox(n) {
    var idx = ((n % 24) + 24) % 24;
    var yy = 1900 + Math.floor(n / 24);
    return gregorianToJD(yy, TERM_MD[idx][0], TERM_MD[idx][1], 12, 0);
  }

  // 节气序数 n -> 精确儒略日（牛顿迭代；北京轴，代入黄经公式前 -8/24 换真轴）
  var termCache = {};
  function solarTermJD(n) {
    var key = 'n' + n;
    if (termCache[key] !== undefined) return termCache[key];
    var target = TERM_LONG[((n % 24) + 24) % 24];
    var jd = solarTermApprox(n);
    for (var i = 0; i < 12; i++) {
      var dl = angleDiff(target, sunLongitude(jd - 8 / 24));
      if (Math.abs(dl) < 0.0005) break;
      jd += dl / 0.98565;
    }
    termCache[key] = jd;
    return jd;
  }

  // 指定公历年 y 的第 idx 个节气儒略日
  function yearTermJD(y, idx) {
    return solarTermJD((y - 1900) * 24 + idx);
  }

  // 干支组合序（0=甲子 … 59=癸亥）
  function gzSeq(g, z) {
    for (var i = 0; i < 60; i++) {
      if (i % 10 === g && i % 12 === z) return i;
    }
    return 0;
  }

  /* ================================================================
   * 三、四柱（年柱立春界 / 月柱节气界 / 日柱锚点 / 时柱五鼠遁）
   * ================================================================ */

  // 定位占时所在「节」区间（月柱）与年柱归属年
  function locateMonth(y, m, d, hour, minute) {
    var birthJD = gregorianToJD(y, m, d, hour, minute);
    var best = null;
    for (var yy = y - 2; yy <= y + 1; yy++) {
      for (var k = 0; k < 12; k++) {
        var tIdx = JIE_INDEX[k];
        var jd = yearTermJD(yy, tIdx);
        if (jd <= birthJD + 1e-9) {
          if (!best || jd > best.jieJD) best = { jieJD: jd, jieName: TERM_NAMES[tIdx], tIdx: tIdx };
        }
      }
    }
    if (!best) return null;
    // 月 num：小寒-丑(11)、立春-寅(0)、惊蛰-卯(1)……大雪-子(10)
    var monthNum;
    if (best.tIdx === 0) monthNum = 11;
    else if (best.tIdx === 22) monthNum = 10;
    else monthNum = (best.tIdx - 2) / 2;
    var lichunJD = yearTermJD(y, 2);
    var yearGanYear = (birthJD >= lichunJD) ? y : y - 1;
    return {
      jieJD: best.jieJD, jieName: best.jieName, tIdx: best.tIdx,
      monthNum: monthNum, yearGanYear: yearGanYear, birthJD: birthJD
    };
  }

  // 定位占时之前最近的中气（换将依据）
  function locateZhongQi(y, m, d, hour, minute) {
    var birthJD = gregorianToJD(y, m, d, hour, minute);
    var best = null;
    for (var yy = y - 2; yy <= y + 1; yy++) {
      for (var k = 0; k < 12; k++) {
        var tIdx = ZHONGQI_INDEX[k];
        var jd = yearTermJD(yy, tIdx);
        if (jd <= birthJD + 1e-9) {
          if (!best || jd > best.jieJD) best = { jieJD: jd, qiName: TERM_NAMES[tIdx], tIdx: tIdx };
        }
      }
    }
    return best;
  }

  // 排四柱，返回 { pillars:[{gan,zhi}], ganArr, zhiArr, loc }
  function calcSiZhu(y, m, d, hour, minute) {
    var loc = locateMonth(y, m, d, hour, minute);
    var yearIdx = ((loc.yearGanYear - 1984) % 60 + 60) % 60;   // 1984 = 甲子
    var yGan = yearIdx % 10, yZhi = yearIdx % 12;
    var mZhi = (loc.monthNum + 2) % 12;                          // 月 num 0=寅 -> 支序 2
    var mGan = (yGan * 2 + loc.monthNum + 2) % 10;               // 五虎遁
    var jdn = Math.floor(loc.birthJD + 0.5);
    var dayJDN = (hour === 23) ? jdn + 1 : jdn;                  // 晚子时进位次日
    var daySeq = ((dayJDN + 49) % 60 + 60) % 60;                 // 1949-10-01=甲子 校验
    var dGan = daySeq % 10, dZhi = daySeq % 12;
    var hZhi = Math.floor(((hour + 1) % 24) / 2);                // 23:00-00:59 -> 子
    var hGan = (dGan * 2 + hZhi) % 10;                           // 五鼠遁
    return {
      loc: loc,
      ganArr: [yGan, mGan, dGan, hGan],
      zhiArr: [yZhi, mZhi, dZhi, hZhi],
      pillars: [
        { gan: yGan, zhi: yZhi }, { gan: mGan, zhi: mZhi },
        { gan: dGan, zhi: dZhi }, { gan: hGan, zhi: hZhi }
      ],
      daySeq: daySeq
    };
  }

  /* ================================================================
   * 四、六壬课式引擎 paiPan
   * ================================================================ */

  /**
   * 课上下克判定：上神 vs 下（一课下为日干，用干五行）
   * 返回 'zei'（下贼上）/ 'ke'（上克下）/ null（无克）
   */
  function keType(shangZhi, xiaWx) {
    if (WX_KE[xiaWx] === ZHI_WX[shangZhi]) return 'zei';
    if (WX_KE[ZHI_WX[shangZhi]] === xiaWx) return 'ke';
    return null;
  }

  /**
   * 涉害深浅：上神自所临地盘位 pos 顺行至本家 shang（含起止），
   * 贼课（下贼上）数「克我者」（地盘支克上神），克课（上克下）数「我克者」（上神克地盘支）
   */
  function sheHaiDepth(shang, pos, type) {
    var cnt = 0, q = pos;
    while (true) {
      if (type === 'zei') {
        if (WX_KE[ZHI_WX[q]] === ZHI_WX[shang]) cnt++;
      } else {
        if (WX_KE[ZHI_WX[shang]] === ZHI_WX[q]) cnt++;
      }
      if (q === shang) break;
      q = (q + 1) % 12;
    }
    return cnt;
  }

  // 六亲：传支五行对日干五行
  function liuQin(zhiIdx, riGan) {
    var wz = ZHI_WX[zhiIdx], wg = GAN_WX[riGan];
    if (wz === wg) return '兄弟';
    if (WX_SHENG[wz] === wg) return '父母';
    if (WX_SHENG[wg] === wz) return '子孙';
    if (WX_KE[wz] === wg) return '官鬼';
    return '妻财';
  }

  // 旬遁干：日柱旬内各支所遁天干，空亡支返回 null
  function xunDunGan(daySeq, zhiIdx) {
    var seq0 = daySeq - (daySeq % 10);        // 旬首组合序（甲子/甲戌/…）
    var shouZhi = seq0 % 12;                  // 旬首支
    var off = (zhiIdx - shouZhi + 12) % 12;   // 距旬首支的步数
    return off < 10 ? GAN[off] : null;        // 旬首干恒为甲
  }

  /**
   * 三传九宗门核心
   * 参数：tianPan（天盘数组，索引=地盘位，值=天盘支索引）、riGan、riZhi、占时支
   * 返回：{ chu, zhong, mo, keTi, keTiDetail, trace }
   */
  function calcSanChuan(tianPan, riGan, riZhi) {
    var gong = GAN_GONG[riGan];
    var A = tianPan[gong];            // 一课上神（干上神）
    var B = tianPan[A];               // 二课上神
    var C = tianPan[riZhi];           // 三课上神（支上神）
    var D = tianPan[C];               // 四课上神
    var ganYy = GAN_YINYANG[riGan];
    var trace = [];
    var isFuYin = true, isFanYin = false;
    for (var p = 0; p < 12; p++) {
      if (tianPan[p] !== p) { isFuYin = false; break; }
    }
    if (!isFuYin) isFanYin = (tianPan[0] === 6);   // 天盘[子位]=午 即整体对冲

    // ---------- ① 伏吟 ----------
    if (isFuYin) {
      var chu, fromGan;
      var t0 = keType(A, GAN_WX[riGan]);
      if (t0) {
        // 伏吟有克（仅一课可能，六乙下贼上 / 六癸上克下）：干上神发用
        chu = A; fromGan = true;
        trace.push('伏吟有克，' + (t0 === 'zei' ? '下贼上' : '上克下') + '取干上神 ' + ZHI[A] + ' 发用');
        return finishFuYin(chu, fromGan, '伏吟·不虞', A, C, trace);
      }
      // 伏吟无克：阳日（刚日）取干上神，阴日（柔日）取支上神
      if (ganYy === 0) { chu = A; fromGan = true; trace.push('伏吟无克，刚日取干上神 ' + ZHI[A] + ' 发用（自任格）'); }
      else { chu = C; fromGan = false; trace.push('伏吟无克，柔日取支上神 ' + ZHI[C] + ' 发用（自信格）'); }
      return finishFuYin(chu, fromGan, ganYy === 0 ? '伏吟·自任' : '伏吟·自信', A, C, trace);
    }

    // ---------- ② 返吟 ----------
    if (isFanYin) {
      var cand = zeiKeFlow(A, B, C, D, riGan, gong, riZhi, tianPan, trace, true);
      if (cand) {
        // 返吟有克（无依格）：初传照贼克/比用/涉害，中传取初传之冲，末传取中传之冲
        var chu2 = cand.chu;
        var zhong2 = chong(chu2), mo2 = chong(zhong2);
        trace.push('返吟有克（无依格）：初传 ' + ZHI[chu2] + '，中传取冲 ' + ZHI[zhong2] + '，末传取冲 ' + ZHI[mo2]);
        return { chu: chu2, zhong: zhong2, mo: mo2, keTi: '返吟·无依', keTiDetail: cand.detail, trace: trace };
      }
      // 返吟无克（无亲格，仅丁己辛之丑未六日）：初传取日支驿马，中传支上神，末传干上神
      var ma = YIMA[riZhi];
      trace.push('返吟无克（无亲格）：取日支 ' + ZHI[riZhi] + ' 驿马 ' + ZHI[ma] + ' 发用，中传支上神 ' + ZHI[C] + '，末传干上神 ' + ZHI[A]);
      return { chu: ma, zhong: C, mo: A, keTi: '返吟·无亲', keTiDetail: '取支驿马为用', trace: trace };
    }

    // ---------- ③④⑤ 贼克 / 比用 / 涉害 ----------
    var cand3 = zeiKeFlow(A, B, C, D, riGan, gong, riZhi, tianPan, trace, false);
    if (cand3) {
      // 正常传行：中传 = 初传本位之上神，末传 = 中传本位之上神
      var zhong3 = tianPan[cand3.chu], mo3 = tianPan[zhong3];
      trace.push('传行：初传 ' + ZHI[cand3.chu] + ' → 中传 ' + ZHI[zhong3] + ' → 末传 ' + ZHI[mo3]);
      return { chu: cand3.chu, zhong: zhong3, mo: mo3, keTi: cand3.keTi, keTiDetail: cand3.detail, trace: trace };
    }

    // ---------- ⑥ 遥克（八专日无上下克时不复取遥，直入八专法）----------
    // 《注解大六壬指南·心印赋》：八专之日"无克不复取遥矣"；《六壬粹言》同其口径。
    // 干支同位（日干寄宫=日支）之日在六十甲子中为甲寅、丁未、己未、庚申、癸丑。
    if (gong !== riZhi) {
      var yao = [];
      for (var i = 1; i <= 3; i++) {
        var sh = [A, B, C, D][i];
        if (WX_KE[ZHI_WX[sh]] === GAN_WX[riGan]) yao.push({ shang: sh, keIdx: i });
      }
      dedupe(yao);
      if (yao.length) {
        var pick = biYongOrFirst(yao, ganYy, trace, '遥克·蒿矢');
        return { chu: pick, zhong: tianPan[pick], mo: tianPan[tianPan[pick]], keTi: '遥克·蒿矢', keTiDetail: '二三课上神遥克日干', trace: trace };
      }
      var tan = [];
      for (i = 1; i <= 3; i++) {
        sh = [A, B, C, D][i];
        if (WX_KE[GAN_WX[riGan]] === ZHI_WX[sh]) tan.push({ shang: sh, keIdx: i });
      }
      dedupe(tan);
      if (tan.length) {
        var pick2 = biYongOrFirst(tan, ganYy, trace, '遥克·弹射');
        return { chu: pick2, zhong: tianPan[pick2], mo: tianPan[tianPan[pick2]], keTi: '遥克·弹射', keTiDetail: '日干遥克二三课上神', trace: trace };
      }
    } else {
      trace.push('干支同位（八专日）上下无克，不复取遥，直入八专法');
    }

    // ---------- 四课等价判定（日干以寄宫支等价）----------
    var keList = [
      { shang: A, xiaGong: gong },
      { shang: B, xiaGong: A },
      { shang: C, xiaGong: riZhi },
      { shang: D, xiaGong: C }
    ];
    var uniq = [];
    keList.forEach(function (k) {
      if (!uniq.some(function (u) { return u.shang === k.shang && u.xiaGong === k.xiaGong; })) uniq.push(k);
    });

    // ---------- ⑦ 昴星（四课全备）----------
    if (uniq.length === 4) {
      if (ganYy === 0) {
        // 阳日仰视：取地盘酉位上天盘支为初传，中传支上神，末传干上神
        var chuY = tianPan[9];
        trace.push('昴星（虎视）：阳日仰取酉上神 ' + ZHI[chuY] + ' 发用，中传支上神 ' + ZHI[C] + '，末传干上神 ' + ZHI[A]);
        return { chu: chuY, zhong: C, mo: A, keTi: '昴星·虎视', keTiDetail: '阳日酉上神发用', trace: trace };
      }
      // 阴日俯视：取天盘酉所临地盘支为初传，中传干上神，末传支上神
      var posYou = tianPan.indexOf(9);
      trace.push('昴星（冬蛇掩目）：阴日俯取天盘酉下神 ' + ZHI[posYou] + ' 发用，中传干上神 ' + ZHI[A] + '，末传支上神 ' + ZHI[C]);
      return { chu: posYou, zhong: A, mo: C, keTi: '昴星·冬蛇掩目', keTiDetail: '阴日酉下神发用', trace: trace };
    }

    // ---------- ⑧ 别责（四课不全，三课备）----------
    if (uniq.length === 3) {
      var chuB;
      if (ganYy === 0) {
        var heGong = GAN_GONG[GAN_HE[riGan]];
        chuB = tianPan[heGong];
        trace.push('别责：阳日取干合 ' + GAN[GAN_HE[riGan]] + ' 寄宫 ' + ZHI[heGong] + ' 上神 ' + ZHI[chuB] + ' 发用');
      } else {
        chuB = (riZhi + 4) % 12;   // 支三合前一位（三合即 +4）
        trace.push('别责：阴日取支 ' + ZHI[riZhi] + ' 三合前一位 ' + ZHI[chuB] + ' 发用');
      }
      trace.push('别责：中末皆用干上神 ' + ZHI[A]);
      return { chu: chuB, zhong: A, mo: A, keTi: '别责', keTiDetail: '三课备无克无遥', trace: trace };
    }

    // ---------- ⑨ 八专（干支同位，两课）----------
    var chuZ;
    if (ganYy === 0) {
      chuZ = (A + 2) % 12;   // 干上神天盘顺数三位（连本位）
      trace.push('八专：阳日干上神 ' + ZHI[A] + ' 顺数三位取 ' + ZHI[chuZ] + ' 发用');
    } else {
      chuZ = (D + 10) % 12;  // 第四课上神逆数三位（连本位）
      trace.push('八专：阴日第四课上神 ' + ZHI[D] + ' 逆数三位取 ' + ZHI[chuZ] + ' 发用');
    }
    trace.push('八专：中末皆用干上神 ' + ZHI[A]);
    return { chu: chuZ, zhong: A, mo: A, keTi: '八专', keTiDetail: '干支同位两课', trace: trace };
  }

  // 伏吟刑传（含自刑杜传格）；trace 传入续写，保留前序推演记录
  function finishFuYin(chu, fromGan, keTi, A, C, trace) {
    var zhong, mo;
    if (XING[chu] === chu) {
      // 初传自刑（杜传格）：用日（干）则中传投支上神，用辰（支）则中传投干上神
      zhong = fromGan ? C : A;
    } else {
      zhong = XING[chu];
    }
    if (XING[zhong] === zhong || XING[zhong] === chu) {
      // 中传再自刑，或中传之刑回到初传（如子卯循环）：末传取中传之冲
      mo = chong(zhong);
    } else {
      mo = XING[zhong];
    }
    trace.push('伏吟刑传：初传 ' + ZHI[chu] + ' → 中传 ' + ZHI[zhong] + ' → 末传 ' + ZHI[mo]);
    return { chu: chu, zhong: zhong, mo: mo, keTi: keTi, keTiDetail: '刑为中末', trace: trace };
  }

  // 贼克候选去重（按上神支，保留课序先见）
  function dedupe(list) {
    var seen = {};
    var out = [];
    list.forEach(function (c) {
      if (!seen[c.shang]) { seen[c.shang] = 1; out.push(c); }
    });
    list.length = 0;
    out.forEach(function (c) { list.push(c); });
    return list;
  }

  // 遥克候选比用（与日干阴阳同者优先），再取课序先见
  function biYongOrFirst(list, ganYy, trace, label) {
    var bi = list.filter(function (c) { return ZHI_YINYANG[c.shang] === ganYy; });
    var pool = (bi.length > 0 && bi.length < list.length) ? bi : list;
    trace.push(label + '：' + (pool.length > 1 ? '多候选取与日干相比且先见者 ' : '取 ') + ZHI[pool[0].shang] + ' 发用');
    return pool[0].shang;
  }

  /**
   * 贼克流程（贼优先 → 比用 → 涉害），返吟/普通共用
   * 有克返回 { chu, keTi, detail }，无克返回 null
   */
  function zeiKeFlow(A, B, C, D, riGan, gong, riZhi, tianPan, trace, isFanYinMode) {
    var shangArr = [A, B, C, D];
    var xiaGongArr = [gong, A, riZhi, C];
    var all = [];
    for (var i = 0; i < 4; i++) {
      var xiaWx = (i === 0) ? GAN_WX[riGan] : ZHI_WX[xiaGongArr[i]];
      var t = keType(shangArr[i], xiaWx);
      if (t) all.push({ keIdx: i, shang: shangArr[i], type: t, pos: xiaGongArr[i] });
    }
    if (!all.length) return null;

    // 贼优先：有下贼上则弃上克下
    var zei = all.filter(function (c) { return c.type === 'zei'; });
    var cand = zei.length ? zei : all.filter(function (c) { return c.type === 'ke'; });
    var useZei = zei.length > 0;
    dedupe(cand);
    var ganYy = GAN_YINYANG[riGan];

    if (cand.length === 1) {
      var c1 = cand[0];
      var t1 = useZei ? '贼克·重审' : '贼克·元首';
      trace.push((useZei ? '一下贼上（重审）：取第' : '一上克下（元首）：取第') + (c1.keIdx + 1) + '课上神 ' +
        ZHI[c1.shang] + ' 发用');
      return { chu: c1.shang, keTi: t1, detail: useZei ? '下贼上取上神' : '上克下取上神' };
    }

    // 比用法：多克贼取与日干阴阳相比者
    var bi = cand.filter(function (c) { return ZHI_YINYANG[c.shang] === ganYy; });
    if (bi.length >= 1 && bi.length < cand.length) {
      cand = bi;
      trace.push('比用法：多克贼取与日干相比者');
      if (cand.length === 1) {
        trace.push('比用定初传 ' + ZHI[cand[0].shang]);
        return { chu: cand[0].shang, keTi: '比用·知一', detail: '阳日用阳阴用阴' };
      }
    } else {
      trace.push('俱比/俱不比，入涉害法');
    }

    // 涉害法：自上神所临地盘位顺行归本家计受克数
    cand.forEach(function (c) {
      c.harm = sheHaiDepth(c.shang, c.pos, c.type);
      c.meng = SI_MENG[c.pos] ? 2 : (SI_ZHONG[c.pos] ? 1 : 0);
    });
    cand.sort(function (x, y) {
      if (y.harm !== x.harm) return y.harm - x.harm;         // 深者先
      if (y.meng !== x.meng) return y.meng - x.meng;         // 孟深仲浅季休
      return x.keIdx - y.keIdx;                               // 课序先见
    });
    var w = cand[0];
    var ti = w.meng === 2 ? '涉害·见机' : (w.meng === 1 ? '涉害·察微' : '涉害');
    trace.push('涉害法：' + cand.map(function (c) { return ZHI[c.shang] + '(害' + c.harm + ')'; }).join('、') +
      '，取深者 ' + ZHI[w.shang] + ' 发用');
    return { chu: w.shang, keTi: ti, detail: '涉害深者发用' };
  }

  /**
   * paiPan 主入口
   * @param {object} input { year, month, day, hour, minute }
   */
  function paiPan(input) {
    var y = input.year, m = input.month, d = input.day;
    var hour = input.hour || 0, minute = input.minute || 0;

    /* ---------- 四柱 ---------- */
    var sz = calcSiZhu(y, m, d, hour, minute);
    var riGan = sz.ganArr[2], riZhi = sz.zhiArr[2];
    var shiZhi = sz.zhiArr[3];
    var pillarStrs = sz.pillars.map(function (p) { return GAN[p.gan] + ZHI[p.zhi]; });

    /* ---------- 月将（太阳过宫，中气换将）---------- */
    var zq = locateZhongQi(y, m, d, hour, minute);
    var jiangZhi = ((25 - zq.tIdx) / 2) % 12;

    /* ---------- 天地盘：月将加占时 ---------- */
    var tianPan = [];
    for (var p = 0; p < 12; p++) {
      tianPan[p] = (jiangZhi + p - shiZhi + 24) % 12;
    }

    /* ---------- 三传九宗门 ---------- */
    var sc = calcSanChuan(tianPan, riGan, riZhi);

    /* ---------- 四课结构 ---------- */
    var gong = GAN_GONG[riGan];
    var A = tianPan[gong], B = tianPan[A], C = tianPan[riZhi], D = tianPan[C];
    var keShang = [A, B, C, D];
    var keXiaLabel = [GAN[riGan], ZHI[A], ZHI[riZhi], ZHI[C]];
    var keXiaGong = [gong, A, riZhi, C];

    /* ---------- 十二天将 ---------- */
    // 昼夜：卯辰巳午未申为昼，酉戌亥子丑寅为夜
    var isDay = (shiZhi >= 3 && shiZhi <= 8);
    var guiZhi = isDay ? GUI_ZHOU[riGan] : GUI_YE[riGan];
    var guiPos = tianPan.indexOf(guiZhi);     // 天盘贵支临地盘位
    var shun = (guiPos >= 11 || guiPos <= 4); // 亥子丑寅卯辰顺，巳午未申酉戌逆
    var jiangByZhi = [];                      // 按天盘支索引取天将
    for (var j = 0; j < 12; j++) {
      var z = shun ? (guiZhi + j) % 12 : (guiZhi - j + 24) % 12;
      jiangByZhi[z] = TIANJIANG[j];
    }

    /* ---------- 空亡 / 遁干 / 六亲 ---------- */
    var kongWang = XUN_KONGWANG[(sz.daySeq - (sz.daySeq % 10)) / 10];
    var kongSet = {};
    kongSet[kongWang[0]] = 1; kongSet[kongWang[1]] = 1;

    function chuanInfo(z) {
      return {
        zhi: ZHI[z],
        zhiIdx: z,
        jiang: jiangByZhi[z],
        liuqin: liuQin(z, riGan),
        dunGan: xunDunGan(sz.daySeq, z),
        isKong: !!kongSet[z]
      };
    }
    var chuan = [chuanInfo(sc.chu), chuanInfo(sc.zhong), chuanInfo(sc.mo)];

    var siKe = [];
    for (var k = 0; k < 4; k++) {
      siKe.push({
        index: k + 1,
        shang: ZHI[keShang[k]],
        xia: keXiaLabel[k],
        xiaGong: ZHI[keXiaGong[k]],
        jiang: jiangByZhi[keShang[k]]
      });
    }

    return {
      // 输入回显
      input: { year: y, month: m, day: d, hour: hour, minute: minute },
      // 四柱字符串（年月日时），如 "丙午 丙申 庚申 癸未"
      siZhu: pillarStrs.join(' '),
      pillars: sz.pillars.map(function (p, i) {
        return { pos: ['年柱', '月柱', '日柱', '时柱'][i], gz: GAN[p.gan] + ZHI[p.zhi] };
      }),
      // 月将：{ zhi 支, name 月将名, qi 换将中气, qiTime 换将时刻 }
      yueJiang: { zhi: ZHI[jiangZhi], name: YUEJIANG_NAME[jiangZhi], qi: zq.qiName, qiTime: jdStr(zq.jieJD) },
      // 占时（时支）
      zhanShi: { zhi: ZHI[shiZhi], isDay: isDay, zhouYe: isDay ? '昼' : '夜' },
      // 天盘（索引=地盘位，值=天盘支字符）；地盘恒为 ZHI 本序
      tianPan: tianPan.map(function (v) { return ZHI[v]; }),
      tianPanIdx: tianPan.slice(),
      // 四课（一二三四，shang=上神，xia=下〔一课为日干字〕，jiang=上神天将）
      siKe: siKe,
      // 三传（初/中/末：支、天将、六亲、遁干、空亡标记）
      sanChuan: chuan,
      sanChuanStr: chuan.map(function (c) { return c.zhi; }).join(''),
      // 课体与推演轨迹
      keTi: sc.keTi,
      keTiDetail: sc.keTiDetail,
      trace: sc.trace,
      // 贵人：支、昼夜、临地盘位、顺逆
      guiRen: {
        zhi: ZHI[guiZhi], zhouYe: isDay ? '昼贵' : '夜贵',
        pos: ZHI[guiPos], shunNi: shun ? '顺布' : '逆布'
      },
      // 十二天将按天盘支索引
      jiangByZhi: jiangByZhi.slice(),
      // 日柱空亡
      kongWang: kongWang,
      // 历法辅助
      calendar: { jieName: sz.loc.jieName, jieTime: jdStr(sz.loc.jieJD) }
    };
  }

  /* ================================================================
   * 五、UI 渲染 render(el, result)
   *   CSS 类名：lr-root / lr-title / lr-info / lr-main / lr-pan-wrap / lr-pan /
   *   lr-pan-toplabel / lr-pan-di / lr-pan-di-strong / lr-pan-tian / lr-pan-tian-strong /
   *   lr-pan-center / lr-pan-cz / lr-pan-cn / lr-sike / lr-sec-title / lr-sike-row /
   *   lr-ke / lr-ke-inner / lr-ke-shang / lr-ke-xia / lr-ke-jiang / lr-sanchuan /
   *   lr-sc-row / lr-sc / lr-sc-label / lr-sc-zhi / lr-sc-jiang / lr-sc-qin / lr-sc-dun /
   *   lr-keti / lr-trace
   *   模块自动注入基础样式（<style id="liuren-pro-injected-style">），外部可同名覆盖。
   * ================================================================ */

  var STYLE_ID = 'liuren-pro-injected-style';
  function ensureStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '.lr-root{font-family:' + THEME.fontFamily + ';background:' + THEME.bg + ';color:' + THEME.ink + ';padding:14px;border:1px solid #d8d0bc;border-radius:10px;max-width:760px;margin:0 auto;}',
      '.lr-title{text-align:center;font-size:18px;letter-spacing:6px;color:' + THEME.gold + ';margin:2px 0 8px;}',
      '.lr-info{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 10px;font-size:12px;color:#5c5341;background:#fffdf6;border:1px solid #e0d8c2;border-radius:6px;padding:6px 10px;margin-bottom:10px;}',
      '.lr-info b{color:' + THEME.gold + ';font-weight:600;}',
      '.lr-main{display:flex;gap:14px;align-items:flex-start;justify-content:center;flex-wrap:wrap;}',
      '.lr-pan-wrap{flex:0 0 auto;text-align:center;}',
      '.lr-pan{display:block;}',
      '.lr-pan-toplabel{font-size:13px;fill:' + THEME.gold + ';font-family:' + THEME.fontFamily + ';font-weight:bold;}',
      '.lr-pan-di{font-size:15px;fill:' + THEME.ink + ';font-family:' + THEME.fontFamily + ';}',
      '.lr-pan-di-strong{font-size:17px;fill:#111;font-weight:bold;font-family:' + THEME.fontFamily + ';}',
      '.lr-pan-tian{font-size:15px;fill:' + THEME.gold + ';font-family:' + THEME.fontFamily + ';}',
      '.lr-pan-tian-strong{font-size:17px;fill:#6d5210;font-weight:bold;font-family:' + THEME.fontFamily + ';}',
      '.lr-pan-center{font-size:15px;fill:' + THEME.ink + ';font-family:' + THEME.fontFamily + ';font-weight:bold;}',
      '.lr-pan-cn{font-size:11px;fill:' + THEME.gold + ';font-family:' + THEME.fontFamily + ';}',
      '.lr-sike{flex:1 1 260px;min-width:240px;}',
      '.lr-sec-title{font-size:13px;color:' + THEME.gold + ';letter-spacing:3px;margin:2px 0 6px;border-bottom:1px dashed #d8cdb0;padding-bottom:3px;}',
      '.lr-sike-row{display:flex;justify-content:center;gap:8px;}',
      '.lr-ke{display:flex;align-items:stretch;gap:2px;background:#fffdf6;border:1px solid #cfc6ac;border-radius:8px;padding:6px 4px;flex:1 1 0;min-width:0;}',
      '.lr-ke-inner{flex:1;text-align:center;}',
      '.lr-ke-shang{font-size:26px;font-weight:700;line-height:1.3;}',
      '.lr-ke-xia{font-size:18px;color:#5c5341;line-height:1.4;border-top:1px solid #e6dec8;margin:0 4px;padding-top:2px;}',
      '.lr-ke-jiang{writing-mode:vertical-rl;font-size:11px;color:' + THEME.gold + ';letter-spacing:2px;line-height:1;padding-top:2px;}',
      '.lr-sanchuan{margin-top:12px;}',
      '.lr-sc-row{display:flex;justify-content:center;gap:12px;}',
      '.lr-sc{flex:1 1 0;min-width:0;text-align:center;background:#fffdf6;border:1px solid #cfc6ac;border-radius:8px;padding:6px 4px;}',
      '.lr-sc-label{font-size:11px;color:#8a7f66;letter-spacing:2px;}',
      '.lr-sc-zhi{font-size:30px;font-weight:700;line-height:1.3;color:' + THEME.ink + ';}',
      '.lr-sc-jiang{font-size:13px;color:' + THEME.gold + ';font-weight:600;}',
      '.lr-sc-qin{font-size:12px;color:#7a7160;}',
      '.lr-sc-dun{font-size:11px;color:#9c8a5f;}',
      '.lr-keti{text-align:center;margin-top:10px;font-size:13px;color:' + THEME.gold + ';letter-spacing:2px;}',
      '.lr-trace{margin:8px 4px 0;font-size:11px;color:#8a7f66;line-height:1.7;border-top:1px dashed #e0d8c2;padding-top:6px;}',
      '@media (max-width:420px){',
      '  .lr-pan-wrap .lr-pan{width:80%;height:auto;}',
      '  .lr-main{flex-direction:column;align-items:center;}',
      '  .lr-sike{width:100%;}',
      '  .lr-sike-row,.lr-sc-row{flex-wrap:nowrap;}',
      '  .lr-ke-shang{font-size:22px;}.lr-ke-xia{font-size:15px;}',
      '  .lr-sc-zhi{font-size:24px;}',
      '}'
    ].join('');
    document.head.appendChild(st);
  }

  // 极坐标：支 z（午=6 在正上，顺时针 30° 一支）
  function polar(cx, cy, r, z) {
    var ang = (z - 6) * 30 * Math.PI / 180;
    return [cx + r * Math.sin(ang), cy - r * Math.cos(ang)];
  }

  // 天地盘圆盘 SVG：外环地盘（固定），内环天盘（月将加时旋转对位，金色），
  // 顶部标注占时，占时支（外环）与月将支（内环）加重
  function panSVG(result) {
    var cx = 130, cy = 132, SIZE = 260;
    var tianIdx = result.tianPanIdx;
    var shiZ = result.zhanShi.zhi;
    var shiIdx = ZHI.indexOf(shiZ);
    var jiangZ = result.yueJiang.zhi;
    var s = '<svg class="lr-pan" width="' + SIZE + '" height="' + SIZE + '" viewBox="0 0 ' + SIZE + ' ' + SIZE + '" xmlns="http://www.w3.org/2000/svg">';
    s += '<text class="lr-pan-toplabel" x="' + cx + '" y="14" text-anchor="middle">占时·' + shiZ + '</text>';
    // 同心圆与放射线
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="122" fill="#fffdf6" stroke="#d8cdb0" stroke-width="1"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="92" fill="none" stroke="#e5ddc8" stroke-width="1"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="58" fill="#faf5e6" stroke="#d8cdb0" stroke-width="1"/>';
    for (var p = 0; p < 12; p++) {
      var a = (p - 6) * 30 * Math.PI / 180;
      s += '<line x1="' + (cx + 58 * Math.sin(a)).toFixed(1) + '" y1="' + (cy - 58 * Math.cos(a)).toFixed(1) +
        '" x2="' + (cx + 122 * Math.sin(a)).toFixed(1) + '" y2="' + (cy - 122 * Math.cos(a)).toFixed(1) +
        '" stroke="#efe8d4" stroke-width="1"/>';
    }
    // 外环地盘十二支（固定；占时支加重）
    for (p = 0; p < 12; p++) {
      var xy = polar(cx, cy, 107, p);
      var strong = (p === shiIdx);
      s += '<text class="lr-pan-di' + (strong ? '-strong' : '') + '" x="' + xy[0].toFixed(1) + '" y="' + (xy[1] + 5).toFixed(1) +
        '" text-anchor="middle">' + ZHI[p] + '</text>';
    }
    // 内环天盘十二支（金色；月将支加重，其必落于占时方位）
    for (p = 0; p < 12; p++) {
      var tv = tianIdx[p];
      var xy2 = polar(cx, cy, 75, p);
      var strong2 = (ZHI[tv] === jiangZ);
      s += '<text class="lr-pan-tian' + (strong2 ? '-strong' : '') + '" x="' + xy2[0].toFixed(1) + '" y="' + (xy2[1] + 5).toFixed(1) +
        '" text-anchor="middle">' + ZHI[tv] + '</text>';
    }
    // 中心：月将信息
    s += '<text class="lr-pan-center" x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle">' + jiangZ + '将</text>';
    s += '<text class="lr-pan-cn" x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle">' + result.yueJiang.name + '</text>';
    s += '<text class="lr-pan-cn" x="' + cx + '" y="' + (cy + 30) + '" text-anchor="middle">' + result.guiRen.zhouYe + ' ' + result.guiRen.zhi + '</text>';
    s += '</svg>';
    return s;
  }

  // 四课 HTML：四列，每列上=上神 / 下=干或支，右侧天将小字
  function siKeHTML(result) {
    var h = '<div class="lr-sike">';
    h += '<div class="lr-sec-title">四课（一 → 四，自右向左为传统读法）</div>';
    h += '<div class="lr-sike-row">';
    result.siKe.forEach(function (ke) {
      h += '<div class="lr-ke">';
      h += '<div class="lr-ke-inner">';
      h += '<div class="lr-ke-shang">' + ke.shang + '</div>';
      h += '<div class="lr-ke-xia">' + ke.xia + '</div>';
      h += '</div>';
      h += '<div class="lr-ke-jiang">' + ke.jiang + '</div>';
      h += '</div>';
    });
    h += '</div></div>';
    return h;
  }

  // 三传 HTML：初/中/末三列大字，每列上神支 + 天将 + 六亲 + 遁干
  function sanChuanHTML(result) {
    var labels = ['初传', '中传', '末传'];
    var h = '<div class="lr-sanchuan">';
    h += '<div class="lr-sec-title">三传</div>';
    h += '<div class="lr-sc-row">';
    result.sanChuan.forEach(function (c, i) {
      h += '<div class="lr-sc">';
      h += '<div class="lr-sc-label">' + labels[i] + '</div>';
      h += '<div class="lr-sc-zhi">' + c.zhi + '</div>';
      h += '<div class="lr-sc-jiang">' + c.jiang + '</div>';
      h += '<div class="lr-sc-qin">' + c.liuqin + '</div>';
      h += '<div class="lr-sc-dun">' + (c.dunGan ? '遁干 ' + c.dunGan : (c.isKong ? '空亡' : '无遁干')) + '</div>';
      h += '</div>';
    });
    h += '</div></div>';
    return h;
  }

  // 主渲染入口：顶部信息条 -> 左圆盘 + 右四课 -> 底部三传 -> 课体与推演轨迹
  function render(el, result) {
    if (!el || !result || typeof document === 'undefined') return;
    ensureStyle();
    var root = document.createElement('div');
    root.className = 'lr-root';
    var h = '';
    h += '<div class="lr-title">大六壬课式</div>';
    h += '<div class="lr-info">';
    h += '<span>' + result.input.year + '年' + result.input.month + '月' + result.input.day + '日 ' +
      pad2(result.input.hour) + ':' + pad2(result.input.minute) + '</span>';
    h += '<span>四柱 <b>' + result.siZhu + '</b></span>';
    h += '<span>' + result.zhanShi.zhi + '时占</span>';
    h += '<span>月将 <b>' + result.yueJiang.zhi + '（' + result.yueJiang.name + '）</b></span>';
    h += '<span>' + result.guiRen.zhouYe + ' <b>' + result.guiRen.zhi + '</b>·' + result.guiRen.shunNi + '</span>';
    h += '<span>空亡 ' + result.kongWang + '</span>';
    h += '</div>';
    h += '<div class="lr-main">';
    h += '<div class="lr-pan-wrap">' + panSVG(result) + '</div>';
    h += siKeHTML(result);
    h += '</div>';
    h += sanChuanHTML(result);
    h += '<div class="lr-keti">课体：' + result.keTi + ' · 三传 ' + result.sanChuanStr + '</div>';
    h += '<div class="lr-trace">推演：' + result.trace.join('；') + '。换将依据：' +
      result.yueJiang.qi + '（' + result.yueJiang.qiTime + '）</div>';
    root.innerHTML = h;
    el.innerHTML = '';
    el.appendChild(root);
  }

  /* ================================================================
   * 六、自验证 selfTest
   * ================================================================ */

  function selfTest() {
    var cases = [
      /* 用例一：2026-08-14 14:22（未时）—— 八专课（干支同位，无克不复取遥）
       * 手工推演：
       *   ① 四柱：2026-08-14 在立秋(8/7)后白露(9/7)前为申月，丙年八月丙申；日柱庚申
       *     （锚点校验：2000-01-01 戊午）；庚日未时五鼠遁起丙子 → 癸未。四柱「丙午 丙申 庚申 癸未」。
       *   ② 月将：8/14 在大暑(7/22)后、处暑(8/23)前 → 午将（胜光）。
       *   ③ 天地盘：午将加未时，天盘[pos]=(6+pos-7+12)%12=(pos+11)%12：
       *     地盘 子丑寅卯辰巳午未申酉戌亥 → 天盘 亥子丑寅卯辰巳午未申酉戌。
       *   ④ 四课：庚寄申（与日支申同位 → 八专日）。一课：天盘[申]=未 → 未/庚（土生金
       *     无克）；二课：天盘[未]=午 → 午/未（火生土无克）；三课：日支申 → 未/申（无克）；
       *     四课：天盘[未]=午 → 午/未（与二课同）。四课上下无克，仅两课。
       *   ⑤ 虽二课上神午火遥克日干庚金，但八专日无克不复取遥（《注解大六壬指南·
       *     心印赋》"无克不复取遥矣"）→ 直入八专法。
       *   ⑥ 八专：庚为阳日，干上神未天盘顺数三位（连本位）：未→申→酉，初传酉；
       *     中末皆用干上神未。三传「酉未未」。
       *   ⑦ 贵人：庚日未时为昼，昼贵丑；天盘丑临地盘寅位（寅∈亥子丑寅卯辰）→ 顺布。
       *     十二将随天盘支：酉=太常、未=天空。
       *   ⑧ 日柱庚申为甲寅旬（50-59），空亡子丑；遁干：酉=辛、未=己。
       *   ⑨ 六亲（庚金）：酉金=兄弟，未土生金=父母。 */
      {
        name: '2026-08-14 14:22 未时 · 八专课（无克不复取遥）',
        input: { year: 2026, month: 8, day: 14, hour: 14, minute: 22 },
        expected: {
          siZhu: '丙午 丙申 庚申 癸未', jiang: '午胜光',
          tianPan: '亥子丑寅卯辰巳午未申酉戌',
          siKe: '未庚 午未 未申 午未',
          sanChuan: '酉未未', keTi: '八专',
          jiangStr: '太常天空天空', kongWang: '子丑',
          liuqinStr: '兄弟父母父母', dunStr: '辛己己'
        }
      },
      /* 用例二：2026-08-14 12:22（午时）—— 伏吟·自任格（兼验伏吟优先于八专）
       * 手工推演：
       *   ① 四柱：同上换时柱，庚日午时五鼠遁 → 壬午。四柱「丙午 丙申 庚申 壬午」。
       *   ② 月将仍为午（胜光）；占时午 → 月将=占时，天盘=地盘，伏吟。
       *   ③ 四课：庚寄申（与日支申同位）。一课：申/庚（金金比和无克）；二课申/申；
       *     三课申/申；四课申/申。上下无克，亦无遥克（申与庚比和）。
       *   ④ 庚申日虽干支同位，但伏吟课体优先于八专（《六壬大全》伏吟课首例即干支
       *     同位之癸丑日午将午时）：伏吟无克，刚（阳）日自以日神为用 → 初传=干上神申。
       *   ⑤ 刑传：申刑寅 → 中传寅；寅刑巳 → 末传巳。三传「申寅巳」（自任格）。
       *   ⑥ 贵人：庚日午时为昼，昼贵丑；伏吟天盘丑临地盘丑位 → 顺布。
       *     申=白虎、寅=螣蛇、巳=勾陈。
       *   ⑧ 甲寅旬空子丑；遁干：申=庚、寅=甲、巳=丁。
       *   ⑨ 六亲（庚金）：申=兄弟，寅木受金克=妻财，巳火克金=官鬼。 */
      {
        name: '2026-08-14 12:22 午时 · 伏吟自任格（伏吟优先于八专）',
        input: { year: 2026, month: 8, day: 14, hour: 12, minute: 22 },
        expected: {
          siZhu: '丙午 丙申 庚申 壬午', jiang: '午胜光',
          tianPan: '子丑寅卯辰巳午未申酉戌亥',
          siKe: '申庚 申申 申申 申申',
          sanChuan: '申寅巳', keTi: '伏吟·自任',
          jiangStr: '白虎螣蛇勾陈', kongWang: '子丑',
          liuqinStr: '兄弟妻财官鬼', dunStr: '庚甲丁'
        }
      },
      /* 用例三：2026-09-21 09:30（巳时）—— 伏吟课例（月将恰等于占时）
       * 手工推演：
       *   ① 四柱：9/21 在白露(9/7)后寒露(10/8)前为酉月，丙年八月丁酉；日柱 9/1 戊寅
       *     +20 天 = 戊戌；戊日巳时五鼠遁起壬子 → 丁巳。四柱「丙午 丁酉 戊戌 丁巳」。
       *   ② 月将：9/21 在处暑(8/23)后、秋分(9/23)前 → 巳将（太乙）。占时巳 → 伏吟。
       *   ③ 四课：戊寄巳。一课：巳/戊（火生土无克）；二课巳/巳；三课：日支戌 → 戌/戌；
       *     四课戌/戌。无上下克。遥克（伏吟不取，课体优先）：二三课上神巳与日干戊
       *     火生土无克、戌与戊比和、戊克水无水 → 无遥。
       *   ④ 伏吟无克，戊为刚（阳）日 → 初传=干上神巳（自任格）。
       *   ⑤ 刑传：巳刑申 → 中传申；申刑寅 → 末传寅。三传「巳申寅」。
       *   ⑥ 贵人：戊日巳时为昼，昼贵丑；伏吟丑临地盘丑位 → 顺布。巳=勾陈、申=白虎、寅=螣蛇。
       *   ⑧ 日柱戊戌为甲午旬（30-39），空亡辰巳（初传巳落空亡）；遁干：巳空亡无遁干、
       *     申=丙、寅=壬。
       *   ⑨ 六亲（戊土）：巳火生土=父母，申金土生金=子孙，寅木克土=官鬼。 */
      {
        name: '2026-09-21 09:30 巳时 · 伏吟自任格（月将=占时）',
        input: { year: 2026, month: 9, day: 21, hour: 9, minute: 30 },
        expected: {
          siZhu: '丙午 丁酉 戊戌 丁巳', jiang: '巳太乙',
          tianPan: '子丑寅卯辰巳午未申酉戌亥',
          siKe: '巳戊 巳巳 戌戌 戌戌',
          sanChuan: '巳申寅', keTi: '伏吟·自任',
          jiangStr: '勾陈白虎螣蛇', kongWang: '辰巳',
          liuqinStr: '父母子孙官鬼', dunStr: '空丙壬'
        }
      },
      /* 用例四：2026-11-30 06:30（卯时）—— 元首课（一上克下取上神发用）
       * 手工推演：
       *   ① 四柱：11/30 在小雪(11/22)后大雪(12/7)前为亥月，丙年十月己亥；日柱戊申
       *     （11/29 丁未 +1）；戊日卯时五鼠遁起壬子 → 乙卯。四柱「丙午 己亥 戊申 乙卯」。
       *   ② 月将：小雪(11/22)后、冬至(12/21)前 → 寅将（功曹）。
       *   ③ 天地盘：寅将加卯时，天盘[pos]=(2+pos-3+12)%12=(pos+11)%12：
       *     地盘 子丑寅卯辰巳午未申酉戌亥 → 天盘 亥子丑寅卯辰巳午未申酉戌。
       *   ④ 四课：戊寄巳。一课：天盘[巳]=辰 → 辰/戊（土土比和无克）；
       *     二课：天盘[辰]=卯 → 卯/辰（卯木克辰土，上克下）；三课：日支申 → 天盘[申]=未
       *     → 未/申（土生金无克）；四课：天盘[未]=午 → 午/未（火生土无克）。
       *   ⑤ 四课上下仅二课一处上克下、无下贼上 → 元首课，初传取该上克下之上神卯。
       *   ⑥ 传行：中传=天盘[卯位]=寅，末传=天盘[寅位]=丑。三传「卯寅丑」。
       *   ⑦ 贵人：戊日卯时为昼，昼贵丑；天盘丑临地盘寅位（寅∈亥子丑寅卯辰）→ 顺布。
       *     十二将（顺）：卯=朱雀、寅=螣蛇、丑=贵人。
       *   ⑧ 日柱戊申(组合序44)为甲辰旬（40-49），空亡寅卯（初传卯、中传寅皆落空）；
       *     遁干：卯空亡、寅空亡、丑=癸。
       *   ⑨ 六亲（戊土）：卯木克土=官鬼，寅木克土=官鬼，丑土=兄弟。 */
      {
        name: '2026-11-30 06:30 卯时 · 元首课（一上克下发用）',
        input: { year: 2026, month: 11, day: 30, hour: 6, minute: 30 },
        expected: {
          siZhu: '丙午 己亥 戊申 乙卯', jiang: '寅功曹',
          tianPan: '亥子丑寅卯辰巳午未申酉戌',
          siKe: '辰戊 卯辰 未申 午未',
          sanChuan: '卯寅丑', keTi: '贼克·元首',
          jiangStr: '朱雀螣蛇贵人', kongWang: '寅卯',
          liuqinStr: '官鬼官鬼兄弟', dunStr: '空空癸'
        }
      },
      /* 用例五：2026-08-14 20:30（戌时）—— 重审课 + 夜贵（补充昼夜覆盖）
       * 手工推演：
       *   ① 四柱：庚日戌时五鼠遁起丙子 → 丙戌。四柱「丙午 丙申 庚申 丙戌」。
       *   ② 月将仍午（胜光）。天地盘：午将加戌时，天盘[pos]=(6+pos-10+12)%12=(pos+8)%12：
       *     地盘 子丑寅卯辰巳午未申酉戌亥 → 天盘 申酉戌亥子丑寅卯辰巳午未。
       *   ③ 四课：庚寄申。一课：天盘[申]=辰 → 辰/庚（土生金无克）；
       *     二课：天盘[辰]=子 → 子/辰（辰土克子水 → 下贼上）；三课：辰/申（无克）；
       *     四课：子/辰（下贼上，与二课同支）。下贼上（重审），去重后仅子上神一处
       *     → 初传子。
       *   ④ 传行：中传=天盘[子位]=申，末传=天盘[申位]=辰。三传「子申辰」。
       *   ⑤ 贵人：庚日戌时为夜，夜贵未；天盘[pos]=pos+8，未临地盘亥位（亥∈亥子丑寅
       *     卯辰）→ 顺布。十二将（顺）：子=青龙、申=螣蛇、辰=玄武。
       *   ⑥ 甲寅旬空子丑（初传子落空亡）；遁干：子空亡、申=庚、辰=丙。
       *   ⑦ 六亲（庚金）：子水=子孙，申金=兄弟，辰土=父母。 */
      {
        name: '2026-08-14 20:30 戌时 · 重审课（夜贵顺布）',
        input: { year: 2026, month: 8, day: 14, hour: 20, minute: 30 },
        expected: {
          siZhu: '丙午 丙申 庚申 丙戌', jiang: '午胜光',
          tianPan: '申酉戌亥子丑寅卯辰巳午未',
          siKe: '辰庚 子辰 辰申 子辰',
          sanChuan: '子申辰', keTi: '贼克·重审',
          jiangStr: '青龙螣蛇玄武', kongWang: '子丑',
          liuqinStr: '子孙兄弟父母', dunStr: '空庚丙'
        }
      }
    ];

    function summarize(r) {
      return {
        siZhu: r.siZhu,
        jiang: r.yueJiang.zhi + r.yueJiang.name,
        tianPan: r.tianPan.join(''),
        siKe: r.siKe.map(function (k) { return k.shang + k.xia; }).join(' '),
        sanChuan: r.sanChuanStr,
        keTi: r.keTi,
        jiangStr: r.sanChuan.map(function (c) { return c.jiang; }).join(''),
        kongWang: r.kongWang,
        liuqinStr: r.sanChuan.map(function (c) { return c.liuqin; }).join(''),
        dunStr: r.sanChuan.map(function (c) { return c.dunGan || '空'; }).join('')
      };
    }

    var out = [], allPass = true;
    cases.forEach(function (c) {
      var actual = summarize(paiPan(c.input));
      var ok = true;
      Object.keys(c.expected).forEach(function (k) {
        if (c.expected[k] !== actual[k]) ok = false;
      });
      if (!ok) allPass = false;
      out.push({
        name: c.name,
        ok: ok,
        expected: c.expected,
        actual: actual,
        detail: c.input.year + '-' + c.input.month + '-' + c.input.day + ' ' +
          c.input.hour + ':' + pad2(c.input.minute)
      });
    });
    return { passed: allPass, cases: out };
  }

  /* ================================================================
   * 七、导出
   * ================================================================ */

  var LiuRenPro = {
    paiPan: paiPan,
    render: render,
    selfTest: selfTest,
    // 辅助导出（便于二次开发 / 单元测试）
    solarTermJD: solarTermJD,
    yearTermJD: yearTermJD,
    calcSiZhu: calcSiZhu,
    calcSanChuan: calcSanChuan,
    gzSeq: gzSeq,
    liuQin: liuQin,
    xunDunGan: xunDunGan,
    GAN: GAN, ZHI: ZHI, WX_NAME: WX_NAME,
    GAN_GONG: GAN_GONG, YUEJIANG_NAME: YUEJIANG_NAME, TIANJIANG: TIANJIANG,
    XING: XING, YIMA: YIMA, TERM_NAMES: TERM_NAMES, THEME: THEME
  };

  global.LiuRenPro = LiuRenPro;
  if (typeof module !== 'undefined' && module.exports) module.exports = LiuRenPro;

})(typeof window !== 'undefined' ? window : globalThis);
