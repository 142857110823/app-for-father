const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

for (const relativePath of ['index.html', 'public/index.html', 'docs/index.html']) {
  test(`${relativePath} loads the offline school modules`, () => {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(html, /school\.css/);
    assert.match(html, /vendor\/jszip\.min\.js/);
    assert.match(html, /vendor\/epub\.min\.js/);
    assert.match(html, /school-library\.js/);
    assert.match(html, /school-reader\.js/);
    assert.match(html, /school-app\.js/);
    assert.doesNotMatch(html, /const SCHOOL_BOOKS\s*=/);
    assert.doesNotMatch(html, /LEGACY_SCHOOL_BOOKS|SCHOOL_BOOKS_DATA|\?\./);
  });
}

test('android package excludes downloaded epub files and scraped book content', () => {
  const publicFiles = fs.readdirSync(path.join(root, 'public'), { recursive: true });
  assert.equal(publicFiles.some((file) => String(file).endsWith('.epub')), false);
  assert.equal(publicFiles.some((file) => String(file).includes('books_content.json')), false);
});

test('development server exposes the verified remote book directory', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /app\.use\('\/books', express\.static\(path\.join\(__dirname, 'docs', 'books'\)/);
});

for (const relativePath of ['index.html', 'public/index.html', 'docs/index.html']) {
  test(`${relativePath} featured book cards support both read and download buttons`, () => {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const appJs = fs.readFileSync(path.join(root, 'public', 'school-app.js'), 'utf8');
    assert.match(appJs, /data-action="read"/);
    assert.match(appJs, /data-action="download"/);
    assert.match(appJs, /school-book-read/);
    assert.match(appJs, /school-book-download/);
  });
}
