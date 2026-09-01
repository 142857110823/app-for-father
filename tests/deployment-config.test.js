const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Render 配置使用持久数据目录和健康检查', () => {
  const yaml = fs.readFileSync('render.yaml', 'utf8');
  assert.match(yaml, /healthCheckPath:\s*\/api\/health/);
  assert.match(yaml, /mountPath:\s*\/var\/data/);
  assert.match(yaml, /DATA_DIR/);
});

test('数据库支持 Render 持久数据目录并保留 DB_PATH 覆盖', () => {
  const source = fs.readFileSync('backend/db.js', 'utf8');
  assert.match(source, /process\.env\.DATA_DIR/);
  assert.match(source, /process\.env\.DB_PATH/);
});

test('生产配置使用 CORS 白名单，管理员凭据来自环境变量', () => {
  const server = fs.readFileSync('server.js', 'utf8');
  const admin = fs.readFileSync('backend/admin-auth.js', 'utf8');
  assert.match(server, /CORS_ORIGINS/);
  assert.doesNotMatch(server, /req\.headers\.origin\s*\|\|\s*['"]\*['"]/);
  assert.match(admin, /ADMIN_ACCESS_KEY_HASH/);
  assert.match(admin, /ADMIN_PASSWORD_HASH/);
});

test('用户端、管理员端和 AI 客户端支持公网 API 基址', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  const admin = fs.readFileSync('public/admin.html', 'utf8');
  const ai = fs.readFileSync('public/ai-client.js', 'utf8');
  assert.match(html, /window\.QIMEN_API_BASE/);
  assert.match(html, /function apiUrl\(path\)/);
  assert.match(admin, /window\.QIMEN_API_BASE/);
  assert.match(admin, /function apiUrl\(path\)/);
  assert.match(ai, /window\.QIMEN_API_BASE/);
});
