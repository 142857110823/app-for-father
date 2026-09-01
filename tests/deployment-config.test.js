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
