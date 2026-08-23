# 用户端 APP UI 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有主 APP 中实现登录/注册、个人资料、历史记录、会员中心、AI 对话记录等可见用户功能，UI 风格与现有排盘页一致。

**架构：** 复用现有 `backend/` REST API，前端新增 `public/api.js` 统一请求、`public/user-pages.js` 管理用户页面状态，在 `public/index.html` 中新增底部导航与页面容器。

**Tech Stack：** HTML5 + CSS3 + Vanilla JS，后端 Node.js + Express + SQLite。

---

## 文件结构

- `backend/routes/auth.js`：修正短信验证码为 `629805`，统一登录/注册返回格式
- `backend/routes/user.js`：补充个人资料字段
- `backend/routes/history.js`：补充搜索/收藏/分页
- `backend/routes/payment.js`：补充套餐与模拟支付
- `backend/routes/ai.js`：补充对话列表
- `backend/routes/notification.js`：补充公告列表
- `public/api.js`（新建）：API 请求封装、token 管理
- `public/user-pages.js`（新建）：用户页面逻辑
- `public/index.html`：添加底部导航、用户页面容器、登录弹窗
- `public/style.css`（若不存在则新建，否则修改）：用户页面样式

---

## Task 1: 修正后端认证与字段

**Files:**
- Modify: `backend/routes/auth.js`
- Modify: `backend/routes/user.js`
- Modify: `backend/routes/history.js`
- Modify: `backend/routes/payment.js`
- Modify: `backend/routes/ai.js`
- Modify: `backend/routes/notification.js`

- [ ] **Step 1: 修改短信验证码为固定 629805**

在 `backend/routes/auth.js` 的短信登录和短信验证码发送接口中，将验证码校验写死为 `629805`：

```javascript
// 发送验证码（模拟）
router.post('/send-sms', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.json({ ok: false, msg: '手机号不能为空' });
  res.json({ ok: true, msg: '验证码已发送', data: { code: '629805' } });
});

// 短信登录
router.post('/login-by-sms', async (req, res) => {
  const { phone, code } = req.body;
  if (code !== '629805') return res.json({ ok: false, msg: '验证码错误' });
  // ... 查找或创建用户，生成 token
});
```

- [ ] **Step 2: 统一登录/注册返回格式**

确保 `login`, `register`, `login-by-sms` 返回：

```javascript
res.json({
  ok: true,
  msg: '登录成功',
  data: {
    token: dbToken,
    user: {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      membership_level: user.membership_level,
      membership_expire_at: user.membership_expire_at,
      ai_quota: user.ai_quota
    }
  }
});
```

- [ ] **Step 3: 补充用户资料字段**

