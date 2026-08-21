// 排盘历史记录路由
const express = require('express');
const { run, get, all } = require('../db');
const { authDb } = require('../middleware');

const router = express.Router();

router.post('/', authDb, async (req, res) => {
  try {
    const record = req.body || {};
    const cols = ['user_id', 'title', 'solar_date', 'lunar_date', 'pillars', 'pan', 'dun', 'ju', 'gui_shen_zhi', 'is_night', 'result_json', 'tags', 'note'];
    const values = [
      req.userId,
      record.title || '',
      record.solar_date || '',
      record.lunar_date || '',
      record.pillars || '',
      record.pan || '',
      record.dun || '',
      record.ju || 0,
      record.gui_shen_zhi || '',
      record.is_night ? 1 : 0,
      JSON.stringify(record.result_json || {}),
      record.tags || '',
      record.note || ''
    ];
    const result = await run(`INSERT INTO history (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, values);
    res.json({ ok: true, data: { id: result.lastID } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/', authDb, async (req, res) => {
  try {
    const { page = 1, size = 20, keyword = '', favorite = '', sort = 'newest' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(size);
    const conditions = ['deleted = 0 AND user_id = ?'];
    const params = [req.userId];
    if (keyword) {
      conditions.push('(title LIKE ? OR tags LIKE ? OR note LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (favorite === '1') {
      conditions.push('is_favorite = 1');
    }
    const orderBy = sort === 'oldest' ? 'created_at ASC' : 'created_at DESC';
    const where = conditions.join(' AND ');
    const rows = await all(`SELECT * FROM history WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, parseInt(size), offset]);
    const countRow = await get(`SELECT COUNT(*) as total FROM history WHERE ${where}`, params);
    res.json({
      ok: true,
      data: {
        list: rows.map(formatHistory),
        total: countRow.total,
        page: parseInt(page),
        size: parseInt(size)
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/:id', authDb, async (req, res) => {
  try {
    const row = await get('SELECT * FROM history WHERE id = ? AND user_id = ? AND deleted = 0', [req.params.id, req.userId]);
    if (!row) return res.status(404).json({ ok: false, error: '记录不存在' });
    res.json({ ok: true, data: formatHistory(row) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/:id', authDb, async (req, res) => {
  try {
    const { title, is_favorite, tags, note } = req.body || {};
    const updates = [];
    const values = [];
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (is_favorite !== undefined) { updates.push('is_favorite = ?'); values.push(is_favorite ? 1 : 0); }
    if (tags !== undefined) { updates.push('tags = ?'); values.push(tags); }
    if (note !== undefined) { updates.push('note = ?'); values.push(note); }
    if (updates.length === 0) return res.status(400).json({ ok: false, error: '没有可更新的字段' });
    values.push(req.params.id, req.userId);
    await run(`UPDATE history SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    res.json({ ok: true, message: '已更新' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete('/:id', authDb, async (req, res) => {
  try {
    await run('UPDATE history SET deleted = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ ok: true, message: '已删除' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

function formatHistory(row) {
  return {
    id: row.id,
    title: row.title,
    solar_date: row.solar_date,
    lunar_date: row.lunar_date,
    pillars: row.pillars,
    pan: row.pan,
    dun: row.dun,
    ju: row.ju,
    gui_shen_zhi: row.gui_shen_zhi,
    is_night: row.is_night,
    result_json: safeJson(row.result_json),
    is_favorite: row.is_favorite,
    tags: row.tags,
    note: row.note,
    created_at: row.created_at
  };
}

function safeJson(str) {
  try { return JSON.parse(str); } catch (e) { return {}; }
}

module.exports = router;
