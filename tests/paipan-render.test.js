const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function assertFieldOrder(html, fieldClasses, label) {
  let previous = -1;
  for (const fieldClass of fieldClasses) {
    const current = html.indexOf(fieldClass);
    assert.ok(current >= 0, `${label} missing ${fieldClass}`);
    assert.ok(current > previous, `${label} must render ${fieldClasses.join(' -> ')}`);
    previous = current;
  }
}

for (const relativePath of ['index.html', 'public/index.html', 'docs/index.html']) {
  test(`${relativePath} renders DOCX field order in screen and export`, () => {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const screenStart = html.indexOf('const buildInner = () =>');
    const screenEnd = html.indexOf('return `<td class="', screenStart);
    const exportStart = html.indexOf('const inner = `', screenEnd);
    const exportEnd = html.indexOf('plateRows += `<td', exportStart);
    assert.ok(screenStart >= 0 && screenEnd > screenStart, `${relativePath} screen template missing`);
    assert.ok(exportStart >= 0 && exportEnd > exportStart, `${relativePath} export template missing`);
    assertFieldOrder(
      html.slice(screenStart, screenEnd),
      ['pc-ling', 'pc-tian', 'pc-ren', 'pc-di'],
      `${relativePath} screen`,
    );
    assertFieldOrder(
      html.slice(screenStart, screenEnd),
      ['pc-tg', 'pc-yj', 'pc-jq', 'pc-rp'],
      `${relativePath} screen right`,
    );
    assertFieldOrder(
      html.slice(exportStart, exportEnd),
      ['em-ling', 'em-tian', 'em-ren', 'em-di'],
      `${relativePath} export`,
    );
    assertFieldOrder(
      html.slice(exportStart, exportEnd),
      ['er-tiangang', 'er-yueju', 'er-jieqi', 'er-ripai'],
      `${relativePath} export right`,
    );
  });

  test(`${relativePath} uses the standard three-section template for the merged center palace`, () => {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const screenStart = html.indexOf('function renderTraditionalPlate()');
    const screenEnd = html.indexOf('function getKongWang', screenStart);
    const exportStart = html.indexOf('function buildPaipanHTML');
    const exportEnd = html.indexOf('return `', exportStart);
    const screen = html.slice(screenStart, screenEnd);
    const exported = html.slice(exportStart, exportEnd);

    assert.match(screen, /class="center \$\{isGuiShen[^`]+?\$\{buildInner\(\)\}<\/td>/s);
    assert.doesNotMatch(screen, /pc-center-top|pc-center-bottom|pc-center-bl|pc-center-br/);
    assert.doesNotMatch(exported, /中宫PDF特例|centerInner|bottomLeft|bottomRight/);
  });

  test(`${relativePath} renders Tiangang labels vertically`, () => {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(
      html,
      /\.pc-tg\{[^}]*writing-mode:vertical-rl[^}]*text-orientation:upright[^}]*\}/,
    );
  });

  test(`${relativePath} renders Jieqi labels as double vertical columns`, () => {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(html, /\.pc-jq\{[^}]*display:flex[^}]*\}/);
    assert.match(html, /\.jq-col\{[^}]*writing-mode:vertical-rl[^}]*text-orientation:upright[^}]*\}/);
  });

  test(`${relativePath} places center palace content at 1/3 and 2/3`, () => {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(
      html,
      /#plate-table td\.center \.palace-left-mid\{[^}]*width:66%[^}]*grid-template-columns:1fr 1fr[^}]*\}/,
    );
  });

  test(`${relativePath} exposes the new dual-dun result UI contract`, () => {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const resultPage = html.slice(html.indexOf('<div id="page-result"'), html.indexOf('<div id="page-history"'));
    const plateRenderer = html.slice(html.indexOf('function renderTraditionalPlate()'), html.indexOf('function getKongWang'));
    const exportRenderer = html.slice(html.indexOf('function buildPaipanHTML'), html.indexOf('function buildPaipanHTML') + 16000);
    assert.match(html, /class="dun-toggle-bar"/);
    assert.match(html, /data-dun="阳遁"/);
    assert.match(html, /data-dun="阴遁"/);
    assert.match(html, /fullPaiPanFromTime/);
    assert.match(html, /神盘/);
    assert.match(html, /title="神盘"/);
    assert.match(html, /title="灵盘"/);
    assert.doesNotMatch(resultPage, /id="ai-interpret"/);
    assert.doesNotMatch(plateRenderer, /showShengWang\(/);
    assert.doesNotMatch(plateRenderer, /【六合关系】|【生旺死绝表|【天盘各宫之干】/);
    assert.doesNotMatch(resultPage, /<div class="ig-lbl">公历<\/div>|<div class="ig-lbl">时辰<\/div>/);
    assert.doesNotMatch(html.slice(html.indexOf('function renderResult'), html.indexOf('function getMenDisplay')), /ig-lbl">公历|ig-lbl">时辰/);
    assert.doesNotMatch(exportRenderer, /baseInfoRows\.push\([^;]*公历|baseInfoRows\.push\([^;]*时辰/);
    assert.match(html, /type: '十三神'/);
    assert.match(html, /type: '十三星'/);
    assert.match(html, /type: '十三门'/);
    assert.match(html, /\.pc-shen\{[^}]*color:var\(--ink\)/);
    assert.match(html, /\.pc-ling\{[^}]*color:var\(--ink\)/);
  });
}
