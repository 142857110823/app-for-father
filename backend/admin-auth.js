const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const credentialsPath = process.env.ADMIN_CREDENTIALS_FILE
  || path.join(__dirname, '..', 'admin-credentials.local.json');
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

function loadAdminCredentials() {
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_ACCESS_KEY_HASH && process.env.ADMIN_PASSWORD_HASH && process.env.JWT_SECRET) {
    return {
      username: process.env.ADMIN_USERNAME,
      accessKeyHash: process.env.ADMIN_ACCESS_KEY_HASH,
      passwordHash: process.env.ADMIN_PASSWORD_HASH,
      jwtSecret: process.env.JWT_SECRET,
    };
  }
  return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
}

function attemptKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function canAttempt(key, now = Date.now()) {
  const state = attempts.get(key);
  if (!state || now - state.startedAt >= WINDOW_MS) return true;
  return state.failures < MAX_FAILURES;
}

function recordFailure(key, now = Date.now()) {
  const state = attempts.get(key);
  if (!state || now - state.startedAt >= WINDOW_MS) {
    attempts.set(key, { startedAt: now, failures: 1 });
  } else {
    state.failures += 1;
  }
}

function clearFailures(key) {
  attempts.delete(key);
}

async function verifyAdminLogin(credentials, input) {
  if (!credentials || !input) return false;
  if (input.username !== credentials.username) return false;
  const [accessOk, passwordOk] = await Promise.all([
    bcrypt.compare(String(input.accessKey || ''), credentials.accessKeyHash),
    bcrypt.compare(String(input.password || ''), credentials.passwordHash),
  ]);
  return accessOk && passwordOk;
}

function createAdminToken(credentials, username) {
  return jwt.sign(
    { sub: username, role: 'admin', jti: crypto.randomUUID() },
    credentials.jwtSecret,
    { expiresIn: '8h', issuer: 'qimen-admin' },
  );
}

function verifyAdminToken(credentials, token) {
  const payload = jwt.verify(token, credentials.jwtSecret, { issuer: 'qimen-admin' });
  if (payload.role !== 'admin' || payload.sub !== credentials.username) {
    throw new Error('无管理员权限');
  }
  return payload;
}

function adminOnly(req, res, next) {
  const key = attemptKey(req);
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, error: '未登录' });
  try {
    verifyAdminToken(loadAdminCredentials(), token);
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: '管理员登录已失效' });
  }
}

async function loginAdmin(req, res) {
  const key = attemptKey(req);
  if (!canAttempt(key)) return res.status(429).json({ ok: false, error: '登录尝试过于频繁，请稍后再试' });
  try {
    const credentials = loadAdminCredentials();
    const valid = await verifyAdminLogin(credentials, req.body || {});
    if (!valid) {
      recordFailure(key);
      return res.status(401).json({ ok: false, error: '管理员凭据错误' });
    }
    clearFailures(key);
    res.json({
      ok: true,
      data: { token: createAdminToken(credentials, credentials.username), expiresIn: 8 * 60 * 60 },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: '管理员认证配置不可用' });
  }
}

module.exports = {
  loadAdminCredentials,
  verifyAdminLogin,
  createAdminToken,
  verifyAdminToken,
  adminOnly,
  loginAdmin,
};
