// AI 智能体服务路由
const express = require('express');
const { run, get, all } = require('../db');
const { authDb } = require('../middleware');

const router = express.Router();

// ---------- AI 配置：环境变量/密钥文件 → 数据库，管理员可热更新 ----------
let AI_API_KEY = process.env.AI_API_KEY || '';
let AI_BASE_URL = process.env.AI_BASE_URL || 'https://www.juapi.net/v1';
let AI_MODEL = 'deepseek-v4-flash';
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

const DEFAULT_PROVIDERS = [
  { code: 'juapi',    name: 'JuAPI 聚合中转',   base_url: 'https://www.juapi.net/v1',              models: ['deepseek-v4-flash', 'deepseek-v3', 'gpt-4o-mini', 'claude-sonnet-4-5'] },
  { code: 'deepseek', name: 'DeepSeek 官方',    base_url: 'https://api.deepseek.com/v1',           models: ['deepseek-chat', 'deepseek-reasoner'] },
  { code: 'moonshot', name: 'Kimi (月之暗面)', base_url: 'https://api.moonshot.cn/v1',             models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k', 'kimi-latest'] },
  { code: 'zhipu',    name: '智谱 GLM',         base_url: 'https://open.bigmodel.cn/api/paas/v4',   models: ['glm-4-plus', 'glm-4-air', 'glm-4-flash'] },
  { code: 'aliyun',   name: '阿里云百炼',       base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-plus', 'qwen-max', 'qwen-turbo'] },
  { code: 'custom',   name: '自定义接口',       base_url: '',                                       models: [] },
];

async function loadAiConfig() {
  const row = await get('SELECT value FROM settings WHERE key = ?', ['ai_config']);
  if (row && row.value) {
    try {
      const cfg = JSON.parse(row.value);
      if (cfg.base_url) AI_BASE_URL = cfg.base_url;
      if (cfg.api_key) AI_API_KEY = cfg.api_key;
      if (cfg.model) AI_MODEL = cfg.model;
    } catch (e) { /* 配置损坏时回退环境变量 */ }
  }
}

async function saveAiConfig(cfg) {
  await run(`INSERT INTO settings (key, value, updated_at) VALUES ('ai_config', ?, strftime('%s','now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [JSON.stringify(cfg)]);
  if (cfg.base_url) AI_BASE_URL = cfg.base_url;
  if (cfg.api_key) AI_API_KEY = cfg.api_key;
  if (cfg.model) AI_MODEL = cfg.model;
}

// AI 配置查询（脱敏：不返回密钥）
router.get('/config', async (req, res) => {
  try { await loadAiConfig(); } catch (e) { /* 表未就绪时用环境变量默认值 */ }
  res.json({
    ok: true,
    data: {
      base_url: AI_BASE_URL,
      model: AI_MODEL,
      has_key: Boolean(AI_API_KEY),
      providers: DEFAULT_PROVIDERS.map(p => ({ code: p.code, name: p.name, base_url: p.base_url, models: p.models })),
    }
  });
});

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
    await loadAiConfig();
    if (!AI_API_KEY) return res.status(500).json({ ok: false, error: 'AI API 密钥未配置' });

    const { messages, model, history_id, session_id } = req.body || {};
    const useModel = model || AI_MODEL;
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
      body: JSON.stringify({ model: useModel, messages, temperature: 0.7, stream: false })
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
      req.userId, history_id || null, session_id || null, 'user', lastUser ? lastUser.content : '', useModel
    ]);
    await run('INSERT INTO ai_chats (user_id, history_id, session_id, role, content, model) VALUES (?, ?, ?, ?, ?, ?)', [
      req.userId, history_id || null, session_id || null, 'assistant', content, useModel
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
module.exports._internals = { loadAiConfig, saveAiConfig, getAiState: () => ({ AI_BASE_URL, AI_MODEL, hasKey: Boolean(AI_API_KEY) }) };
