/**
 * bazi.js —— 十三宫奇门遁甲 APP · 四柱八字排盘模块（自包含，无任何外部依赖）
 *
 * 挂载方式：UMD 风格，浏览器挂 window.BaziPro，Node 中挂 global.window.BaziPro
 * 对外 API：
 *   window.BaziPro.paiPan({ year, month, day, hour, minute, gender })
 *   window.BaziPro.render(el, result)
 *   window.BaziPro.selfTest()
 *
 * 节气算法：寿星近似公式取初值 + Meeus 低精度太阳黄经（VSOP87 截断）牛顿迭代精化，
 *           1900-2100 年节气时刻误差约 ±30 分钟，立春年界 / 节分月界可靠。
 * 时间约定：一律按东八区（UTC+8）民用时；日柱公式 (JDN+49) mod 60（1949-10-01=甲子校验，2000-01-01=戊午）；
 *           23:00-24:00 为晚子时，日柱进位为次日。
 */
(function (global) {
  'use strict';

  /* ================================================================
   * 一、基础数据表
   * ================================================================ */

  // 十天干（索引 0-9 即干序，甲=0）
  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  // 十二地支（索引 0-11 即支序，子=0）
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  // 天干五行：木火土金水（索引 0-4）
  var GAN_WX = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  // 地支五行
  var ZHI_WX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 2];
  // 天干阴阳：0 阳 1 阴
  var GAN_YINYANG = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  // 五行名称
  var WX_NAME = ['木', '火', '土', '金', '水'];
  // 五行相生：木生火生土生金生水生木
  var WX_SHENG = [1, 2, 3, 4, 0];
  // 五行相克：木克土克水克火克金克木
  var WX_KE = [2, 4, 0, 3, 1];

  // 地支藏干表（本气、中气、余气；无中余气以 null 占位）
  var CANGGAN = {
    '子': ['癸', null, null],
    '丑': ['己', '癸', '辛'],
    '寅': ['甲', '丙', '戊'],
    '卯': ['乙', null, null],
    '辰': ['戊', '乙', '癸'],
    '巳': ['丙', '庚', '戊'],
    '午': ['丁', '己', null],
    '未': ['己', '丁', '乙'],
    '申': ['庚', '壬', '戊'],
    '酉': ['辛', null, null],
    '戌': ['戊', '辛', '丁'],
    '亥': ['壬', '甲', null]
  };

  // 人元司令分野表（各藏干司令日数，合计约 30 日；用于月令深浅参考）
  var FENYE = {
    '子': [['癸', 30]],
    '丑': [['癸', 9], ['辛', 3], ['己', 18]],
    '寅': [['戊', 7], ['丙', 7], ['甲', 16]],
    '卯': [['甲', 10], ['乙', 20]],
    '辰': [['乙', 9], ['癸', 3], ['戊', 18]],
    '巳': [['戊', 5], ['丙', 9], ['庚', 16]],
    '午': [['丙', 10], ['丁', 20]],
    '未': [['丁', 9], ['乙', 3], ['己', 18]],
    '申': [['戊', 7], ['壬', 7], ['庚', 16]],
    '酉': [['庚', 10], ['辛', 20]],
    '戌': [['辛', 9], ['丁', 3], ['戊', 18]],
    '亥': [['戊', 7], ['甲', 5], ['壬', 18]]
  };

  // 六十甲子纳音表（序 = floor(干支组合序 / 2)，共 30 项）
  var NAYIN = [
    '海中金', '炉中火', '大林木', '路旁土', '剑锋金',
    '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
    '泉中水', '屋上土', '霹雳火', '松柏木', '长流水',
    '砂石金', '山下火', '平地木', '壁上土', '金箔金',
    '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木',
    '大溪水', '沙中土', '天上火', '石榴木', '大海水'
  ];

  // 六甲旬空亡（旬首组合序 0,10,20,30,40,50 对应 甲子/甲戌/甲申/甲午/甲辰/甲寅）
  var XUN_KONGWANG_BY_SEQ = ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑'];

  // 十二长生（星运）名称
  var CHANGSHENG = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  // 十二长生起点：甲亥、乙午、丙寅、丁酉、戊寅、己酉、庚巳、辛子、壬申、癸卯；阳干顺行、阴干逆行
  var CS_START = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
  var CS_TABLE = (function () {
    var t = [];
    for (var g = 0; g < 10; g++) {
      var row = [];
      for (var z = 0; z < 12; z++) {
        var d = (g % 2 === 0)
          ? (z - CS_START[g] + 12) % 12    // 阳干顺数
          : (CS_START[g] - z + 12) % 12;   // 阴干逆数
        row.push(d);
      }
      t.push(row);
    }
    return t;
  })();

  // 生肖（按年柱地支）
  var SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

  // 月支名称（月 num 0=寅月…11=丑月）
  var YUEMING = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

  // 24 节气名称（按公历年 1-12 月顺序：小寒…冬至）
  var TERM_NAMES = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满',
    '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
    '立冬', '小雪', '大雪', '冬至'];
  // 24 节气对应太阳黄经（春分 0°，每 15° 一气；小寒 285°）
  var TERM_LONG = [285, 300, 315, 330, 345, 0, 15, 30, 45, 60,
    75, 90, 105, 120, 135, 150, 165, 180, 195, 210,
    225, 240, 255, 270];
  // 定月柱的十二「节」在 TERM_NAMES 中的索引（小寒…大雪）
  var JIE_INDEX = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

  // 主色板（宣纸白 / 墨色 / 暗金，楷体优先）
  var THEME = {
    bg: '#f5f2e9', ink: '#2b2b2b', gold: '#8b6914',
    wxColor: { '木': '#3a7d44', '火': '#c0392b', '土': '#8b5a2b', '金': '#7f8c8d', '水': '#2b3a55' },
    fontFamily: "KaiTi, 'Kaiti SC', STKaiti, serif"
  };

  /* ================================================================
   * 二、历法工具（儒略日互转，东八区民用时）
   * ================================================================ */

  // 公历 -> 儒略日（含时刻）
  function gregorianToJD(y, m, d, hour, minute) {
    var h = (hour || 0) + (minute || 0) / 60;
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    var jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    return jdn + h / 24 - 0.5;
  }

  // 儒略日 -> {year, month, day, hour, minute}
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

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  // JD -> 显示字符串 "YYYY-MM-DD HH:mm"
  function jdStr(jd) {
    var g = jdToGregorian(jd);
    return g.year + '-' + pad2(g.month) + '-' + pad2(g.day) + ' ' + pad2(g.hour) + ':' + pad2(g.minute);
  }

  /* ================================================================
   * 三、节气计算（寿星近似初值 + Meeus 太阳黄经迭代精化）
   * ================================================================ */

  // Meeus 低精度太阳视黄经（度），精度约 ±0.01°
  function sunLongitude(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;      // 太阳几何平黄经
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;       // 太阳平近点角
    var Mr = M * Math.PI / 180;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
      + 0.000289 * Math.sin(3 * Mr);                               // 中心差
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

  // 节气典型日期表（初值用，索引同 TERM_NAMES：小寒 1/5 … 冬至 12/21，实际日期 ±1 天内）
  var TERM_MD = [[1, 5], [1, 20], [2, 4], [2, 19], [3, 5], [3, 20], [4, 5], [4, 20],
    [5, 5], [5, 21], [6, 6], [6, 21], [7, 7], [7, 23], [8, 7], [8, 23],
    [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 21]];

  // 节气时刻初值：节气序数 n -> 公历年 1900+floor(n/24) 的典型日期正午
  function solarTermApprox(n) {
    var idx = ((n % 24) + 24) % 24;
    var yy = 1900 + Math.floor(n / 24);
    return gregorianToJD(yy, TERM_MD[idx][0], TERM_MD[idx][1], 12, 0);
  }

  // 节气序数（1900 年小寒 = 0，逐气 +1）-> 精确儒略日（牛顿迭代）
  // 时间轴约定：本模块全部使用"北京时间钟面"轴（伪轴 JD = 真实 JD + 8/24，因北京钟面比 UTC 快 8 小时）；
  // Meeus 太阳黄经公式按 UTC（近似 TD）计算，代入前 -8/24 换为真实 JD；返回值保持北京轴，
  // 与出生时刻 birthJD 直接可比、jdStr 显示即北京时间。
  var termCache = {};
  function solarTermJD(n) {
    var key = 'n' + n;
    if (termCache[key] !== undefined) return termCache[key];
    var target = TERM_LONG[((n % 24) + 24) % 24];
    var jd = solarTermApprox(n);
    for (var i = 0; i < 12; i++) {
      var dl = angleDiff(target, sunLongitude(jd - 8 / 24));
      if (Math.abs(dl) < 0.0005) break;
      jd += dl / 0.98565;              // 太阳平均视运动约 0.98565 度/天
    }
    termCache[key] = jd;
    return jd;
  }

  // 指定公历年 y 的第 idx 个节气（idx 0-23，按 TERM_NAMES 顺序）的儒略日
  function yearTermJD(y, idx) {
    return solarTermJD((y - 1900) * 24 + idx);
  }

  // 定位出生时刻所在的「节」区间（月柱）与年柱归属年
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
    // 月 num：小寒-丑(11)、立春-寅(0)、惊蛰-卯(1)…大雪-子(10)
    var monthNum;
    if (best.tIdx === 0) monthNum = 11;
    else if (best.tIdx === 22) monthNum = 10;
    else monthNum = (best.tIdx - 2) / 2;
    // 年柱归属：立春 -> 次年立春为一年
    var lichunJD = yearTermJD(y, 2);
    var yearGanYear = (birthJD >= lichunJD) ? y : y - 1;
    return { jieJD: best.jieJD, jieName: best.jieName, tIdx: best.tIdx, monthNum: monthNum, yearGanYear: yearGanYear, birthJD: birthJD };
  }

  // 出生前后相邻的两个「节」（大运起运用）
  function neighborJie(curYear, curTIdx) {
    var nCur = (curYear - 1900) * 24 + curTIdx;
    return {
      prevJD: solarTermJD(nCur),
      nextJD: solarTermJD(nCur + 2),
      prevName: TERM_NAMES[((nCur % 24) + 24) % 24],
      nextName: TERM_NAMES[(((nCur + 2) % 24) + 24) % 24]
    };
  }

  /* ================================================================
   * 四、干支核心
   * ================================================================ */

  // 干支组合序（0=甲子 … 59=癸亥）
  function gzSeq(g, z) {
    for (var i = 0; i < 60; i++) {
      if (i % 10 === g && i % 12 === z) return i;
    }
    return 0;
  }

  // 十神判定：日干 g 对某干 x
  function shiShen(g, x) {
    var wg = GAN_WX[g], wx = GAN_WX[x];
    var sameYinYang = (GAN_YINYANG[g] === GAN_YINYANG[x]);
    if (wx === wg) return sameYinYang ? '比肩' : '劫财';               // 同我
    if (WX_SHENG[wx] === wg) return sameYinYang ? '偏印' : '正印';     // 生我
    if (WX_SHENG[wg] === wx) return sameYinYang ? '食神' : '伤官';     // 我生
    if (WX_KE[wx] === wg) return sameYinYang ? '七杀' : '正官';        // 克我
    return sameYinYang ? '偏财' : '正财';                               // 我克
  }

  // 旬空亡：组合序所在旬 -> 空亡两支
  function xunKongWang(seq) {
    return XUN_KONGWANG_BY_SEQ[(seq - (seq % 10)) / 10];
  }

  // 日干 g 对地支 z 的十二长生（星运）
  function xingYun(g, z) { return CHANGSHENG[CS_TABLE[g][z]]; }

  // 纳音
  function nayin(seq) { return NAYIN[Math.floor(seq / 2)]; }

  /* ================================================================
   * 五、排盘引擎 paiPan
   * ================================================================ */

  /**
   * paiPan({ year, month, day, hour, minute, gender })
   * gender：'男'/'male'/1 或 '女'/'female'/0，缺省按男
   */
  function paiPan(input) {
    var y = input.year, m = input.month, d = input.day;
    var hour = input.hour || 0, minute = input.minute || 0;
    var genderRaw = input.gender, gender;         // 1 男 0 女
    if (typeof genderRaw === 'number') gender = genderRaw === 0 ? 0 : 1;
    else if (typeof genderRaw === 'string') {
      var gs = genderRaw.toLowerCase();
      gender = (genderRaw === '女' || gs === 'female' || gs === 'f' || gs === '0') ? 0 : 1;
    } else gender = 1;

    /* ---------- 月柱区间与年柱 ---------- */
    var loc = locateMonth(y, m, d, hour, minute);
    var birthJD = loc.birthJD;
    var yearIdx = ((loc.yearGanYear - 1984) % 60 + 60) % 60;   // 1984 = 甲子
    var yGan = yearIdx % 10, yZhi = yearIdx % 12;

    // 月支：月 num 0=寅 -> 支序 2
    var mZhi = (loc.monthNum + 2) % 12;
    // 月干（五虎遁）：月干 = (年干*2 + 月num + 2) mod 10
    var mGan = (yGan * 2 + loc.monthNum + 2) % 10;

    /* ---------- 日柱（锚点 2000-01-01 丁未；23 点晚子时进位次日） ---------- */
    var jdn = Math.floor(birthJD + 0.5);
    var dayJDN = (hour === 23) ? jdn + 1 : jdn;
    var daySeq = ((dayJDN + 49) % 60 + 60) % 60;   // (JDN+49) mod 60：1949-10-01=甲子，2000-01-01=戊午
    var dGan = daySeq % 10, dZhi = daySeq % 12;

    /* ---------- 时柱（五鼠遁） ---------- */
    var hZhi = Math.floor(((hour + 1) % 24) / 2);       // 23:00-00:59 -> 子
    var hGan = (dGan * 2 + hZhi) % 10;                  // 五鼠遁：时干 = 日干*2 + 时支（甲己日起甲子）

    var pillars = [
      { gan: yGan, zhi: yZhi }, { gan: mGan, zhi: mZhi },
      { gan: dGan, zhi: dZhi }, { gan: hGan, zhi: hZhi }
    ];

    /* ---------- 四柱信息（十神/藏干/纳音/星运/空亡）与五行统计 ---------- */
    var posName = ['年柱', '月柱', '日柱', '时柱'];
    var pillarArr = [];
    var wxScore = [0, 0, 0, 0, 0];
    var i, p, seq;

    for (i = 0; i < 4; i++) {
      p = pillars[i];
      seq = gzSeq(p.gan, p.zhi);
      var cg = CANGGAN[ZHI[p.zhi]];
      var cgList = [];
      for (var ci = 0; ci < 3; ci++) if (cg[ci]) cgList.push(cg[ci]);

      pillarArr.push({
        pos: posName[i],
        gan: GAN[p.gan],
        zhi: ZHI[p.zhi],
        gz: GAN[p.gan] + ZHI[p.zhi],
        shishen: (i === 2) ? '日主' : shiShen(dGan, p.gan),
        canggan: cgList,
        nayin: nayin(seq),
        xingyun: xingYun(dGan, p.zhi),
        kongwang: xunKongWang(seq),
        ganWuxing: WX_NAME[GAN_WX[p.gan]],
        zhiWuxing: WX_NAME[ZHI_WX[p.zhi]]
      });

      // 五行力度：天干各 +1；地支藏干：月令本气*2，其余本气*1，中气*0.5，余气*0.3
      wxScore[GAN_WX[p.gan]] += 1;
      for (ci = 0; ci < 3; ci++) {
        if (!cg[ci]) continue;
        var w = GAN_WX[GAN.indexOf(cg[ci])];
        wxScore[w] += (ci === 0) ? ((i === 1) ? 2 : 1) : (ci === 1 ? 0.5 : 0.3);
      }
    }

    // 五行个数（四舍五入）
    var wxCount = [0, 0, 0, 0, 0];
    for (i = 0; i < 5; i++) wxCount[i] = Math.round(wxScore[i]);

    /* ---------- 日主旺衰初判（月令 + 全局同党力度） ---------- */
    var dmWX = GAN_WX[dGan];
    var dmYinYang = GAN_YINYANG[dGan] === 0 ? '阳' : '阴';
    var tong = wxScore[dmWX] + wxScore[WX_SHENG[dmWX]];        // 同党：比劫 + 印
    var yi = 0;
    for (i = 0; i < 5; i++) if (i !== dmWX && i !== WX_SHENG[dmWX]) yi += wxScore[i];
    var ratio = tong / (tong + yi);
    var strength = ratio >= 0.65 ? '偏旺' : ratio >= 0.45 ? '中和' : ratio >= 0.30 ? '偏弱' : '过弱';
    var monthMain = CANGGAN[ZHI[mZhi]][0];
    var strengthText = '月令' + ZHI[mZhi] + '（' + WX_NAME[GAN_WX[GAN.indexOf(monthMain)]] + '主气），日主' +
      WX_NAME[dmWX] + '，同党（比劫+印）力度 ' + tong.toFixed(1) + ' / 总力度 ' + (tong + yi).toFixed(1) +
      '（占比 ' + Math.round(ratio * 100) + '%），初判：' + strength;

    /* ---------- 大运与起运（阳男阴女顺排，阴男阳女逆排） ---------- */
    var yearYang = GAN_YINYANG[yGan] === 0;
    var forward = (yearYang && gender === 1) || (!yearYang && gender === 0);
    var nb = neighborJie(loc.yearGanYear, loc.tIdx);
    var diffDays = forward ? (nb.nextJD - birthJD) : (birthJD - nb.prevJD);
    var qiYunShu = diffDays / 3;                       // 3 日折 1 年
    var qiYunShuRound = Math.round(qiYunShu);
    var monthSeq = gzSeq(mGan, mZhi);
    var dayun = [];
    for (var k = 1; k <= 8; k++) {
      var ds = ((monthSeq + (forward ? k : -k)) % 60 + 60) % 60;
      dayun.push({
        index: k,
        gz: GAN[ds % 10] + ZHI[ds % 12],
        gan: GAN[ds % 10],
        zhi: ZHI[ds % 12],
        startAge: qiYunShuRound + (k - 1) * 10,
        endAge: qiYunShuRound + (k - 1) * 10 + 9,
        shishen: shiShen(dGan, ds % 10)
      });
    }

    // 流年（当前年起 9 年）
    var nowYear = new Date().getFullYear();
    var liunian = [];
    for (i = 0; i < 9; i++) {
      var lIdx = ((nowYear + i - 1984) % 60 + 60) % 60;
      liunian.push({ year: nowYear + i, gz: GAN[lIdx % 10] + ZHI[lIdx % 12], shishen: shiShen(dGan, lIdx % 10) });
    }

    var weekName = ['日', '一', '二', '三', '四', '五', '六'][(jdn + 1) % 7];
    var lichunJD = yearTermJD(loc.yearGanYear, 2);

    return {
      // 输入回显
      input: { year: y, month: m, day: d, hour: hour, minute: minute, gender: gender === 1 ? '男' : '女' },
      // 四柱字符串，如 "丙午 丙申 庚申 癸未"
      bazi: pillarArr.map(function (pp) { return pp.gz; }).join(' '),
      // 四柱明细（顺序：年月日时）
      pillars: pillarArr,
      // 日主
      dayGan: GAN[dGan],
      dayMaster: { wuxing: WX_NAME[dmWX], yinyang: dmYinYang, name: WX_NAME[dmWX] + (dmYinYang === '阳' ? '阳' : '阴') + '·' + GAN[dGan] },
      // 五行力度与个数
      wuxingScore: { '木': wxScore[0], '火': wxScore[1], '土': wxScore[2], '金': wxScore[3], '水': wxScore[4] },
      wuxingCount: { '木': wxCount[0], '火': wxCount[1], '土': wxCount[2], '金': wxCount[3], '水': wxCount[4] },
      // 日主旺衰初判
      dayStrength: { level: strength, ratio: Math.round(ratio * 100) / 100, detail: strengthText, monthZhi: ZHI[mZhi] },
      // 大运（8 步）
      dayun: dayun,
      dayunInfo: {
        direction: forward ? '顺排' : '逆排',
        qiYunSui: qiYunShuRound,
        qiYunSuiExact: Math.round(qiYunShu * 100) / 100,
        baseTerm: forward ? nb.nextName : nb.prevName,
        baseTermTime: jdStr(forward ? nb.nextJD : nb.prevJD)
      },
      // 流年
      liunian: liunian,
      // 历法辅助信息
      calendar: {
        jieName: loc.jieName, jieTime: jdStr(loc.jieJD),
        monthName: YUEMING[loc.monthNum], monthZhi: ZHI[mZhi],
        shengxiao: SHENGXIAO[yZhi], week: '星期' + weekName,
        lichunTime: jdStr(lichunJD)
      },
      // 人元司令分野（月支）
      fenye: FENYE[ZHI[mZhi]],
      // 日柱空亡（传统主用）
      kongwangDay: xunKongWang(gzSeq(dGan, dZhi))
    };
  }

  /* ================================================================
   * 六、UI 渲染 render(el, result)
   *   CSS 类名：bazi-root / bazi-title / bazi-sub / bazi-pillars-row / bazi-pillar-card /
   *   bazi-pillar-pos / bazi-ss-tag / bazi-gan / bazi-zhi / bazi-wx-木|火|土|金|水 /
   *   bazi-canggan / bazi-nayin / bazi-xingyun / bazi-kongwang / bazi-strength /
   *   bazi-radar-wrap / bazi-radar / bazi-radar-grid / bazi-radar-axis / bazi-radar-poly /
   *   bazi-radar-label / bazi-radar-value / bazi-radar-miss / bazi-dayun / bazi-dayun-title /
   *   bazi-dayun-scroll / bazi-dayun-card / bazi-dayun-age / bazi-dayun-gz / bazi-dayun-ss
   *   模块自动注入基础样式（<style id="bazi-pro-injected-style">），外部可同名覆盖。
   * ================================================================ */

  var STYLE_ID = 'bazi-pro-injected-style';
  function ensureStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '.bazi-root{font-family:' + THEME.fontFamily + ';background:' + THEME.bg + ';color:' + THEME.ink + ';padding:16px;border:1px solid #d8d0bc;border-radius:10px;max-width:720px;margin:0 auto;}',
      '.bazi-title{text-align:center;font-size:18px;letter-spacing:4px;color:' + THEME.gold + ';margin:2px 0 12px;}',
      '.bazi-sub{text-align:center;font-size:12px;color:#6b6353;margin-bottom:12px;}',
      '.bazi-pillars-row{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;}',
      '.bazi-pillar-card{background:#fffdf6;border:1px solid #cfc6ac;border-radius:8px;padding:8px 10px;min-width:88px;text-align:center;box-shadow:0 1px 2px rgba(90,75,40,.08);}',
      '.bazi-pillar-pos{font-size:12px;color:#8a7f66;margin-bottom:4px;letter-spacing:2px;}',
      '.bazi-ss-tag{display:inline-block;font-size:11px;color:' + THEME.gold + ';border:1px solid #c9a86a;border-radius:4px;padding:0 4px;margin-bottom:4px;background:#faf5e6;}',
      '.bazi-gan,.bazi-zhi{font-size:30px;line-height:1.25;font-weight:700;display:block;}',
      '.bazi-wx-木{color:#3a7d44;}.bazi-wx-火{color:#c0392b;}.bazi-wx-土{color:#8b5a2b;}',
      '.bazi-wx-金{color:#7f8c8d;background:#e3e4e6;border-radius:4px;margin:0 6px;}',
      '.bazi-wx-水{color:#2b3a55;}',
      '.bazi-canggan{font-size:12px;color:#7a7160;margin-top:4px;letter-spacing:2px;}',
      '.bazi-nayin{font-size:11px;color:#9c8a5f;margin-top:2px;}',
      '.bazi-xingyun{font-size:11px;color:' + THEME.gold + ';margin-top:2px;}',
      '.bazi-kongwang{font-size:11px;color:#b0543a;margin-top:2px;}',
      '.bazi-strength{margin:14px 6px 6px;font-size:13px;color:#5c5341;line-height:1.7;}',
      '.bazi-radar-wrap{display:flex;justify-content:center;margin:8px 0 4px;}',
      '.bazi-radar-label{font-size:14px;fill:' + THEME.ink + ';font-family:' + THEME.fontFamily + ';}',
      '.bazi-radar-value{font-size:12px;fill:' + THEME.gold + ';font-family:' + THEME.fontFamily + ';}',
      '.bazi-radar-miss{font-size:13px;fill:#c0392b;font-weight:bold;font-family:' + THEME.fontFamily + ';}',
      '.bazi-dayun{margin-top:10px;}',
      '.bazi-dayun-title{font-size:13px;color:' + THEME.gold + ';margin:6px 4px;letter-spacing:2px;}',
      '.bazi-dayun-scroll{display:flex;gap:8px;overflow-x:auto;padding:6px 2px 10px;}',
      '.bazi-dayun-card{flex:0 0 auto;min-width:72px;text-align:center;background:#fffdf6;border:1px solid #cfc6ac;border-radius:8px;padding:6px 8px;}',
      '.bazi-dayun-age{font-size:11px;color:#8a7f66;}',
      '.bazi-dayun-gz{font-size:22px;font-weight:700;margin:2px 0;}',
      '.bazi-dayun-ss{font-size:11px;color:' + THEME.gold + ';}'
    ].join('');
    document.head.appendChild(st);
  }

  function wxClass(ch) { return 'bazi-wx-' + ch; }   // 如 bazi-wx-木

  // 五行着色的干支字符
  function coloredGan(ch) {
    return '<span class="bazi-gan ' + wxClass(WX_NAME[GAN_WX[GAN.indexOf(ch)]]) + '">' + ch + '</span>';
  }
  function coloredZhi(ch) {
    return '<span class="bazi-zhi ' + wxClass(WX_NAME[ZHI_WX[ZHI.indexOf(ch)]]) + '">' + ch + '</span>';
  }

  // 单柱竖排卡片：天干上、地支下，附十神/藏干/纳音/星运/空亡
  function pillarCardHTML(p) {
    var h = '<div class="bazi-pillar-card">';
    h += '<div class="bazi-pillar-pos">' + p.pos + '</div>';
    h += '<div><span class="bazi-ss-tag">' + p.shishen + '</span></div>';
    h += coloredGan(p.gan);
    h += coloredZhi(p.zhi);
    h += '<div class="bazi-canggan">' + (p.canggan.join(' ') || '—') + '</div>';
    h += '<div class="bazi-nayin">' + p.nayin + '</div>';
    h += '<div class="bazi-xingyun">' + p.xingyun + '</div>';
    h += '<div class="bazi-kongwang">空:' + p.kongwang + '</div>';
    h += '</div>';
    return h;
  }

  // 五行雷达图（SVG 正五边形，顶点顺序：木火土金水，顶部起顺时针；缺项红标「缺」）
  function radarSVG(result) {
    var cx = 110, cy = 105, R = 78;
    var keys = ['木', '火', '土', '金', '水'];
    var vals = keys.map(function (k) { return result.wuxingCount[k]; });
    var maxV = Math.max.apply(null, vals.concat([1]));
    var i;
    var s = '<svg class="bazi-radar" width="220" height="210" viewBox="0 0 220 210" xmlns="http://www.w3.org/2000/svg">';
    for (var lv = 1; lv <= 4; lv++) {                       // 网格（4 层）
      var gpts = [];
      for (i = 0; i < 5; i++) {
        var ag = (90 - 72 * i) * Math.PI / 180, rr = R * lv / 4;
        gpts.push((cx + rr * Math.cos(ag)).toFixed(1) + ',' + (cy - rr * Math.sin(ag)).toFixed(1));
      }
      s += '<polygon class="bazi-radar-grid" points="' + gpts.join(' ') + '" fill="none" stroke="#d8d0bc" stroke-width="1"/>';
    }
    for (i = 0; i < 5; i++) {                               // 轴线
      var a0 = (90 - 72 * i) * Math.PI / 180;
      s += '<line class="bazi-radar-axis" x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R * Math.cos(a0)).toFixed(1) + '" y2="' + (cy - R * Math.sin(a0)).toFixed(1) + '" stroke="#d8d0bc" stroke-width="1"/>';
    }
    var dpts = [];                                          // 数据多边形
    for (i = 0; i < 5; i++) {
      var r = R * vals[i] / maxV, a1 = (90 - 72 * i) * Math.PI / 180;
      dpts.push((cx + r * Math.cos(a1)).toFixed(1) + ',' + (cy - r * Math.sin(a1)).toFixed(1));
    }
    s += '<polygon class="bazi-radar-poly" points="' + dpts.join(' ') + '" fill="rgba(139,105,20,.25)" stroke="' + THEME.gold + '" stroke-width="1.5"/>';
    for (i = 0; i < 5; i++) {                               // 标签 / 数值 / 缺项
      var a2 = (90 - 72 * i) * Math.PI / 180;
      var lx = cx + (R + 16) * Math.cos(a2), ly = cy - (R + 16) * Math.sin(a2);
      s += '<text class="bazi-radar-label" x="' + lx.toFixed(1) + '" y="' + (ly + 5).toFixed(1) + '" text-anchor="middle">' + keys[i] + '</text>';
      if (vals[i] === 0) {
        s += '<text class="bazi-radar-miss" x="' + lx.toFixed(1) + '" y="' + (ly + 19).toFixed(1) + '" text-anchor="middle">缺</text>';
      } else {
        s += '<text class="bazi-radar-value" x="' + lx.toFixed(1) + '" y="' + (ly + 19).toFixed(1) + '" text-anchor="middle">' + vals[i] + '</text>';
      }
    }
    s += '</svg>';
    return s;
  }

  // 大运时间轴（横向滚动，8 步：干支 + 起运年龄 + 十神标注）
  function dayunHTML(result) {
    var info = result.dayunInfo;
    var h = '<div class="bazi-dayun">';
    h += '<div class="bazi-dayun-title">大运（' + info.direction + ' · ' + info.qiYunSui + ' 岁起运 · 基准节气：' + info.baseTerm + ' ' + info.baseTermTime + '）</div>';
    h += '<div class="bazi-dayun-scroll">';
    result.dayun.forEach(function (dy) {
      h += '<div class="bazi-dayun-card">';
      h += '<div class="bazi-dayun-age">' + dy.startAge + '–' + dy.endAge + '岁</div>';
      h += '<div class="bazi-dayun-gz"><span class="' + wxClass(WX_NAME[GAN_WX[GAN.indexOf(dy.gan)]]) + '">' + dy.gan + '</span><span class="' + wxClass(WX_NAME[ZHI_WX[ZHI.indexOf(dy.zhi)]]) + '">' + dy.zhi + '</span></div>';
      h += '<div class="bazi-dayun-ss">' + dy.shishen + '</div>';
      h += '</div>';
    });
    h += '</div></div>';
    return h;
  }

  // 主渲染入口：顶部四柱竖排卡片 -> 中部五行雷达 -> 底部大运时间轴
  function render(el, result) {
    if (!el || !result || typeof document === 'undefined') return;
    ensureStyle();
    var root = document.createElement('div');
    root.className = 'bazi-root';
    var h = '';
    h += '<div class="bazi-title">四柱八字</div>';
    h += '<div class="bazi-sub">' + result.input.year + '年' + result.input.month + '月' + result.input.day + '日 ' +
      pad2(result.input.hour) + ':' + pad2(result.input.minute) + ' · ' + result.input.gender +
      ' · ' + result.bazi + ' · 生肖' + result.calendar.shengxiao + '</div>';
    h += '<div class="bazi-pillars-row">';
    result.pillars.forEach(function (p) { h += pillarCardHTML(p); });
    h += '</div>';
    h += '<div class="bazi-strength"><b>日主</b>：' + result.dayMaster.name +
      '　<b>旺衰初判</b>：' + result.dayStrength.level + '（' + result.dayStrength.detail + '）</div>';
    h += '<div class="bazi-radar-wrap">' + radarSVG(result) + '</div>';
    h += dayunHTML(result);
    root.innerHTML = h;
    el.innerHTML = '';
    el.appendChild(root);
  }

  /* ================================================================
   * 七、自验证 selfTest
   * ================================================================ */

  function selfTest() {
    var cases = [
      { name: '2026-08-14 14:22 男', input: { year: 2026, month: 8, day: 14, hour: 14, minute: 22, gender: '男' }, expected: '丙午 丙申 庚申 癸未' },
      { name: '2026-08-14 12:22 男', input: { year: 2026, month: 8, day: 14, hour: 12, minute: 22, gender: '男' }, expected: '丙午 丙申 庚申 壬午' },
      { name: '1984-02-05 06:00 女（立春分界+换月；注：真实历法日柱为己巳，任务原期望己卯与前言示例①庚申日历法体系矛盾，按权威历法修正）', input: { year: 1984, month: 2, day: 5, hour: 6, minute: 0, gender: '女' }, expected: '甲子 丙寅 己巳 丁卯' },
      { name: '2000-01-01 00:30（早子时+立春前跨年；注：真实历法日柱戊午、时柱壬子，已按权威历法修正）', input: { year: 2000, month: 1, day: 1, hour: 0, minute: 30, gender: '男' }, expected: '己卯 丙子 戊午 壬子' },
      { name: '2000-01-01 23:30（晚子时：23 点起日柱进位次日）', input: { year: 2000, month: 1, day: 1, hour: 23, minute: 30, gender: '男' }, expected: '己卯 丙子 己未 甲子' },
      { name: '1990-05-15 10:00 男', input: { year: 1990, month: 5, day: 15, hour: 10, minute: 0, gender: '男' }, expected: '庚午 辛巳 庚辰 辛巳' }
    ];
    var out = [], allPass = true;
    cases.forEach(function (c) {
      var actual = paiPan(c.input).bazi;
      var ok = actual === c.expected;
      if (!ok) allPass = false;
      out.push({
        name: c.name,
        input: c.input.year + '-' + c.input.month + '-' + c.input.day + ' ' + c.input.hour + ':' + (c.input.minute || 0) + ' ' + c.input.gender,
        expected: c.expected,
        actual: actual,
        ok: ok
      });
    });
    return { passed: allPass, cases: out };
  }

  /* ================================================================
   * 八、导出
   * ================================================================ */

  var BaziPro = {
    paiPan: paiPan,
    render: render,
    selfTest: selfTest,
    // 辅助导出（便于二次开发 / 单元测试）
    solarTermJD: solarTermJD,
    yearTermJD: yearTermJD,
    gzSeq: gzSeq,
    shiShen: shiShen,
    xingYun: xingYun,
    nayin: nayin,
    GAN: GAN, ZHI: ZHI, WX_NAME: WX_NAME,
    CANGGAN: CANGGAN, NAYIN: NAYIN, CHANGSHENG: CHANGSHENG,
    TERM_NAMES: TERM_NAMES, THEME: THEME
  };

  global.BaziPro = BaziPro;
  if (typeof module !== 'undefined' && module.exports) module.exports = BaziPro;

})(typeof window !== 'undefined' ? window : globalThis);