// 管理与统计路由
const express = require('express');
const { get, all } = require('../db');
const { authDb } = require('../middleware');

const router = express.Router();

// 简单管理员校验：手机号尾号 0000 视为管理员
async function adminOnly(req, res, next) {
  const user = await get('SELECT phone FROM users WHERE id = ?', [req.userId]);
  if (!user || !user.phone.endsWith('0000')) {
    return res.status(403).json({ ok: false, error: '无权限' });
  }
  next();
}

router.get('/stats', authDb, adminOnly, async (req, res) => {
  try {
    const totalUsers = await get('SELECT COUNT(*) as c FROM users');
    const todayUsers = await get('SELECT COUNT(*) as c FROM users WHERE created_at > ?', [Date.now() / 1000 - 86400]);
    const totalPaipan = await get('SELECT COUNT(*) as c FROM history WHERE deleted = 0');
    const todayPaipan = await get('SELECT COUNT(*) as c FROM history WHERE deleted = 0 AND created_at > ?', [Date.now() / 1000 - 86400]);
    const totalAi = await get('SELECT COUNT(*) as c FROM ai_chats WHERE role = "assistant"');
    const todayAi = await get('SELECT COUNT(*) as c FROM ai_chats WHERE role = "assistant" AND created_at > ?', [Date.now() / 1000 - 86400]);
    const active7d = await get('SELECT COUNT(DISTINCT user_id) as c FROM operation_logs WHERE created_at > ?', [Date.now() / 1000 - 7 * 86400]);

    res.json({
      ok: true,
      data: {
        users: { total: totalUsers.c, today: todayUsers.c },
        paipan: { total: totalPaipan.c, today: todayPaipan.c },
        ai: { total: totalAi.c, today: todayAi.c },
        active_7d: active7d.c
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 用户活跃度排行
router.get('/active-users', authDb, adminOnly, async (req, res) => {
  try {
    const rows = await all(`
      SELECT u.id, u.phone, u.nickname, COUNT(h.id) as paipan_count
      FROM users u
      LEFT JOIN history h ON h.user_id = u.id AND h.deleted = 0
      GROUP BY u.id
      ORDER BY paipan_count DESC
      LIMIT 50
    `);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
