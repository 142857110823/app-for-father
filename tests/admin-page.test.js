const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const relativePath of ['public/admin.html', 'admin.html', 'docs/admin.html']) {
  test(`${relativePath} requires three administrator credentials without exposing defaults`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    assert.match(html, /id="admin-access-key"/);
    assert.match(html, /id="admin-username"/);
    assert.match(html, /id="admin-password"/);
    assert.doesNotMatch(html, /admin888/);
    assert.doesNotMatch(html, /localStorage\.setItem\(['"]admin_token/);
    assert.match(html, /sessionStorage\.setItem\(['"]admin_token/);
  });
}
