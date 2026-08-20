// 十三宫奇门遁甲 - 本地预览服务器
const express = require('express');
const path = require('path');
const { fullPaiPan } = require('./algorithm/pillars');

const app = express();
const PORT = 8080;

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

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

app.listen(PORT, () => {
  console.log(`十三宫奇门遁甲预览服务: http://localhost:${PORT}`);
});
