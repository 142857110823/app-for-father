const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('管理员仪表盘展示完整运营统计字段', () => {
  const html = fs.readFileSync('public/admin.html', 'utf8');
  for (const id of [
    'stat-yang-paipan',
    'stat-yin-paipan',
    'stat-active-members',
    'stat-expiring-members',
    'stat-pending-orders',
    'stat-paid-orders',
    'stat-revenue',
    'recent-history-list',
    'recent-orders-list',
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /d\.membership\.active/);
  assert.match(html, /d\.orders\.revenue_cent/);
});
