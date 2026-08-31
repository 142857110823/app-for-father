const express = require('express');
const path = require('path');
const fs = require('fs');
const { fullPaiPan } = require('./algorithm/pillars');
const { init } = require('./backend/db');
const { authDb } = require('./backend/middleware');
const authRouter = require('./backend/routes/auth');
const userRouter = require('./backend/routes/user');
const historyRouter = require('./backend/routes/history');
const aiRouter = require('./backend/routes/ai');
const paymentRouter = require('./backend/routes/payment');
const notificationRouter = require('./backend/routes/notification');
const adminRouter = require('./backend/routes/admin');

const app = express();
const PORT = process.env.PORT || 8090;

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
process.env.AI_API_KEY = AI_API_KEY;
process.env.AI_BASE_URL = AI_BASE_URL;

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  // CORS：允许 GitHub Pages 等静态站点跨域调用本机 AI 接口
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// 管理后台路由
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use('/books', express.static(path.join(__dirname, 'docs', 'books'), {
  immutable: true,
  maxAge: '1y'
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '2mb' }));

// 后端 API 路由
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/history', historyRouter);
app.use('/api/ai', aiRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/notification', notificationRouter);
app.use('/api/admin', adminRouter);

// 排盘 API（兼容旧版，无需登录）
app.get('/api/paipan', authDb, (req, res) => {
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

// AI 对话代理 API（兼容旧版，无需登录）
app.post('/api/chat', authDb, async (req, res) => {
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

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// 启动：先初始化数据库
init().then(() => {
  app.listen(PORT, () => {
    console.log(`道家奇门遁甲服务: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('服务启动失败:', err);
  process.exit(1);
});
