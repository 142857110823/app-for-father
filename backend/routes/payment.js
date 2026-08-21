// 支付与会员路由
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db');
const { authDb } = require('../middleware');

const router = express.Router();

// 会员套餐列表
router.get('/plans', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM membership_plans WHERE enabled = 1 ORDER BY price_cent ASC');
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 创建订单
router.post('/orders', authDb, async (req, res) => {
  try {
    const { plan_code } = req.body || {};
    const plan = await get('SELECT * FROM membership_plans WHERE code = ? AND enabled = 1', [plan_code]);
    if (!plan) return res.status(400).json({ ok: false, error: '套餐不存在' });

    const orderNo = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
    const result = await run('INSERT INTO orders (user_id, order_no, plan_code, amount_cent) VALUES (?, ?, ?, ?)', [req.userId, orderNo, plan_code, plan.price_cent]);
    res.json({ ok: true, data: { order_id: result.lastID, order_no: orderNo, plan, amount_cent: plan.price_cent } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 模拟支付回调（生产环境由微信支付/支付宝回调触发）
router.post('/orders/:id/pay', authDb, async (req, res) => {
  try {
    const order = await get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!order) return res.status(404).json({ ok: false, error: '订单不存在' });
    if (order.status === 'paid') return res.json({ ok: true, message: '订单已支付' });

    await run('UPDATE orders SET status = ?, paid_at = ? WHERE id = ?', ['paid', Date.now() / 1000, order.id]);
    const plan = await get('SELECT * FROM membership_plans WHERE code = ?', [order.plan_code]);
    if (plan) {
      const user = await get('SELECT member_expire_at, ai_quota FROM users WHERE id = ?', [req.userId]);
      const now = Date.now() / 1000;
      const base = user.member_expire_at && user.member_expire_at > now ? user.member_expire_at : now;
      const newExpire = base + plan.duration_days * 86400;
      await run('UPDATE users SET member_level = ?, member_expire_at = ?, ai_quota = ai_quota + ? WHERE id = ?', [
        plan.code === 'lifetime' ? 'lifetime' : 'paid',
        newExpire,
        plan.ai_quota,
        req.userId
      ]);
    }
    res.json({ ok: true, message: '支付成功' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 我的订单
router.get('/orders', authDb, async (req, res) => {
  try {
    const rows = await all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
