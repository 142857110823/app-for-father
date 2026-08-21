// 账号与认证路由
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { get, run } = require('../db');
const { JWT_SECRET } = require('../middleware');

const router = express.Router();
const SALT_ROUNDS = 10;
const TOKEN_DAYS = 30;

// 发送短信验证码（占位：实际接入短信服务商）
router.post('/sms-code', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone || !/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ ok: false, error: '手机号格式错误' });
    }
    // 生产环境调用短信网关；此处返回固定测试码
    const code = '123456';
    res.json({ ok: true, message: '验证码已发送', code });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 手机号 + 验证码注册/登录
router.post('/login-by-sms', async (req, res) => {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !/^1\d{10}$/.test(phone)) return res.status(400).json({ ok: false, error: '手机号格式错误' });
    if (!code) return res.status(400).json({ ok: false, error: '验证码不能为空' });
    if (code !== '123456') return res.status(400).json({ ok: false, error: '验证码错误' });

    let user = await get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) {
      const result = await run('INSERT INTO users (phone, nickname, ai_quota) VALUES (?, ?, ?)', [phone, `用户${phone.slice(-4)}`, 10]);
      user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    }

    const token = await createSession(user.id, req);
    await run('UPDATE users SET last_login_at = ? WHERE id = ?', [Date.now() / 1000, user.id]);
    res.json({ ok: true, data: { user: publicUser(user), token } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 账号密码注册
router.post('/register', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !/^1\d{10}$/.test(phone)) return res.status(400).json({ ok: false, error: '手机号格式错误' });
    if (!password || password.length < 6) return res.status(400).json({ ok: false, error: '密码不少于6位' });

    const exists = await get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (exists) return res.status(409).json({ ok: false, error: '手机号已注册' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await run('INSERT INTO users (phone, password_hash, nickname, ai_quota) VALUES (?, ?, ?, ?)', [phone, hash, `用户${phone.slice(-4)}`, 10]);
    const user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    const token = await createSession(user.id, req);
    res.json({ ok: true, data: { user: publicUser(user), token } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 账号密码登录
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) return res.status(400).json({ ok: false, error: '手机号和密码不能为空' });

    const user = await get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user || !user.password_hash) return res.status(401).json({ ok: false, error: '账号或密码错误' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ ok: false, error: '账号或密码错误' });

    const token = await createSession(user.id, req);
    await run('UPDATE users SET last_login_at = ? WHERE id = ?', [Date.now() / 1000, user.id]);
    res.json({ ok: true, data: { user: publicUser(user), token } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 密码重置
router.post('/reset-password', async (req, res) => {
  try {
    const { phone, code, password } = req.body || {};
    if (!phone || !code || !password) return res.status(400).json({ ok: false, error: '参数不完整' });
    if (code !== '123456') return res.status(400).json({ ok: false, error: '验证码错误' });

    const user = await get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) return res.status(404).json({ ok: false, error: '手机号未注册' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    await run('UPDATE tokens SET revoked = 1 WHERE user_id = ?', [user.id]);
    res.json({ ok: true, message: '密码已重置，请重新登录' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 登出
router.post('/logout', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (token) await run('UPDATE tokens SET revoked = 1 WHERE token = ?', [token]);
    res.json({ ok: true, message: '已登出' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 第三方登录占位（微信/QQ）
router.post('/login-by-third', async (req, res) => {
  try {
    const { type, openid, nickname, avatar } = req.body || {};
    if (!['wx', 'qq'].includes(type) || !openid) {
      return res.status(400).json({ ok: false, error: '第三方登录参数错误' });
    }
    const field = type === 'wx' ? 'wx_openid' : 'qq_openid';
    let user = await get(`SELECT * FROM users WHERE ${field} = ?`, [openid]);
    if (!user) {
      const result = await run(`INSERT INTO users (${field}, nickname, avatar, ai_quota) VALUES (?, ?, ?, ?)`, [openid, nickname || '', avatar || '', 10]);
      user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    }
    const token = await createSession(user.id, req);
    await run('UPDATE users SET last_login_at = ? WHERE id = ?', [Date.now() / 1000, user.id]);
    res.json({ ok: true, data: { user: publicUser(user), token } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

async function createSession(userId, req) {
  const token = uuidv4();
  const expiresAt = Date.now() / 1000 + TOKEN_DAYS * 86400;
  await run('INSERT INTO tokens (user_id, token, device_info, ip, expires_at) VALUES (?, ?, ?, ?, ?)', [
    userId, token, req.headers['user-agent'] || '', req.ip, expiresAt
  ]);
  return jwt.sign({ userId, token }, JWT_SECRET, { expiresIn: `${TOKEN_DAYS}d` });
}

function publicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    nickname: user.nickname,
    avatar: user.avatar,
    gender: user.gender,
    member_level: user.member_level,
    member_expire_at: user.member_expire_at,
    ai_quota: user.ai_quota,
    created_at: user.created_at,
    last_login_at: user.last_login_at
  };
}

module.exports = router;
