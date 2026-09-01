const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  verifyAdminLogin,
  createAdminToken,
  verifyAdminToken,
} = require('../backend/admin-auth');

const secret = 'test-admin-jwt-secret';
const credentials = {
  username: 'admin',
  accessKeyHash: bcrypt.hashSync('access-key-test', 4),
  passwordHash: bcrypt.hashSync('password-test', 4),
  jwtSecret: secret,
};

test('管理员登录必须同时验证访问密钥、账号和密码', async () => {
  assert.equal(await verifyAdminLogin(credentials, {
    accessKey: 'access-key-test',
    username: 'admin',
    password: 'password-test',
  }), true);
  assert.equal(await verifyAdminLogin(credentials, {
    accessKey: 'wrong',
    username: 'admin',
    password: 'password-test',
  }), false);
  assert.equal(await verifyAdminLogin(credentials, {
    accessKey: 'access-key-test',
    username: 'other',
    password: 'password-test',
  }), false);
  assert.equal(await verifyAdminLogin(credentials, {
    accessKey: 'access-key-test',
    username: 'admin',
    password: 'wrong',
  }), false);
});

test('管理员令牌必须是签名且角色为 admin 的 JWT', () => {
  const token = createAdminToken(credentials, 'admin');
  assert.equal(verifyAdminToken(credentials, token).role, 'admin');
  assert.throws(() => verifyAdminToken(credentials, jwt.sign({ role: 'admin' }, 'wrong')), /invalid signature/);
  assert.throws(() => verifyAdminToken(credentials, jwt.sign({ role: 'user' }, secret)), /issuer invalid|无管理员权限/);
});
