// 后端中间件
const jwt = require('jsonwebtoken');
const { get } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'qimen-shisan-gong-secret-key';

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
    req.userId = decoded.userId;
    req.token = decoded.token;
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

module.exports = { auth, authDb, JWT_SECRET, logAction };
