// 通知与运营路由
const express = require('express');
const { run, get, all } = require('../db');
const { authDb } = require('../middleware');

const router = express.Router();

// 系统公告列表
router.get('/announcements', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM announcements ORDER BY priority DESC, published_at DESC LIMIT 20');
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 我的消息
router.get('/messages', authDb, async (req, res) => {
  try {
    const { page = 1, size = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(size);
    const rows = await all('SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [req.userId, parseInt(size), offset]);
    const unread = await get('SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_read = 0', [req.userId]);
    res.json({ ok: true, data: { list: rows, unread: unread.count } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 标记已读
router.post('/messages/:id/read', authDb, async (req, res) => {
  try {
    await run('UPDATE messages SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ ok: true, message: '已标记为已读' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
