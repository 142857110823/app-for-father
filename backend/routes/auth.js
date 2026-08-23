// 账号与认证路由
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { get, run } = require('../db');
const { JWT_SECRET, authDb } = require('../middleware');

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

router.get('/me', authDb, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ ok:false, error:'用户不存在' });
    res.json({ ok:true, data: publicUser(user) });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

router.post('/update-profile', authDb, async (req, res) => {
  try {
    const { nickname, avatar, gender, birth_year, birth_month, birth_day, birth_hour, birth_minute, birth_place, current_place } = req.body || {};
    const fields = [], params = [];
    const push = (f, v) => { if (v !== undefined) { fields.push(`${f} = ?`); params.push(v); } };
    push('nickname', nickname); push('avatar', avatar); push('gender', gender);
    push('birth_year', birth_year); push('birth_month', birth_month); push('birth_day', birth_day);
    push('birth_hour', birth_hour); push('birth_minute', birth_minute);
    push('birth_place', birth_place); push('current_place', current_place);
    if (fields.length === 0) return res.status(400).json({ ok:false, error:'无更新字段' });
    params.push(req.userId);
    await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    const user = await get('SELECT * FROM users WHERE id = ?', [req.userId]);
    res.json({ ok:true, data: publicUser(user) });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

router.post('/email-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok:false, error:'邮箱格式错误' });
    }
    const code = '654321';
    res.json({ ok:true, message:'验证码已发送（测试用）', code });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

router.post('/bind-phone', authDb, async (req, res) => {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !/^1\d{10}$/.test(phone)) return res.status(400).json({ ok:false, error:'手机号格式错误' });
    if (code !== '123456') return res.status(400).json({ ok:false, error:'验证码错误' });
    const exists = await get('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, req.userId]);
    if (exists) return res.status(409).json({ ok:false, error:'手机号已被其他账号绑定' });
    await run('UPDATE users SET phone = ? WHERE id = ?', [phone, req.userId]);
    res.json({ ok:true, message:'手机号绑定成功' });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

router.post('/bind-email', authDb, async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok:false, error:'邮箱格式错误' });
    if (code !== '654321') return res.status(400).json({ ok:false, error:'验证码错误' });
    const exists = await get('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.userId]);
    if (exists) return res.status(409).json({ ok:false, error:'邮箱已被其他账号绑定' });
    await run('UPDATE users SET email = ?, email_verified = 1 WHERE id = ?', [email, req.userId]);
    res.json({ ok:true, message:'邮箱绑定成功' });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

router.post('/bind-third', authDb, async (req, res) => {
  try {
    const { type, openid } = req.body || {};
    if (!['wx','qq'].includes(type) || !openid) return res.status(400).json({ ok:false, error:'参数错误' });
    const field = type === 'wx' ? 'wx_openid' : 'qq_openid';
    const exists = await get(`SELECT id FROM users WHERE ${field} = ? AND id != ?`, [openid, req.userId]);
    if (exists) return res.status(409).json({ ok:false, error:'该账号已绑定其他用户' });
    await run(`UPDATE users SET ${field} = ? WHERE id = ?`, [openid, req.userId]);
    res.json({ ok:true, message:'绑定成功' });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

router.post('/unbind', authDb, async (req, res) => {
  try {
    const { type } = req.body || {};
    const map = { phone:'phone', email:'email', wx:'wx_openid', qq:'qq_openid' };
    const field = map[type];
    if (!field) return res.status(400).json({ ok:false, error:'解绑类型错误' });
    const u = await get('SELECT phone, email, wx_openid, qq_openid, password_hash FROM users WHERE id = ?', [req.userId]);
    const bindings = (u.phone?1:0)+(u.email?1:0)+(u.wx_openid?1:0)+(u.qq_openid?1:0)+(u.password_hash?1:0);
    if (bindings <= 1) return res.status(400).json({ ok:false, error:'至少保留一种登录方式' });
    await run(`UPDATE users SET ${field} = NULL${field==='email'?', email_verified = 0':''} WHERE id = ?`, [req.userId]);
    res.json({ ok:true, message:'解绑成功' });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

router.post('/deactivate', authDb, async (req, res) => {
  try {
    const { confirm } = req.body || {};
    if (confirm !== '我已确认注销账号且不可恢复') return res.status(400).json({ ok:false, error:'请确认注销声明' });
    const deletedNick = '已注销用户' + Date.now();
    await run(`UPDATE users SET status = 0, nickname = ?, phone = NULL, email = NULL, wx_openid = NULL, qq_openid = NULL, password_hash = NULL, avatar = NULL, gender = 0, birth_year = NULL, birth_month = NULL, birth_day = NULL, birth_hour = NULL, birth_minute = NULL, birth_place = NULL WHERE id = ?`, [deletedNick, req.userId]);
    await run('UPDATE tokens SET revoked = 1 WHERE user_id = ?', [req.userId]);
    res.json({ ok:true, message:'账号已注销' });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

module.exports = router;
