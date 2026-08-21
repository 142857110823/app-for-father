// 后端数据库层 - SQLite
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('数据库连接失败:', err.message);
  else console.log('数据库已连接:', DB_PATH);
});

// 将回调式 API 包装为 Promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// 初始化表结构
async function init() {
  // 用户表
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE,
      password_hash TEXT,
      email TEXT UNIQUE,
      wx_openid TEXT UNIQUE,
      qq_openid TEXT UNIQUE,
      nickname TEXT,
      avatar TEXT,
      gender INTEGER DEFAULT 0,
      birth_year INTEGER,
      birth_month INTEGER,
      birth_day INTEGER,
      birth_hour INTEGER,
      birth_minute INTEGER,
      birth_place TEXT,
      current_place TEXT,
      member_level TEXT DEFAULT 'free',
      member_expire_at INTEGER,
      ai_quota INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      last_login_at INTEGER
    )
  `);

  // 登录凭证表（支持多设备）
  await run(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      device_info TEXT,
      ip TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      expires_at INTEGER NOT NULL,
      revoked INTEGER DEFAULT 0
    )
  `);

  // 排盘历史记录
  await run(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT,
      solar_date TEXT,
      lunar_date TEXT,
      pillars TEXT,
      pan TEXT,
      dun TEXT,
      ju INTEGER,
      gui_shen_zhi TEXT,
      is_night INTEGER,
      result_json TEXT,
      is_favorite INTEGER DEFAULT 0,
      tags TEXT,
      note TEXT,
      deleted INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `);

  // 会员套餐与订单
  await run(`
    CREATE TABLE IF NOT EXISTS membership_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      duration_days INTEGER,
      ai_quota INTEGER DEFAULT 0,
      price_cent INTEGER NOT NULL,
      enabled INTEGER DEFAULT 1
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_no TEXT UNIQUE NOT NULL,
      plan_code TEXT,
      type TEXT DEFAULT 'membership',
      amount_cent INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      paid_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `);

  // AI 对话记录
  await run(`
    CREATE TABLE IF NOT EXISTS ai_chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      history_id INTEGER,
      session_id TEXT,
      role TEXT,
      content TEXT,
      model TEXT,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      feedback INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `);

  // 系统公告与消息
  await run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT DEFAULT 'system',
      priority INTEGER DEFAULT 0,
      published_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      type TEXT DEFAULT 'system',
      is_read INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `);

  // 操作日志
  await run(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      detail TEXT,
      ip TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `);

  // 默认会员套餐
  const plans = [
    { code: 'month', name: '月卡', duration_days: 30, ai_quota: 100, price_cent: 1800 },
    { code: 'year', name: '年卡', duration_days: 365, ai_quota: 1500, price_cent: 12800 },
    { code: 'lifetime', name: '永久会员', duration_days: 99999, ai_quota: 999999, price_cent: 36800 }
  ];
  for (const p of plans) {
    await run(`
      INSERT OR IGNORE INTO membership_plans (code, name, duration_days, ai_quota, price_cent)
      VALUES (?, ?, ?, ?, ?)
    `, [p.code, p.name, p.duration_days, p.ai_quota, p.price_cent]);
  }

  console.log('数据库表初始化完成');
}

module.exports = { db, run, get, all, init };
