// 用户资料路由
const express = require('express');
const { run, get } = require('../db');
const { authDb } = require('../middleware');

const router = express.Router();

router.get('/profile', authDb, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ ok: false, error: '用户不存在' });
    res.json({ ok: true, data: publicUser(user) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/profile', authDb, async (req, res) => {
  try {
    const fields = ['nickname', 'avatar', 'gender', 'birth_year', 'birth_month', 'birth_day', 'birth_hour', 'birth_minute', 'birth_place', 'current_place'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ ok: false, error: '没有可更新的字段' });
    values.push(req.userId);
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    const user = await get('SELECT * FROM users WHERE id = ?', [req.userId]);
    res.json({ ok: true, data: publicUser(user) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

function publicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    nickname: user.nickname,
    avatar: user.avatar,
    gender: user.gender,
    birth_year: user.birth_year,
    birth_month: user.birth_month,
    birth_day: user.birth_day,
    birth_hour: user.birth_hour,
    birth_minute: user.birth_minute,
    birth_place: user.birth_place,
    current_place: user.current_place,
    member_level: user.member_level,
    member_expire_at: user.member_expire_at,
    ai_quota: user.ai_quota,
    created_at: user.created_at,
    last_login_at: user.last_login_at
  };
}

module.exports = router;
