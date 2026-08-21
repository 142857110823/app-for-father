// 十三宫奇门遁甲 - 本地预览服务器
const express = require('express');
const path = require('path');
const fs = require('fs');
const { fullPaiPan } = require('./algorithm/pillars');

const app = express();
const PORT = 8080;

// 读取 AI API 密钥
let AI_API_KEY = process.env.AI_API_KEY || '';
let AI_BASE_URL = process.env.AI_BASE_URL || 'https://www.juapi.net/v1';
try {
  const keyText = fs.readFileSync(path.join(__dirname, 'API密钥.txt'), 'utf-8');
  const keyLines = keyText.split(/\r?\n/);
  for (const line of keyLines) {
    if (line.startsWith('URL：')) AI_BASE_URL = line.replace('URL：', '').trim();
    if (line.startsWith('API：')) AI_API_KEY = line.replace('API：', '').trim();
  }
} catch (e) {
  console.warn('未能读取 API密钥.txt，将使用环境变量或默认值');
}

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json({ limit: '2mb' }));

// 排盘 API
app.get('/api/paipan', (req, res) => {
  try {
    const y = parseInt(req.query.y);
    const m = parseInt(req.query.m);
    const d = parseInt(req.query.d);
    const h = parseInt(req.query.h);
    const min = parseInt(req.query.min) || 0;
    if (!y || !m || !d || isNaN(h)) {
      return res.json({ ok: false, error: '参数不完整' });
    }
    const result = fullPaiPan(y, m, d, h, min);
    res.json({ ok: true, data: result });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// AI 对话代理 API
app.post('/api/chat', async (req, res) => {
  try {
    if (!AI_API_KEY) {
      return res.status(500).json({ ok: false, error: 'AI API 密钥未配置' });
    }
    const { messages, model = 'deepseek-v4-flash' } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, error: 'messages 不能为空' });
    }
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        stream: false
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ ok: false, error: errText });
    }
    const data = await response.json();
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`道家奇门遁甲预览服务: http://localhost:${PORT}`);
});
