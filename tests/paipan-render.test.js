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
  test(`${relativePath} renders DOCX center-column order in screen and export`, () => {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const screenStart = html.indexOf('const buildInner = () =>');
    const screenEnd = html.indexOf('if (cell.center)', screenStart);
    const exportStart = html.indexOf('const inner = `', screenEnd);
    const exportEnd = html.indexOf('plateRows += `<td', exportStart);
    assert.ok(screenStart >= 0 && screenEnd > screenStart, `${relativePath} screen template missing`);
    assert.ok(exportStart >= 0 && exportEnd > exportStart, `${relativePath} export template missing`);
    assertFieldOrder(
      html.slice(screenStart, screenEnd),
      ['pc-ling', 'pc-tian', 'pc-di', 'pc-ren'],
      `${relativePath} screen`,
    );
    assertFieldOrder(
      html.slice(exportStart, exportEnd),
      ['em-ling', 'em-tian', 'em-di', 'em-ren'],
      `${relativePath} export`,
    );
  });
}
