/**
 * 紫微斗数模块（十三宫奇门遁甲 APP · ZiWeiPro）
 *
 * 引擎：开源库 iztro（UMD 构建 vendor/iztro.min.js，浏览器全局变量 iztro，纯前端离线可用）
 *       获取方式：https://cdn.jsdelivr.net/npm/iztro@latest/lib/index.global.min.js（本地已缓存于 vendor/）
 *       开源仓库 https://github.com/SylarLong/iztro  文档 https://iztro.com
 * 挂载：window.ZiWeiPro = { available, error, version, paiPan, render, selfTest }
 * 兼容：window.FeaturesZiwei 为同一对象别名（旧接口 render(result) 单参调用返回 HTML 字符串）
 * 引入顺序：浏览器中 vendor/iztro.min.js 需在本文件之前加载；Node 环境由本文件自动 require 并补 self 宿主
 *
 * paiPan(input)：入参 { year, month, day, hour, minute, gender, name? }（公历生日，gender:'男'|'女'）
 * render(el, result)：将命盘写入 el（DOM 元素或 id 字符串）并返回该元素；render(result) 兼容旧调用返回 HTML 字符串
 * selfTest()：结构自检（标准案例 2000-01-01 00:00 男），返回 { passed, cases }
 */
(function (global) {
  'use strict';

  /* ==================== 常量定义 ==================== */

  // 版本标识（iztro UMD 构建，vendor/iztro.min.js 约 768KB）
  var VERSION = 'ZiWeiPro/1.0 (iztro@2.6.x)';

  // 四化 → CSS 修饰类（禄绿 权橙 科蓝 忌红，小字上标）
  var MUTAGEN_CLASS = { '禄': 'lu', '权': 'quan', '科': 'ke', '忌': 'ji' };

  // 空亡类星曜（iztro 以杂耀形式安星，逐宫归并到“空亡”字段）
  var KONG_STARS = { '空亡': 1, '旬空': 1, '天空': 1, '截空': 1, '截路': 1 };

  // 十二地支固定顺序（iztro palaces 索引：0=寅 … 11=丑，标准逆时针排布）
  var BRANCH_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

  // 最近一次引擎错误信息（供 available=false 降级时暴露）
  var lastError = '';

  /* ==================== iztro 加载（浏览器全局 / Node require） ==================== */

  /**
   * 获取 iztro 库实例：
   * 浏览器：优先取 UMD 全局变量 window.iztro；
   * Node（单元测试）：require vendor 构建（UMD 以 self 为宿主对象，需先补齐 globalThis.self）。
   */
  function loadIztro() {
    var host = global && typeof global === 'object' ? global : globalThis;
    if (host && host.iztro) return host.iztro;
    if (typeof globalThis !== 'undefined' && globalThis.iztro) return globalThis.iztro;
    if (typeof require === 'function') {
      try {
        if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;
        var mod = require('../vendor/iztro.min.js');
        var iz = mod && mod.astro ? mod : (mod && mod.default && mod.default.astro ? mod.default : null);
        if (iz) { host.iztro = iz; return iz; }
        lastError = 'vendor/iztro.min.js 导出结构异常（缺 astro 命名空间）';
      } catch (e) {
        lastError = (e && e.message) || String(e);
      }
    } else {
      lastError = 'iztro 未加载：请先引入 vendor/iztro.min.js（须位于 js/ziwei.js 之前）';
    }
    return null;
  }

  /* ==================== 工具函数 ==================== */

  /**
   * 出生小时 → iztro 时辰索引（timeIndex 0-12）
   * 0=早子时(00:00-01:00) 1=丑 2=寅 … 6=午(11:00-13:00) … 11=亥 12=晚子时(23:00-24:00)
   */
  function hourToTimeIndex(hour) {
    var h = ((Number(hour) % 24) + 24) % 24;
    if (h === 23) return 12; // 晚子时
    if (h === 0) return 0;   // 早子时
    return Math.floor((h + 1) / 2);
  }

  // 星曜瘦身（仅保留名称 / 亮度 / 生年四化标记）
  function starLite(s) {
    return {
      name: (s && s.name) || '',
      brightness: (s && s.brightness) || '',
      mutagen: (s && s.mutagen) || ''
    };
  }

  // HTML 转义
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 补零
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* ==================== 排盘引擎（适配层） ==================== */

  /**
   * 紫微斗数排盘（公历输入 → iztro.astro.bySolar）
   * @param {Object} input { year, month, day, hour, minute, gender, name? }
   * @returns {Object} 统一结果：英文标识符为主，附中文键别名；raw 为 iztro 原始结果
   */
  function paiPan(input) {
    var iz = loadIztro();
    if (!iz || !iz.astro) {
      throw new Error('[ziwei] iztro 引擎不可用：' + (lastError || '未知错误'));
    }
    if (!input || !input.year || !input.month || !input.day) {
      throw new Error('[ziwei] 入参缺失：需要 { year, month, day, hour, minute, gender }（公历生日）');
    }

    var year = Number(input.year), month = Number(input.month), day = Number(input.day);
    var hour = Number(input.hour || 0), minute = Number(input.minute || 0);
    var gender = input.gender === '女' ? '女' : '男';
    var personName = input.name || input['姓名'] || '';
    var timeIndex = hourToTimeIndex(hour);

    // iztro 入参：公历日期串、时辰索引、性别、是否闰月修正、语言
    var astrolabe;
    try {
      astrolabe = iz.astro.bySolar(year + '-' + month + '-' + day, timeIndex, gender, true, 'zh-CN');
    } catch (e) {
      lastError = (e && e.message) || String(e);
      throw new Error('[ziwei] iztro 排盘失败：' + lastError);
    }
    if (!astrolabe || !astrolabe.palaces || astrolabe.palaces.length !== 12) {
      throw new Error('[ziwei] 排盘失败：iztro 返回宫位数量异常');
    }

    // —— 十二宫映射（英文键 + 中文键别名 + 旧版兼容键） ——
    var palaces = astrolabe.palaces.map(function (p) {
      var majorStars = (p.majorStars || []).map(starLite);
      var minorStars = (p.minorStars || []).map(starLite);
      var adjectiveStars = (p.adjectiveStars || []).map(starLite);

      // 本宫四化 map：主星+辅星中带生年四化标记的星（文曲等辅星亦可化忌）
      var mutagens = {};
      var transformations = [];
      majorStars.concat(minorStars).forEach(function (s) {
        if (s.mutagen && MUTAGEN_CLASS[s.mutagen]) {
          mutagens[s.mutagen] = s.name;
          transformations.push({ star: s.name, type: s.mutagen });
        }
      });

      // 空亡：归并本宫杂耀中的空亡类星曜（iztro 安星：空亡/旬空/天空/截路等）
      var kong = [];
      adjectiveStars.forEach(function (s) { if (KONG_STARS[s.name]) kong.push(s.name); });

      var dec = p.decadal || {};
      var daXian = dec.range ? dec.range[0] + '-' + dec.range[1] : '';
      var ages = (Array.isArray(p.ages) ? p.ages : []).filter(function (a) { return typeof a === 'number'; });

      return {
        idx: p.index,                          // 0-11（寅→丑）
        name: p.name,                          // 宫职名（命宫/兄弟/夫妻/子女/财帛/疾厄/迁移/仆役/官禄/田宅/福德/父母）
        isBodyPalace: !!p.isBodyPalace,        // 是否身宫
        heavenlyStem: p.heavenlyStem,          // 宫干
        earthlyBranch: p.earthlyBranch,        // 宫支
        majorStars: majorStars,                // 主星（含亮度/四化）
        minorStars: minorStars,                // 辅星（六吉六煞/禄存/天马等）
        adjectiveStars: adjectiveStars,        // 杂耀
        mutagens: mutagens,                    // 四化 map（本宫）{禄|权|科|忌: 星名}
        kongWang: kong.join(' '),              // 空亡（本宫空亡类星曜名）
        decadal: {                             // 大限对象
          range: dec.range || null,
          heavenlyStem: dec.heavenlyStem || '',
          earthlyBranch: dec.earthlyBranch || ''
        },
        smallLimit: ages,                      // 小限虚岁列表
        // —— 中文键别名（任务规范字段） ——
        '是身宫': !!p.isBodyPalace,
        '天干': p.heavenlyStem,
        '地支': p.earthlyBranch,
        '大限': daXian,
        '小限': ages,
        '主星': majorStars,
        '辅星': minorStars,
        '杂耀': adjectiveStars,
        '四化': mutagens,
        '空亡': kong.join(' '),
        // —— 旧版兼容字段（tests/ziwei.test.js / zw-preview.html） ——
        role: p.name,
        isSoul: p.name === '命宫',
        isBody: !!p.isBodyPalace,
        transformations: transformations,      // [{star, type:'禄|权|科|忌'}]
        daXianRange: daXian                    // 大限虚岁区间 '起-止'
      };
    });

    // 命宫/身宫索引
    var soulIndex = -1, bodyIndex = -1;
    palaces.forEach(function (p, i) {
      if (p.isSoul && soulIndex < 0) soulIndex = i;
      if (p.isBody && bodyIndex < 0) bodyIndex = i;
    });

    // 生年四化全局归并（恰好四颗）
    var siHua = {};
    palaces.forEach(function (p) {
      p.transformations.forEach(function (t) { siHua[t.type] = t.star; });
    });

    var rawLunar = (astrolabe.rawDates && astrolabe.rawDates.lunarDate) || {};
    var lunarText = astrolabe.lunarDate || '';
    var solarText = year + '-' + pad2(month) + '-' + pad2(day) + ' ' + pad2(hour) + ':' + pad2(minute);
    var soulBranch = soulIndex >= 0 ? palaces[soulIndex].earthlyBranch : (astrolabe.earthlyBranchOfSoulPalace || '');
    var bodyBranch = bodyIndex >= 0 ? palaces[bodyIndex].earthlyBranch : (astrolabe.earthlyBranchOfBodyPalace || '');

    return {
      raw: astrolabe,                              // iztro 原始结果（含方法与全部字段）
      name: personName, '姓名': personName,
      solarDate: solarText, solarDateText: solarText, '阳历': solarText,
      lunarDate: {                                  // 结构化农历（旧版兼容）
        lunarYear: rawLunar.lunarYear || null,
        lunarMonth: rawLunar.lunarMonth || null,
        lunarDay: rawLunar.lunarDay || null,
        isLeap: !!rawLunar.isLeap,
        text: lunarText
      },
      lunarDateText: lunarText, '农历': lunarText,
      chineseDate: astrolabe.chineseDate || '', '四柱': astrolabe.chineseDate || '',
      soul: astrolabe.soul || '', '命主': astrolabe.soul || '',
      body: astrolabe.body || '', '身主': astrolabe.body || '',
      soulPalace: soulBranch, bodyPalace: bodyBranch,
      '命宫位置': soulBranch ? soulBranch + '宫' : '',
      fiveElementClass: astrolabe.fiveElementsClass || '', '五行局': astrolabe.fiveElementsClass || '',
      siHua: siHua,                                 // 生年四化 {禄|权|科|忌: 星名}
      palaces: palaces, '十二宫': palaces,
      soulIndex: soulIndex, bodyIndex: bodyIndex,
      gender: gender, zodiac: astrolabe.zodiac || '', timeRange: astrolabe.timeRange || '',
      timeIndex: timeIndex, algorithmVersion: VERSION
    };
  }
  /* ==================== 命盘 UI（标准 4×4 十二宫方格） ==================== */

  // 自注入样式（首次渲染注入一次；宣纸白/墨色/暗金配色，楷体，窄屏字号缩放）
  var STYLE_ID = 'zw-style';
  var STYLE_TEXT = [
    '.zw-wrap{margin:12px 0;font-family:"KaiTi","STKaiti","楷体","BiauKai",serif;color:#2b2420;color:var(--zw-ink,#2b2420)}',
    '.zw-title{font-size:15px;font-weight:700;text-align:center;letter-spacing:4px;color:#8b6914;color:var(--zw-gold,#8b6914);margin-bottom:8px}',
    '.zw-table{width:100%;border-collapse:collapse;table-layout:fixed;background:#f5f2e9;border:2px solid #574c3d}',
    '.zw-table td{border:1px solid #574c3d;background:#fbf8ef;vertical-align:top;height:120px;padding:3px 3px 36px;overflow:hidden;position:relative}',
    '.zw-table .zw-cell--soul{box-shadow:inset 0 0 0 2px #8b6914}',
    '.zw-head{display:flex;align-items:center;gap:3px;border-bottom:1px dashed rgba(139,105,20,.35);padding-bottom:1px;margin-bottom:2px}',
    '.zw-name{font-size:11px;letter-spacing:1px;color:#4a4032;white-space:nowrap}',
    '.zw-table .zw-cell--soul .zw-name{color:#8b6914;font-weight:700}',
    '.zw-body-tag{font-size:9px;line-height:1.25;color:#8b6914;border:1px solid #8b6914;border-radius:2px;padding:0 2px;flex-shrink:0}',
    '.zw-major{font-size:13px;font-weight:700;line-height:1.35;white-space:nowrap}',
    '.zw-star{color:#b03a2e}',
    '.zw-bri{font-size:9px;font-weight:400;color:#8a7d6b}',
    '.zw-mut{font-size:9px;font-weight:700;line-height:1;margin-left:1px}',
    '.zw-mut--lu{color:#2e7d32}',
    '.zw-mut--quan{color:#e65100}',
    '.zw-mut--ke{color:#1565c0}',
    '.zw-mut--ji{color:#c62828}',
    '.zw-empty{font-size:11px;color:#a3947c;line-height:1.5}',
    '.zw-minor{font-size:10px;line-height:1.5;color:#6f6455;max-height:3em;overflow:hidden}',
    '.zw-adjective{font-size:9px;line-height:1.4;color:#9a8d78;max-height:2.8em;overflow:hidden}',
    '.zw-foot{position:absolute;left:3px;right:3px;bottom:2px}',
    '.zw-decadal{font-size:9px;color:#7a6f5e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.zw-ganzhi{color:#8b6914;font-weight:700}',
    '.zw-age{font-size:8px;line-height:1.3;color:#8d8271;word-break:break-all;max-height:2.6em;overflow:hidden}',
    '.zw-table .zw-center{background:linear-gradient(160deg,#f7f1de,#f0e9d4);vertical-align:middle;text-align:center;padding:8px 4px}',
    '.zw-center-title{font-size:15px;font-weight:700;letter-spacing:6px;color:#8b6914}',
    '.zw-center-name{font-size:11px;color:#4a4032;margin:3px 0}',
    '.zw-center-row{font-size:10px;line-height:1.75;color:#6f6455;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.zw-center-row b{color:#2b2420;font-weight:700}',
    '.zw-legend{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:10px;color:#8d8271;margin-top:6px;align-items:center;line-height:1.6}',
    '.zw-legend b{font-weight:700}',
    '.zw-legend .zw-body-tag{margin:0 2px}',
    '@media (max-width:420px){',
    '  .zw-table td{height:108px;padding:2px 2px 38px}',
    '  .zw-name{font-size:10px}',
    '  .zw-major{font-size:11px}',
    '  .zw-bri,.zw-mut{font-size:8px}',
    '  .zw-minor{font-size:9px;max-height:2.7em}',
    '  .zw-adjective{font-size:8px}',
    '  .zw-decadal{font-size:8px}',
    '  .zw-age{font-size:7px}',
    '  .zw-center-title{font-size:13px}',
    '  .zw-center-name{font-size:10px}',
    '  .zw-center-row{font-size:9px;line-height:1.6}',
    '}'
  ].join('\n');

  function ensureStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.type = 'text/css';
    style.textContent = STYLE_TEXT;
    (document.head || document.getElementsByTagName('head')[0]).appendChild(style);
  }

  // 四化小字上标（禄绿 权橙 科蓝 忌红）
  function mutSup(s) {
    if (s.mutagen && MUTAGEN_CLASS[s.mutagen]) {
      return '<sup class="zw-mut zw-mut--' + MUTAGEN_CLASS[s.mutagen] + '">' + esc(s.mutagen) + '</sup>';
    }
    return '';
  }

  // 渲染单个宫格：顶部宫名+身宫标记 / 中列主星(红字)+四化上标+辅星杂耀灰小字 / 底部大限小限干支
  function cellHtml(p) {
    var html = '<td class="zw-cell' + (p.isSoul ? ' zw-cell--soul' : '') + '">';
    html += '<div class="zw-head"><span class="zw-name">' + esc(p.name) + '</span>' +
      (p.isBodyPalace ? '<span class="zw-body-tag">身宫</span>' : '') + '</div>';
    if (p.majorStars && p.majorStars.length) {
      p.majorStars.forEach(function (s) {
        html += '<div class="zw-major"><span class="zw-star">' + esc(s.name) + '</span>' +
          (s.brightness ? '<span class="zw-bri">' + esc(s.brightness) + '</span>' : '') +
          mutSup(s) + '</div>';
      });
    } else {
      html += '<div class="zw-empty">空宫</div>';
    }
    if (p.minorStars && p.minorStars.length) {
      html += '<div class="zw-minor">' + p.minorStars.map(function (s) {
        return '<span>' + esc(s.name) + '</span>' + mutSup(s);
      }).join(' ') + '</div>';
    }
    if (p.adjectiveStars && p.adjectiveStars.length) {
      html += '<div class="zw-adjective">' + p.adjectiveStars.map(function (s) { return esc(s.name); }).join(' ') + '</div>';
    }
    html += '<div class="zw-foot">';
    html += '<div class="zw-decadal">大限 ' + esc(p.daXianRange || '—') +
      ' <span class="zw-ganzhi">' + esc((p.heavenlyStem || '') + (p.earthlyBranch || '')) + '</span></div>';
    html += '<div class="zw-age">小限 ' + esc((p.smallLimit || []).join('·') || '—') + '</div>';
    html += '</div></td>';
    return html;
  }

  // 中宫信息区（2×2）：命主身主 + 姓名 + 农历生辰 + 五行局
  function centerHtml(r) {
    var name = r.name || r['姓名'] || '—';
    var html = '<div class="zw-center-title">紫微命盘</div>';
    html += '<div class="zw-center-name">' + esc(name) + ' · ' + esc(r.gender || '—') +
      (r.zodiac ? ' · ' + esc(r.zodiac) : '') + '</div>';
    html += '<div class="zw-center-row">命主 <b>' + esc(r.soul || '—') + '</b>　身主 <b>' + esc(r.body || '—') + '</b></div>';
    html += '<div class="zw-center-row">五行局 <b>' + esc(r.fiveElementClass || '—') + '</b></div>';
    html += '<div class="zw-center-row">农历 ' + esc(r.lunarDateText || '—') + '</div>';
    html += '<div class="zw-center-row">阳历 ' + esc(r.solarDateText || r.solarDate || '—') + '</div>';
    if (r.chineseDate) html += '<div class="zw-center-row">四柱 ' + esc(r.chineseDate) + '</div>';
    return html;
  }

  // 底部图例：四化配色说明
  function legendHtml() {
    return '<div class="zw-legend">' +
      '<span>四化：</span>' +
      '<b style="color:#2e7d32">禄</b><b style="color:#e65100">权</b>' +
      '<b style="color:#1565c0">科</b><b style="color:#c62828">忌</b>' +
      '<span>｜主星红字</span>' +
      '<span>｜<span class="zw-body-tag">身宫</span>标记</span>' +
      '</div>';
  }

  /**
   * 生成命盘 HTML（4×4 方格，左上起巳，十二地支逆时针环绕）
   * 行布局：巳午未申 / 辰+中宫(2×2)+酉 / 卯+中宫续+戌 / 寅丑子亥
   */
  function renderHtml(result) {
    ensureStyle();
    var html = '<div class="zw-wrap">';
    html += '<div class="zw-title">紫微命盘</div>';
    if (!result || !result.palaces || result.palaces.length !== 12) {
      html += '<div style="font-size:12px;color:#8d8271;text-align:center;padding:16px 0">暂无排盘数据</div></div>';
      return html;
    }
    var P = result.palaces; // P[0]=寅 … P[11]=丑（iztro 固定序）
    html += '<table class="zw-table"><tbody>';
    html += '<tr>' + cellHtml(P[3]) + cellHtml(P[4]) + cellHtml(P[5]) + cellHtml(P[6]) + '</tr>';
    html += '<tr>' + cellHtml(P[2]) +
      '<td class="zw-center" colspan="2" rowspan="2">' + centerHtml(result) + '</td>' +
      cellHtml(P[7]) + '</tr>';
    html += '<tr>' + cellHtml(P[1]) + cellHtml(P[8]) + '</tr>';
    html += '<tr>' + cellHtml(P[0]) + cellHtml(P[11]) + cellHtml(P[10]) + cellHtml(P[9]) + '</tr>';
    html += '</tbody></table>';
    html += legendHtml();
    html += '</div>';
    return html;
  }

  /**
   * 渲染命盘到指定容器
   * render(el, result)：el 为 DOM 元素或 id 字符串，写入后返回该元素
   * render(result)：旧版单参调用，返回 HTML 字符串（兼容 FeaturesZiwei 旧接口）
   */
  function render(el, result) {
    if (el && typeof el === 'object' && !result && el.palaces) { result = el; el = null; }
    var html = renderHtml(result);
    if (el == null) return html;
    var node = null;
    if (typeof document !== 'undefined') {
      node = typeof el === 'string' ? (document.getElementById(el) || document.querySelector(el)) : el;
      if (node) node.innerHTML = html;
    }
    return node;
  }
  /* ==================== 结构自检 ==================== */

  /**
   * 自检：iztro 排 2000-01-01 00:00 男
   * 校验项：返回非空 / 12 宫齐全（寅→丑固定序）/ 含命宫与兄弟宫 / 四化与空亡字段存在
   * @returns {{passed:boolean, cases:Array<{name:string,passed:boolean,detail:string}>}}
   */
  function selfTest() {
    var cases = [];
    function check(name, fn) {
      try {
        var detail = fn();
        cases.push({ name: name, passed: true, detail: detail || '' });
      } catch (e) {
        cases.push({ name: name, passed: false, detail: (e && e.message) || String(e) });
      }
    }

    var result = null;
    check('iztro 引擎可用', function () {
      var iz = loadIztro();
      if (!iz || !iz.astro) throw new Error(lastError || 'iztro 未加载');
      return 'astro 命名空间就绪（bySolar/byLunar）';
    });
    check('排盘返回非空（2000-01-01 00:00 男）', function () {
      result = paiPan({ year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: '男' });
      if (!result || !result.raw || !Array.isArray(result.palaces)) throw new Error('返回结构缺失');
      return '命主=' + result.soul + ' 身主=' + result.body + ' 五行局=' + result.fiveElementClass + ' 命宫=' + result.soulPalace;
    });
    check('12 宫齐全（寅→丑 固定序）', function () {
      if (!result) throw new Error('排盘未执行');
      if (result.palaces.length !== 12) throw new Error('宫数=' + result.palaces.length);
      var branches = result.palaces.map(function (p) { return p.earthlyBranch; }).join('');
      if (branches !== BRANCH_ORDER.join('')) throw new Error('地支顺序异常：' + branches);
      return '寅卯辰巳午未申酉戌亥子丑';
    });
    check('含命宫与兄弟宫', function () {
      if (!result) throw new Error('排盘未执行');
      var names = result.palaces.map(function (p) { return p.name; });
      if (names.indexOf('命宫') < 0) throw new Error('缺少命宫');
      if (names.indexOf('兄弟') < 0) throw new Error('缺少兄弟宫');
      return names.join(',');
    });
    check('四化与空亡字段存在（生年四化恰 4 颗）', function () {
      if (!result) throw new Error('排盘未执行');
      var total = 0;
      result.palaces.forEach(function (p) {
        if (!p.mutagens || !p['四化']) throw new Error(p.name + ' 缺四化 map');
        if (typeof p.kongWang !== 'string') throw new Error(p.name + ' 缺空亡字段');
        ['禄', '权', '科', '忌'].forEach(function (k) { if (p.mutagens[k]) total++; });
      });
      if (total !== 4) throw new Error('生年四化数量=' + total);
      return '禄→' + result.siHua['禄'] + ' 权→' + result.siHua['权'] +
        ' 科→' + result.siHua['科'] + ' 忌→' + result.siHua['忌'];
    });

    return { passed: cases.every(function (c) { return c.passed; }), cases: cases };
  }

  /* ==================== 挂载导出 ==================== */

  var api = {
    version: VERSION,
    available: false,   // iztro 引擎可用性（失败时降级标记）
    error: '',          // 降级错误信息
    paiPan: paiPan,
    render: render,
    selfTest: selfTest
  };

  // 探测引擎可用性：失败时 available=false 并暴露错误信息
  (function detect() {
    var iz = loadIztro();
    api.available = !!(iz && iz.astro);
    api.error = api.available ? '' : (lastError || 'iztro 未加载：请先引入 vendor/iztro.min.js（须位于 js/ziwei.js 之前）');
  })();

  global.ZiWeiPro = api;        // 任务规范挂载点
  global.FeaturesZiwei = api;   // 旧别名兼容（tests/ziwei.test.js、zw-preview.html）

  // CommonJS 兼容（node --test 单元测试直接 require）
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);