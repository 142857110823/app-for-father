// 管理与统计路由
const express = require('express');
const { get, all, run } = require('../db');
const { authDb } = require('../middleware');

const router = express.Router();
const ADMIN_PASSWORD = 'admin888';

// 管理员登录（固定密码）
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = Buffer.from(`admin_${Date.now()}`).toString('base64');
    res.json({ ok: true, data: { token } });
  } else {
    res.status(401).json({ ok: false, error: '密码错误' });
  }
});

// 管理员校验：固定密码验证
async function adminOnly(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, error: '未登录' });
  if (!token.startsWith('YWRtaW5f')) {
    return res.status(403).json({ ok: false, error: '无权限' });
  }
  next();
}

// ========== 数据统计总览 ==========
router.get('/stats', authDb, adminOnly, async (req, res) => {
  try {
    const totalUsers = await get('SELECT COUNT(*) as c FROM users');
    const todayUsers = await get('SELECT COUNT(*) as c FROM users WHERE created_at > ?', [Date.now() / 1000 - 86400]);
    const totalPaipan = await get('SELECT COUNT(*) as c FROM history WHERE deleted = 0');
    const todayPaipan = await get('SELECT COUNT(*) as c FROM history WHERE deleted = 0 AND created_at > ?', [Date.now() / 1000 - 86400]);
    const totalAi = await get('SELECT COUNT(*) as c FROM ai_chats WHERE role = "assistant"');
    const todayAi = await get('SELECT COUNT(*) as c FROM ai_chats WHERE role = "assistant" AND created_at > ?', [Date.now() / 1000 - 86400]);
    const active7d = await get('SELECT COUNT(DISTINCT user_id) as c FROM operation_logs WHERE created_at > ?', [Date.now() / 1000 - 7 * 86400]);

    // 近 7 天排盘趋势
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const startOfDay = Math.floor(Date.now() / 1000 / 86400) * 86400 - i * 86400;
      const endOfDay = startOfDay + 86400;
      const count = await get('SELECT COUNT(*) as c FROM history WHERE deleted = 0 AND created_at >= ? AND created_at < ?', [startOfDay, endOfDay]);
      trend.push({ date: new Date(startOfDay * 1000).toISOString().slice(0, 10), count: count.c });
    }

    // 会员统计
    const vipUsers = await get("SELECT COUNT(*) as c FROM users WHERE member_level != 'free'");

    res.json({
      ok: true,
      data: {
        users: { total: totalUsers.c, today: todayUsers.c },
        paipan: { total: totalPaipan.c, today: todayPaipan.c },
        ai: { total: totalAi.c, today: todayAi.c },
        active_7d: active7d.c,
        vip_users: vipUsers.c,
        trend
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== 用户管理 ==========
router.get('/users', authDb, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;
    const keyword = req.query.keyword || '';
    const offset = (page - 1) * pageSize;

    let whereClause = '';
    let params = [];
    if (keyword) {
      whereClause = 'WHERE nickname LIKE ? OR phone LIKE ? OR email LIKE ?';
      params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];
    }

    const total = await get(`SELECT COUNT(*) as c FROM users ${whereClause}`, params);
    const users = await all(`
      SELECT id, phone, email, nickname, avatar, gender, member_level, member_expire_at, ai_quota, created_at, last_login_at
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    res.json({ ok: true, data: { total: total.c, page, page_size: pageSize, list: users } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/users/:id', authDb, adminOnly, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ ok: false, error: '用户不存在' });

    const paipanCount = await get('SELECT COUNT(*) as c FROM history WHERE user_id = ? AND deleted = 0', [req.params.id]);
    const aiCount = await get('SELECT COUNT(*) as c FROM ai_chats WHERE user_id = ? AND role = "assistant"', [req.params.id]);
    const orders = await all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.params.id]);

    res.json({ ok: true, data: { ...user, paipan_count: paipanCount.c, ai_count: aiCount.c, orders } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/users/:id', authDb, adminOnly, async (req, res) => {
  try {
    const { nickname, member_level, member_expire_at, ai_quota } = req.body;
    const updates = [];
    const params = [];
    if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
    if (member_level !== undefined) { updates.push('member_level = ?'); params.push(member_level); }
    if (member_expire_at !== undefined) { updates.push('member_expire_at = ?'); params.push(member_expire_at); }
    if (ai_quota !== undefined) { updates.push('ai_quota = ?'); params.push(ai_quota); }
    if (updates.length === 0) return res.json({ ok: true });

    params.push(req.params.id);
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/users/:id', authDb, adminOnly, async (req, res) => {
  try {
    // 软删除 - 清除敏感信息
    await run('UPDATE users SET phone = NULL, email = NULL, wx_openid = NULL, qq_openid = NULL WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== 排盘记录管理 ==========
router.get('/history', authDb, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;
    const userId = req.query.user_id;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE h.deleted = 0';
    let params = [];
    if (userId) { whereClause += ' AND h.user_id = ?'; params.push(userId); }

    const total = await get(`SELECT COUNT(*) as c FROM history h ${whereClause}`, params);
    const list = await all(`
      SELECT h.id, h.title, h.solar_date, h.dun, h.ju, h.created_at, h.user_id,
             u.nickname as user_nickname
      FROM history h
      LEFT JOIN users u ON u.id = h.user_id
      ${whereClause}
      ORDER BY h.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    res.json({ ok: true, data: { total: total.c, page, page_size: pageSize, list } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/history/:id', authDb, adminOnly, async (req, res) => {
  try {
    await run('UPDATE history SET deleted = 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== 订单管理 ==========
router.get('/orders', authDb, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;
    const status = req.query.status;
    const offset = (page - 1) * pageSize;

    let whereClause = '';
    let params = [];
    if (status) { whereClause = 'WHERE o.status = ?'; params.push(status); }

    const total = await get(`SELECT COUNT(*) as c FROM orders o ${whereClause}`, params);
    const list = await all(`
      SELECT o.id, o.order_no, o.plan_code, o.type, o.amount_cent, o.status, o.paid_at, o.created_at,
             u.nickname as user_nickname, u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    res.json({ ok: true, data: { total: total.c, page, page_size: pageSize, list } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== 会员套餐管理 ==========
router.get('/plans', authDb, adminOnly, async (req, res) => {
  try {
    const plans = await all('SELECT * FROM membership_plans WHERE enabled = 1 ORDER BY price_cent');
    res.json({ ok: true, data: plans });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/plans', authDb, adminOnly, async (req, res) => {
  try {
    const { code, name, duration_days, ai_quota, price_cent } = req.body;
    await run('INSERT INTO membership_plans (code, name, duration_days, ai_quota, price_cent) VALUES (?, ?, ?, ?, ?)',
      [code, name, duration_days, ai_quota, price_cent]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/plans/:id', authDb, adminOnly, async (req, res) => {
  try {
    const { name, duration_days, ai_quota, price_cent, enabled } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (duration_days !== undefined) { updates.push('duration_days = ?'); params.push(duration_days); }
    if (ai_quota !== undefined) { updates.push('ai_quota = ?'); params.push(ai_quota); }
    if (price_cent !== undefined) { updates.push('price_cent = ?'); params.push(price_cent); }
    if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled); }
    if (updates.length === 0) return res.json({ ok: true });

    params.push(req.params.id);
    await run(`UPDATE membership_plans SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== 公告管理 ==========
router.get('/announcements', authDb, adminOnly, async (req, res) => {
  try {
    const list = await all('SELECT * FROM announcements ORDER BY published_at DESC');
    res.json({ ok: true, data: list });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/announcements', authDb, adminOnly, async (req, res) => {
  try {
    const { title, content, type, priority } = req.body;
    await run('INSERT INTO announcements (title, content, type, priority) VALUES (?, ?, ?, ?)',
      [title, content, type || 'system', priority || 0]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/announcements/:id', authDb, adminOnly, async (req, res) => {
  try {
    const { title, content, type, priority } = req.body;
    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (updates.length === 0) return res.json({ ok: true });

    params.push(req.params.id);
    await run(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/announcements/:id', authDb, adminOnly, async (req, res) => {
  try {
    await run('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== 操作日志 ==========
router.get('/logs', authDb, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 50;
    const userId = req.query.user_id;
    const action = req.query.action;
    const offset = (page - 1) * pageSize;

    let whereClause = '';
    let params = [];
    if (userId) { whereClause += 'WHERE user_id = ? '; params.push(userId); }
    if (action) { whereClause += (whereClause ? 'AND ' : 'WHERE ') + 'action = ? '; params.push(action); }

    const total = await get(`SELECT COUNT(*) as c FROM operation_logs ${whereClause}`, params);
    const list = await all(`
      SELECT * FROM operation_logs ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    res.json({ ok: true, data: { total: total.c, page, page_size: pageSize, list } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== 活跃用户排行 ==========
router.get('/active-users', authDb, adminOnly, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const rows = await all(`
      SELECT u.id, u.phone, u.nickname, u.member_level, COUNT(h.id) as paipan_count
      FROM users u
      LEFT JOIN history h ON h.user_id = u.id AND h.deleted = 0
      GROUP BY u.id
      ORDER BY paipan_count DESC
      LIMIT ?
    `, [limit]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;