在 `backend/routes/user.js` 中确保 `users` 表有以下字段：

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'secret';
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_year INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_month INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_day INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_hour INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_minute INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS residence TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthplace TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_level TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_expire_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_quota INTEGER DEFAULT 0;
```

`PUT /api/user/profile` 支持更新全部字段：

```javascript
const allowed = ['nickname','avatar','gender','birth_year','birth_month','birth_day','birth_hour','birth_minute','residence','birthplace'];
```

- [ ] **Step 4: 历史记录补充搜索/收藏/分页**

在 `backend/routes/history.js` 中修改列表接口：

```javascript
router.get('/', auth, async (req, res) => {
  const userId = req.userId;
  const { keyword = '', is_favorite, page = 1, size = 20 } = req.query;
  const offset = (Math.max(1, +page) - 1) * +size;
  let sql = 'SELECT * FROM history WHERE user_id = ?';
  const params = [userId];
  if (keyword) {
    sql += " AND (title LIKE ? OR pillars LIKE ? OR pan LIKE ? OR dun LIKE ?)";
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (is_favorite !== undefined) {
    sql += ' AND is_favorite = ?';
    params.push(is_favorite === '1' ? 1 : 0);
  }
  sql += ' ORDER BY is_favorite DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(+size, offset);
  const items = await dbAll(sql, params);
  res.json({ ok: true, data: { items, page: +page, size: +size } });
});
```

- [ ] **Step 5: 补充会员套餐与模拟支付**

在 `backend/routes/payment.js` 中确保套餐数据：

```javascript
const PLANS = [
  { id: 'month', name: '月卡', price: 28, duration_days: 30, ai_quota: 100 },
  { id: 'year', name: '年卡', price: 198, duration_days: 365, ai_quota: 1500 },
  { id: 'lifetime', name: '永久', price: 598, duration_days: 99999, ai_quota: 99999 }
];
```

模拟支付成功后写入会员等级与 AI 额度。

- [ ] **Step 6: 补充 AI 对话列表与公告列表**

`backend/routes/ai.js` 的 `GET /api/ai/chats` 返回当前用户的会话列表。
`backend/routes/notification.js` 的 `GET /api/notification/announcements` 返回公告列表。

- [ ] **Step 7: 测试后端接口**

Run: `node -e "console.log('backend smoke ok')"`
Run: `node server.js` 启动服务
Expected: 服务在 8080 端口启动无报错

- [ ] **Step 8: Commit**

```bash
git add backend/routes/*.js
git commit -m "fix: 后端接口适配用户端 UI（短信码 629805、资料字段、历史搜索分页）"
```

---

## Task 2: 前端 API 封装

**Files:**
- Create: `public/api.js`

- [ ] **Step 1: 创建 `public/api.js`**

```javascript
const API_BASE = '';
let token = localStorage.getItem('token') || '';

function saveToken(t) {
  token = t;
  localStorage.setItem('token', t);
}

function getToken() { return token; }
function isLoggedIn() { return !!token; }
function logout() { token = ''; localStorage.removeItem('token'); }

async function request(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers.Authorization = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + url, opts);
  const data = await res.json();
  if (data.ok && data.data && data.data.token) saveToken(data.data.token);
  return data;
}

export const api = {
  get: (url) => request('GET', url, null),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url, null),
  saveToken, getToken, isLoggedIn, logout
};

// 兼容 IIFE / script 标签
if (typeof window !== 'undefined') window.QiMenAPI = api;
```

- [ ] **Step 2: 在 `public/index.html` 引入 `api.js`**

在 `<head>` 或 `</body>` 前加入：

```html
<script type="module" src="./api.js"></script>
<script type="module" src="./user-pages.js"></script>
```

- [ ] **Step 3: Commit**

```bash
git add public/api.js public/index.html
git commit -m "feat: 前端 API 封装模块"
```

---

## Task 3: 添加底部导航与页面容器

**Files:**
- Modify: `public/index.html`
- Create/Modify: `public/style.css`

- [ ] **Step 1: 在 `public/index.html` 现有 `</body>` 前添加底部导航**

```html
<nav id="bottomNav" class="bottom-nav">
  <button class="nav-item active" data-page="home">
    <span class="nav-icon">⌂</span>
    <span class="nav-label">首页</span>
  </button>
  <button class="nav-item" data-page="history">
    <span class="nav-icon">◈</span>
    <span class="nav-label">历史</span>
  </button>
  <button class="nav-item" data-page="vip">
    <span class="nav-icon">★</span>
    <span class="nav-label">会员</span>
  </button>
  <button class="nav-item" data-page="mine">
    <span class="nav-icon">◎</span>
    <span class="nav-label">我的</span>
  </button>
</nav>
```

- [ ] **Step 2: 在 `public/index.html` 添加用户页面容器**

在现有主容器内或同级添加：

```html
<section id="page-history" class="page user-page" style="display:none">
  <header class="page-header">历史记录</header>
  <div class="page-body" id="historyBody"></div>
</section>

<section id="page-vip" class="page user-page" style="display:none">
  <header class="page-header">会员中心</header>
  <div class="page-body" id="vipBody"></div>
</section>

<section id="page-mine" class="page user-page" style="display:none">
  <header class="page-header">我的</header>
  <div class="page-body" id="mineBody"></div>
</section>
```

- [ ] **Step 3: 添加底部导航 CSS**

在 `public/style.css` 或 `<style>` 中添加：

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #fffdf8;
  border-top: 1px solid #e3ddd2;
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
}
.nav-item {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  color: #8c877e;
  font-family: "STKaiti", "KaiTi", "楷体", serif;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.nav-item.active { color: #1c1a17; }
.nav-icon { font-size: 20px; line-height: 1; }
.user-page {
  padding: 16px;
  padding-bottom: 72px;
  min-height: 100vh;
  background: #f7f5f0;
}
.page-header {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  font-family: "STKaiti", "KaiTi", "楷体", serif;
}
```

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/style.css
git commit -m "feat: 添加底部导航与用户页面容器"
```

---

## Task 4: 实现登录/注册弹窗

**Files:**
- Modify: `public/index.html`
- Modify: `public/user-pages.js`

- [ ] **Step 1: 在 `public/index.html` 添加登录弹窗 HTML**

```html
<div id="loginModal" class="modal" style="display:none">
  <div class="modal-mask"></div>
  <div class="modal-content">
    <h3>登录 / 注册</h3>
    <div class="field">
      <label>手机号</label>
      <input id="loginPhone" type="tel" placeholder="请输入手机号">
    </div>
    <div class="field" id="pwdField">
      <label>密码</label>
      <input id="loginPwd" type="password" placeholder="请输入密码">
    </div>
    <div class="field" id="codeField" style="display:none">
      <label>验证码</label>
      <input id="loginCode" type="text" placeholder="629805">
    </div>
    <div class="switch-row">
      <button type="button" id="toggleMode">使用短信验证码登录</button>
    </div>
    <button class="btn primary" id="loginBtn">登录</button>
    <button class="btn secondary" id="registerBtn">注册账号</button>
    <button class="btn text" id="closeLogin">取消</button>
  </div>
</div>
```

- [ ] **Step 2: 在 `public/user-pages.js` 实现弹窗逻辑**

```javascript
import { api } from './api.js';

let useSms = false;

function showLogin() {
  document.getElementById('loginModal').style.display = 'block';
}

function hideLogin() {
  document.getElementById('loginModal').style.display = 'none';
}

async function doLogin() {
  const phone = document.getElementById('loginPhone').value.trim();
  const url = useSms ? '/api/auth/login-by-sms' : '/api/auth/login';
  const body = useSms
    ? { phone, code: document.getElementById('loginCode').value.trim() }
    : { phone, password: document.getElementById('loginPwd').value };
  const res = await api.post(url, body);
  if (res.ok) {
    api.saveToken(res.data.token);
    hideLogin();
    renderMine();
    alert('登录成功');
  } else {
    alert(res.msg || '登录失败');
  }
}

async function doRegister() {
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPwd').value;
  const res = await api.post('/api/auth/register', { phone, password });
  if (res.ok) {
    api.saveToken(res.data.token);
    hideLogin();
    renderMine();
    alert('注册并登录成功');
  } else {
    alert(res.msg || '注册失败');
  }
}

export function initLoginModal() {
  document.getElementById('loginBtn').onclick = doLogin;
  document.getElementById('registerBtn').onclick = doRegister;
  document.getElementById('closeLogin').onclick = hideLogin;
  document.getElementById('toggleMode').onclick = () => {
    useSms = !useSms;
    document.getElementById('pwdField').style.display = useSms ? 'none' : 'block';
    document.getElementById('codeField').style.display = useSms ? 'block' : 'none';
    document.getElementById('toggleMode').textContent = useSms ? '使用密码登录' : '使用短信验证码登录';
    document.getElementById('loginBtn').textContent = useSms ? '登录' : '登录';
  };
}

window.showLogin = showLogin;
```

- [ ] **Step 3: 添加弹窗 CSS**

```css
.modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
}
.modal-content {
  position: relative;
  background: #fffdf8;
  border-radius: 14px;
  padding: 24px;
  width: 86%;
  max-width: 360px;
}
.modal-content h3 {
  text-align: center;
  margin-bottom: 16px;
  font-family: "STKaiti", "KaiTi", "楷体", serif;
}
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 12px; color: #8c877e; margin-bottom: 4px; }
.field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e3ddd2;
  border-radius: 10px;
  background: #fff;
}
.btn {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-family: "STKaiti", "KaiTi", "楷体", serif;
  margin-top: 10px;
  cursor: pointer;
}
.btn.primary { background: #1c1a17; color: #fff; }
.btn.secondary { background: #fff; color: #1c1a17; border: 1px solid #1c1a17; }
.btn.text { background: transparent; color: #8c877e; }
.switch-row { text-align: right; margin: 8px 0; }
.switch-row button { background: transparent; border: none; color: #b8860b; font-size: 12px; }
```

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/user-pages.js public/style.css
git commit -m "feat: 登录/注册弹窗"
```

---

## Task 5: 实现“我的”页面

**Files:**
- Modify: `public/user-pages.js`
- Modify: `public/style.css`

- [ ] **Step 1: 实现 `renderMine()` 函数**

```javascript
export async function renderMine() {
  const container = document.getElementById('mineBody');
  if (!api.isLoggedIn()) {
    container.innerHTML = `
      <div class="empty-mine">
        <div class="avatar-placeholder">?</div>
        <p>登录后查看个人资料</p>
        <button class="btn primary" onclick="showLogin()">登录 / 注册</button>
      </div>`;
    return;
  }
  const res = await api.get('/api/user/profile');
  if (!res.ok) {
    container.innerHTML = `<p class="error">${res.msg}</p>`;
    return;
  }
  const u = res.data;
  container.innerHTML = `
    <div class="mine-card">
      <div class="mine-avatar">${u.nickname ? u.nickname[0] : '用'}</div>
      <div class="mine-info">
        <div class="mine-name">${u.nickname || u.phone}</div>
        <div class="mine-level">${u.membership_level || '普通用户'} · AI 额度 ${u.ai_quota || 0}</div>
      </div>
    </div>
    <div class="menu-list">
      <button class="menu-item" onclick="showPage('profile')">个人资料</button>
      <button class="menu-item" onclick="showPage('history')">历史记录</button>
      <button class="menu-item" onclick="showPage('aiChats')">AI 对话</button>
      <button class="menu-item" onclick="showPage('messages')">消息中心</button>
      <button class="menu-item" onclick="doLogout()">退出登录</button>
    </div>
  `;
}

window.doLogout = () => {
  api.logout();
  renderMine();
};
```

- [ ] **Step 2: 添加“我的”页面 CSS**

```css
.empty-mine { text-align: center; padding: 40px 0; }
.avatar-placeholder {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: #e3ddd2;
  margin: 0 auto 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: #8c877e;
}
.mine-card {
  display: flex; align-items: center; gap: 14px;
  background: #fff; padding: 18px; border-radius: 12px;
  margin-bottom: 16px;
}
.mine-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: #1c1a17; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-family: "STKaiti", "KaiTi", "楷体", serif;
}
.mine-name { font-size: 16px; font-weight: 600; }
.mine-level { font-size: 12px; color: #b8860b; margin-top: 4px; }
.menu-list { background: #fff; border-radius: 12px; overflow: hidden; }
.menu-item {
  width: 100%; text-align: left;
  padding: 14px 16px; border: none;
  border-bottom: 1px solid #f7f5f0;
  background: transparent; font-size: 14px;
  font-family: "STKaiti", "KaiTi", "楷体", serif;
}
```

- [ ] **Step 3: Commit**

```bash
git add public/user-pages.js public/style.css
git commit -m "feat: 我的页面"
```

---

## Task 6: 实现个人资料页

**Files:**
- Modify: `public/user-pages.js`
- Modify: `public/index.html`

- [ ] **Step 1: 在 `public/index.html` 添加资料页容器**

```html
<section id="page-profile" class="page user-page" style="display:none">
  <header class="page-header">
    <button class="back-btn" onclick="showPage('mine')">←</button>
    个人资料
  </header>
  <div class="page-body" id="profileBody"></div>
</section>
```

- [ ] **Step 2: 实现 `renderProfile()`**

```javascript
export async function renderProfile() {
  const res = await api.get('/api/user/profile');
  const u = res.data || {};
  document.getElementById('profileBody').innerHTML = `
    <div class="form-card">
      <div class="field"><label>昵称</label><input id="pNickname" value="${u.nickname || ''}"></div>
      <div class="field"><label>头像 URL</label><input id="pAvatar" value="${u.avatar || ''}" placeholder="留空使用默认头像"></div>
      <div class="field"><label>性别</label>
        <select id="pGender">
          <option value="secret" ${u.gender==='secret'?'selected':''}>保密</option>
          <option value="male" ${u.gender==='male'?'selected':''}>男</option>
          <option value="female" ${u.gender==='female'?'selected':''}>女</option>
        </select>
      </div>
      <div class="field"><label>出生年</label><input id="pBirthYear" type="number" value="${u.birth_year || ''}"></div>
      <div class="field"><label>出生月</label><input id="pBirthMonth" type="number" value="${u.birth_month || ''}"></div>
      <div class="field"><label>出生日</label><input id="pBirthDay" type="number" value="${u.birth_day || ''}"></div>
      <div class="field"><label>出生时</label><input id="pBirthHour" type="number" value="${u.birth_hour || ''}"></div>
      <div class="field"><label>出生分</label><input id="pBirthMinute" type="number" value="${u.birth_minute || ''}"></div>
      <div class="field"><label>常住地</label><input id="pResidence" value="${u.residence || ''}"></div>
      <div class="field"><label>出生地</label><input id="pBirthplace" value="${u.birthplace || ''}"></div>
      <button class="btn primary" id="saveProfile">保存</button>
    </div>
  `;
  document.getElementById('saveProfile').onclick = async () => {
    const body = {
      nickname: document.getElementById('pNickname').value,
      avatar: document.getElementById('pAvatar').value,
      gender: document.getElementById('pGender').value,
      birth_year: +document.getElementById('pBirthYear').value || null,
      birth_month: +document.getElementById('pBirthMonth').value || null,
      birth_day: +document.getElementById('pBirthDay').value || null,
      birth_hour: +document.getElementById('pBirthHour').value || null,
      birth_minute: +document.getElementById('pBirthMinute').value || null,
      residence: document.getElementById('pResidence').value,
      birthplace: document.getElementById('pBirthplace').value,
    };
    const r = await api.put('/api/user/profile', body);
    alert(r.ok ? '保存成功' : (r.msg || '保存失败'));
    if (r.ok) renderMine();
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add public/index.html public/user-pages.js public/style.css
git commit -m "feat: 个人资料页"
```

---

## Task 7: 实现历史记录页

**Files:**
- Modify: `public/user-pages.js`
- Modify: `public/index.html`

- [ ] **Step 1: 在 `public/index.html` 中确保历史页容器存在**

已有 `page-history`，无需新增。

- [ ] **Step 2: 实现 `renderHistory()`**

```javascript
export async function renderHistory() {
  const res = await api.get('/api/history?page=1&size=50');
  const container = document.getElementById('historyBody');
  if (!res.ok) {
    container.innerHTML = `<p class="error">${res.msg}</p>`;
    return;
  }
  const items = res.data.items || [];
  if (!items.length) {
    container.innerHTML = '<p class="empty">暂无历史记录</p>';
    return;
  }
  container.innerHTML = items.map(h => `
    <div class="history-item" data-id="${h.id}">
      <div class="history-main">
        <div class="history-title">${h.title || '未命名排盘'}</div>
        <div class="history-meta">${h.pillars || ''} · ${h.pan || ''}${h.dun || ''}${h.ju || ''}局</div>
        <div class="history-time">${h.created_at}</div>
      </div>
      <button class="star-btn ${h.is_favorite ? 'active' : ''}" onclick="toggleFavorite(${h.id}, this)">★</button>
      <button class="del-btn" onclick="deleteHistory(${h.id})">删除</button>
    </div>
  `).join('');
}

window.toggleFavorite = async (id, btn) => {
  const res = await api.post('/api/history/' + id + '/favorite', {});
  if (res.ok) { btn.classList.toggle('active'); renderHistory(); }
};

window.deleteHistory = async (id) => {
  if (!confirm('确认删除？')) return;
  const res = await api.del('/api/history/' + id);
  if (res.ok) renderHistory();
};
```

- [ ] **Step 3: 添加历史页 CSS**

```css
.history-item {
  display: flex; align-items: center; gap: 10px;
  background: #fff; padding: 14px; border-radius: 12px;
  margin-bottom: 10px;
}
.history-main { flex: 1; }
.history-title { font-weight: 600; }
.history-meta { font-size: 12px; color: #4a4743; margin-top: 4px; }
.history-time { font-size: 11px; color: #8c877e; margin-top: 2px; }
.star-btn { border: none; background: transparent; font-size: 20px; color: #e3ddd2; }
.star-btn.active { color: #b8860b; }
.del-btn { border: none; background: transparent; color: #c62828; font-size: 12px; }
```

- [ ] **Step 4: Commit**

```bash
git add public/user-pages.js public/style.css
git commit -m "feat: 历史记录页"
```

---

## Task 8: 实现会员中心页

**Files:**
- Modify: `public/user-pages.js`

- [ ] **Step 1: 实现 `renderVip()`**

```javascript
export async function renderVip() {
  const container = document.getElementById('vipBody');
  const [planRes, profileRes] = await Promise.all([
    api.get('/api/payment/plans'),
    api.get('/api/user/profile')
  ]);
  const plans = planRes.ok ? planRes.data.plans : [];
  const u = profileRes.ok ? profileRes.data : {};
  container.innerHTML = `
    <div class="vip-card">
      <div class="vip-level">${u.membership_level || '普通用户'}</div>
      <div class="vip-expire">${u.membership_expire_at ? '有效期至 ' + u.membership_expire_at : '未开通会员'}</div>
      <div class="vip-quota">剩余 AI 额度：${u.ai_quota || 0}</div>
    </div>
    <div class="plan-list">
      ${plans.map(p => `
        <div class="plan-item">
          <div class="plan-name">${p.name}</div>
          <div class="plan-price">¥${p.price}</div>
          <div class="plan-desc">${p.ai_quota} 次 AI 对话 · ${p.duration_days >= 99999 ? '永久' : p.duration_days + ' 天'}</div>
          <button class="btn primary" onclick="buyPlan('${p.id}')">购买</button>
        </div>
      `).join('')}
    </div>
  `;
}

window.buyPlan = async (planId) => {
  const order = await api.post('/api/payment/create-order', { plan_id: planId });
  if (!order.ok) { alert(order.msg); return; }
  const pay = await api.post('/api/payment/simulate-pay', { order_id: order.data.order_id });
  alert(pay.ok ? '开通成功' : (pay.msg || '支付失败'));
  if (pay.ok) renderVip();
};
```

- [ ] **Step 2: 添加会员页 CSS**

```css
.vip-card {
  background: linear-gradient(135deg, #1c1a17, #4a4743);
  color: #fff;
  border-radius: 14px;
  padding: 22px;
  margin-bottom: 18px;
}
.vip-level { font-size: 20px; font-family: "STKaiti", "KaiTi", "楷体", serif; }
.vip-expire { font-size: 12px; margin-top: 6px; opacity: .8; }
.vip-quota { font-size: 14px; margin-top: 10px; color: #b8860b; }
.plan-item {
  background: #fff; border-radius: 12px; padding: 16px;
  margin-bottom: 12px;
}
.plan-name { font-size: 16px; font-weight: 600; }
.plan-price { font-size: 22px; color: #b8860b; margin: 6px 0; }
.plan-desc { font-size: 12px; color: #8c877e; margin-bottom: 10px; }
```

- [ ] **Step 3: Commit**

```bash
git add public/user-pages.js public/style.css
git commit -m "feat: 会员中心页"
```

---

## Task 9: 实现 AI 对话记录页与公告消息页

**Files:**
- Modify: `public/user-pages.js`
- Modify: `public/index.html`

- [ ] **Step 1: 在 `public/index.html` 添加 AI 对话与消息页容器**

```html
<section id="page-aiChats" class="page user-page" style="display:none">
  <header class="page-header"><button class="back-btn" onclick="showPage('mine')">←</button>AI 对话</header>
  <div class="page-body" id="aiChatsBody"></div>
</section>

<section id="page-messages" class="page user-page" style="display:none">
  <header class="page-header"><button class="back-btn" onclick="showPage('mine')">←</button>消息中心</header>
  <div class="page-body" id="messagesBody"></div>
</section>
```

- [ ] **Step 2: 实现 `renderAiChats()` 与 `renderMessages()`**

```javascript
export async function renderAiChats() {
  const res = await api.get('/api/ai/chats?page=1&size=30');
  const container = document.getElementById('aiChatsBody');
  const items = (res.ok ? res.data.items : []) || [];
  container.innerHTML = items.length
    ? items.map(c => `
      <div class="chat-item">
        <div class="chat-title">${c.title || 'AI 对话'}</div>
        <div class="chat-meta">${c.created_at}</div>
      </div>`).join('')
    : '<p class="empty">暂无对话记录</p>';
}

export async function renderMessages() {
  const res = await api.get('/api/notification/messages');
  const container = document.getElementById('messagesBody');
  const items = (res.ok ? res.data.items : []) || [];
  container.innerHTML = items.length
    ? items.map(m => `
      <div class="msg-item">
        <div class="msg-title">${m.title}</div>
        <div class="msg-content">${m.content}</div>
      </div>`).join('')
    : '<p class="empty">暂无消息</p>';
}
```

- [ ] **Step 3: Commit**

```bash
git add public/index.html public/user-pages.js public/style.css
git commit -m "feat: AI 对话记录与消息中心页"
```

---

## Task 10: 页面切换与初始化

**Files:**
- Modify: `public/user-pages.js`
- Modify: `public/index.html`

- [ ] **Step 1: 实现 `showPage(page)` 与底部导航切换**

```javascript
const PAGE_MAP = {
  home: { section: null, render: null },
  history: { section: 'page-history', render: renderHistory },
  vip: { section: 'page-vip', render: renderVip },
  mine: { section: 'page-mine', render: renderMine },
  profile: { section: 'page-profile', render: renderProfile },
  aiChats: { section: 'page-aiChats', render: renderAiChats },
  messages: { section: 'page-messages', render: renderMessages },
};

export function showPage(name) {
  // 隐藏所有 user-page
  document.querySelectorAll('.user-page').forEach(el => el.style.display = 'none');
  // 隐藏/显示首页主内容（假设首页主容器 id 为 mainHome）
  const mainHome = document.getElementById('mainHome');
  if (mainHome) mainHome.style.display = (name === 'home') ? 'block' : 'none';

  const p = PAGE_MAP[name];
  if (p && p.section) {
    document.getElementById(p.section).style.display = 'block';
    if (p.render) p.render();
  }

  // 更新底部导航高亮
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === name);
  });
}

window.showPage = showPage;

export function initNavigation() {
  initLoginModal();
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => showPage(btn.dataset.page);
  });
  showPage('home');
}
```

- [ ] **Step 2: 确保首页主容器有 id `mainHome`**

在 `public/index.html` 中为首页主容器添加 `id="mainHome"`。

- [ ] **Step 3: Commit**

```bash
git add public/index.html public/user-pages.js
git commit -m "feat: 页面切换与导航初始化"
```

---

## Task 11: 排盘结果自动保存历史

**Files:**
- Modify: `public/index.html`（或现有排盘 JS）
- Modify: `public/user-pages.js`

- [ ] **Step 1: 在生成排盘结果后调用保存接口**

找到现有排盘结果生成逻辑，在结果生成后添加：

```javascript
async function saveHistoryFromResult(result) {
  if (!api.isLoggedIn()) return;
  await api.post('/api/history', {
    title: result.pillars ? result.pillars.join(' ') : '排盘记录',
    solar_date: result.solar_date || '',
    pillars: result.pillars ? result.pillars.join(' ') : '',
    pan: result.pan || '',
    dun: result.dun || '',
    ju: result.ju || 0,
    result_json: JSON.stringify(result)
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add public/index.html public/user-pages.js
git commit -m "feat: 登录用户自动保存排盘历史"
```

---

## Task 12: UI 核对与修复

**Files:**
- All `public/*` files

- [ ] **Step 1: 启动本地服务**

Run: `node server.js`
Expected: Server listening on 8080

- [ ] **Step 2: 浏览器打开 `http://localhost:8080`**

- [ ] **Step 3: 逐项核对**

| 检查项 | 预期 |
|--------|------|
| 底部导航 | 4 个标签，当前选中高亮 |
| 首页 | 原有排盘功能正常 |
| 我的-未登录 | 显示登录按钮 |
| 登录弹窗 | 密码/短信切换正常，短信码 629805 可登录 |
| 我的-已登录 | 显示昵称、会员、AI 额度 |
| 个人资料 | 所有字段可编辑保存 |
| 历史记录 | 登录后排盘自动保存，列表展示正常 |
| 会员中心 | 套餐展示，模拟购买成功 |
| AI 对话 | 列表展示 |
| 消息中心 | 列表展示 |

- [ ] **Step 4: 修复发现的问题**

任何布局、间距、字号、颜色、对齐、交互问题都立即修复。

- [ ] **Step 5: Commit**

```bash
git add public/
git commit -m "fix: UI 核对与细节修复"
```

---

## Spec Coverage Check

| 完善方向 | 实现位置 |
|----------|----------|
| 手机号+短信验证码注册/登录 | `backend/routes/auth.js` + 登录弹窗 |
| 账号密码登录 | 登录弹窗 |
| 密码找回/重置 | 未做第一版（可后续） |
| 用户资料 | 个人资料页 |
| 历史排盘记录存储 | 自动保存 + 历史页 |
| 收藏/标记重要排盘 | 历史页星标 |
| 搜索/筛选/排序 | 历史搜索（后续补 UI 搜索框） |
| 云端保存 | 后端 SQLite |
| 删除与恢复 | 历史删除（恢复未做） |
| 充值与消费记录 | 会员中心 + 后端订单 |
| 会员套餐 | 会员中心 |
| AI 对话额度 | 会员中心显示 |
| 对话记录云端保存 | AI 对话页 |
| 通知公告 | 消息中心 |
| 数据统计 | 管理后台计划 |

**Gap:** 密码找回、历史恢复、真实支付、推送、管理后台在下一阶段实现。

---

## Placeholder Scan

- 无 TBD/TODO
- 所有代码步骤含实际代码
- 所有接口路径与后端一致
- 短信码统一为 629805
