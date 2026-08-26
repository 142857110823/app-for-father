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
      html.slice(exportStart, exportEnd),
      ['em-ling', 'em-tian', 'em-ren', 'em-di'],
      `${relativePath} export`,
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
}
