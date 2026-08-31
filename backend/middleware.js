// 后端中间件
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { get, run } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'qimen-shisan-gong-secret-key';
const TRIAL_MS = 24 * 60 * 60 * 1000;

function isMemberActive(user, now = Date.now() / 1000) {
  return !!user && (
    user.member_level === 'admin' ||
    (user.member_level === 'vip' && Number(user.member_expire_at || 0) > now)
  );
}

function isTrialExpired(firstLoginAt, now = Date.now()) {
  const startMs = Number(firstLoginAt) * 1000;
  return Number.isFinite(startMs) && now - startMs > TRIAL_MS;
}

function deviceId(req) {
  const supplied = String(req.headers['x-device-id'] || '').trim();
  if (supplied && /^[a-zA-Z0-9._:-]{8,128}$/.test(supplied)) return supplied;
  return crypto.createHash('sha256')
    .update(`${req.headers['user-agent'] || ''}|${req.ip || ''}`)
    .digest('hex');
}

async function checkDeviceAccess(req, userId) {
  const user = await get('SELECT member_level, member_expire_at, status FROM users WHERE id = ?', [userId]);
  if (!user || user.status === 0) return { ok: false, error: '账号不可用' };
  const id = deviceId(req);
  let session = await get('SELECT * FROM device_sessions WHERE device_id = ?', [id]);
  const now = Math.floor(Date.now() / 1000);
  if (!session) {
    await run('INSERT INTO device_sessions (device_id, user_id, first_login_at, last_seen_at) VALUES (?, ?, ?, ?)', [id, userId, now, now]);
    session = { first_login_at: now };
  } else {
    await run('UPDATE device_sessions SET user_id = ?, last_seen_at = ? WHERE device_id = ?', [userId, now, id]);
  }
  if (!isMemberActive(user, now) && isTrialExpired(session.first_login_at, Date.now())) {
    return { ok: false, error: '本设备免费使用已满1天，请登录VIP账号或联系管理员', code: 'DEVICE_TRIAL_EXPIRED' };
  }
  return { ok: true, deviceId: id, user };
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, error: '未登录' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.token = token;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: '登录已过期' });
  }
}

async function authDb(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, error: '未登录' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const row = await get('SELECT * FROM tokens WHERE token = ? AND revoked = 0 AND expires_at > ?', [decoded.token, Date.now() / 1000]);
    if (!row) return res.status(401).json({ ok: false, error: '登录已失效' });
    const access = await checkDeviceAccess(req, decoded.userId);
    if (!access.ok) return res.status(403).json({ ok: false, error: access.error, code: access.code });
    req.userId = decoded.userId;
    req.token = decoded.token;
    req.user = access.user;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: '登录已过期' });
  }
}

function logAction(action) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const { run } = require('./db');
      run('INSERT INTO operation_logs (user_id, action, detail, ip) VALUES (?, ?, ?, ?)', [
        req.userId || null,
        action,
        JSON.stringify({ path: req.path, method: req.method, ok: body && body.ok }),
        req.ip
      ]).catch(() => {});
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auth, authDb, JWT_SECRET, logAction, isMemberActive, isTrialExpired, deviceId, checkDeviceAccess };
