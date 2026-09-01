const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { isMemberActive, isTrialExpired } = require('../backend/middleware');

test('有效会员不受设备一天限制', () => {
  const now = 200000;
  assert.equal(isMemberActive({ member_level: 'vip', member_expire_at: now + 1 }, now), true);
  assert.equal(isTrialExpired(now - 86401, now), true);
});

test('普通账号和游客超过一天后被锁定', () => {
  const now = 200000;
  assert.equal(isMemberActive({ member_level: 'free', member_expire_at: null }, now), false);
  assert.equal(isTrialExpired(now - 86400001, now), true);
  assert.equal(isTrialExpired(now - 86400000, now), false);
});

test('登录页面提供账号密码和游客入口，且存在开场界面', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  assert.match(html, /id="auth-gate"/);
  assert.match(html, /账号密码登录/);
  assert.match(html, /游客登录/);
  assert.match(html, /id="opening-screen"/);
});

test('十三宫页面不再使用八门九星八神分类文案', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  assert.doesNotMatch(html, /type:\s*['"]八神['"]/);
  assert.doesNotMatch(html, /type:\s*['"]九星['"]/);
  assert.doesNotMatch(html, /type:\s*['"]八门['"]/);
});
