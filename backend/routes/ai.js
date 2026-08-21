// AI 智能体服务路由
const express = require('express');
const { run, get, all } = require('../db');
const { authDb } = require('../middleware');

const router = express.Router();

let AI_API_KEY = process.env.AI_API_KEY || '';
let AI_BASE_URL = process.env.AI_BASE_URL || 'https://www.juapi.net/v1';
try {
  const fs = require('fs');
  const path = require('path');
  const keyText = fs.readFileSync(path.join(__dirname, '..', '..', 'API密钥.txt'), 'utf-8');
  const keyLines = keyText.split(/\r?\n/);
  for (const line of keyLines) {
    if (line.startsWith('URL：')) AI_BASE_URL = line.replace('URL：', '').trim();
    if (line.startsWith('API：')) AI_API_KEY = line.replace('API：', '').trim();
  }
} catch (e) {
  // ignore
}

// 查询剩余额度
router.get('/quota', authDb, async (req, res) => {
  try {
    const user = await get('SELECT ai_quota, member_level, member_expire_at FROM users WHERE id = ?', [req.userId]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const usedRow = await get('SELECT COUNT(*) as used FROM ai_chats WHERE user_id = ? AND created_at > ?', [req.userId, today.getTime() / 1000]);
    res.json({ ok: true, data: { ai_quota: user.ai_quota, used_today: usedRow.used, member_level: user.member_level } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// AI 对话
router.post('/chat', authDb, async (req, res) => {
  try {
    if (!AI_API_KEY) return res.status(500).json({ ok: false, error: 'AI API 密钥未配置' });

    const { messages, model = 'deepseek-v4-flash', history_id, session_id } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, error: 'messages 不能为空' });
    }

    // 额度检查
    const user = await get('SELECT ai_quota FROM users WHERE id = ?', [req.userId]);
    if (user.ai_quota <= 0) return res.status(403).json({ ok: false, error: 'AI 对话额度不足' });

    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({ model, messages, temperature: 0.7, stream: false })
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ ok: false, error: errText });
    }
    const data = await response.json();
    const content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';

    // 保存对话记录
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    await run('INSERT INTO ai_chats (user_id, history_id, session_id, role, content, model) VALUES (?, ?, ?, ?, ?, ?)', [
      req.userId, history_id || null, session_id || null, 'user', lastUser ? lastUser.content : '', model
    ]);
    await run('INSERT INTO ai_chats (user_id, history_id, session_id, role, content, model) VALUES (?, ?, ?, ?, ?, ?)', [
      req.userId, history_id || null, session_id || null, 'assistant', content, model
    ]);

    // 扣减额度
    await run('UPDATE users SET ai_quota = ai_quota - 1 WHERE id = ?', [req.userId]);

    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 对话历史列表
router.get('/chats', authDb, async (req, res) => {
  try {
    const { session_id, page = 1, size = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(size);
    const conditions = ['user_id = ?'];
    const params = [req.userId];
    if (session_id) { conditions.push('session_id = ?'); params.push(session_id); }
    const where = conditions.join(' AND ');
    const rows = await all(`SELECT * FROM ai_chats WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(size), offset]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 反馈
router.post('/feedback', authDb, async (req, res) => {
  try {
    const { chat_id, feedback } = req.body || {};
    if (!chat_id || ![1, -1].includes(feedback)) return res.status(400).json({ ok: false, error: '参数错误' });
    await run('UPDATE ai_chats SET feedback = ? WHERE id = ? AND user_id = ?', [feedback, chat_id, req.userId]);
    res.json({ ok: true, message: '反馈已记录' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
