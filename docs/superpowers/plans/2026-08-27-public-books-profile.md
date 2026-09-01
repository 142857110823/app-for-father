# 公开访问 + 书院阅读 + 我的页面优化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让书院精选书籍支持在线阅读，部署公开可访问网址，并重新设计【我的】页面视觉。

**Architecture:** 在前端阅读器层新增 `openByUrl` 能力，使 EPUB 可通过服务器 URL 直接渲染；每本书同时提供【阅读】和【下载离线】入口。将项目部署到 Render 免费 Web Service 提供长期公开链接。我的页面改为“头部卡片 + 数据区 + 宫格入口 + 分组列表”结构。

**Tech Stack:** Express + Node.js、epub.js、IndexedDB、Render、GitHub。

---

## 文件结构

| 文件 | 责任 |
|------|------|
| `public/school-reader.js` | 新增 `openByUrl`、支持本地 blob / 远程 URL 双源 |
| `public/school-app.js` | 渲染【阅读】【下载离线】双按钮、事件分发 |
| `public/index.html` | 重写 `#page-profile`、同步书院按钮相关 HTML |
| `index.html` | 同步 `public/index.html` 的修改 |
| `docs/index.html` | 同步 `public/index.html` 的修改 |
| `public/user-pages.js` | 新增我的页面数据绑定（排盘次数、收藏数等） |
| `tests/school-reader.test.js` | 新增 `openByUrl` 单元测试 |
| `tests/school-integration.test.js` | 新增双按钮交互测试 |
| `package.json` | 确认 `start` 脚本 |
| `README.md` | 补充 Render 部署说明 |
| `work-flow.md` | 记录本次实施节点 |

---

## Task 1: SchoolReader 支持 openByUrl

**Files:**
- Modify: `public/school-reader.js`
- Test: `tests/school-reader.test.js`

### 步骤

- [ ] **Step 1: 写失败测试**

```javascript
// tests/school-reader.test.js
const { SchoolReader } = require('../public/school-reader.js');

test('SchoolReader exposes openByUrl method', () => {
  const reader = new SchoolReader({ store: {}, catalog: [] });
  expect(typeof reader.openByUrl).toBe('function');
});
```

Run: `npx jest tests/school-reader.test.js -t "exposes openByUrl"`
Expected: FAIL "Expected 'function', Received 'undefined'"

- [ ] **Step 2: 实现 openByUrl**

在 `public/school-reader.js` 中，在 `open(bookId)` 方法旁新增：

```javascript
async openByUrl(bookId, url) {
  if (!globalScope.document || typeof globalScope.ePub !== 'function') {
    throw new Error('电子书阅读器未加载');
  }
  this.currentBookId = bookId;
  this._ensureShell();
  this._bindToolbar();
  this.book = globalScope.ePub(url, { openAs: 'epub' });
  this.rendition = this.book.renderTo(this._stageEl(), {
    width: '100%',
    height: '100%',
    flow: 'paginated',
    manager: 'default'
  });
  await this._applyTheme();
  await this._applyFontScale();
  await this._loadCatalog();
  await this._restoreLocation();
  this._bindProgressEvents();
  return this.book;
}
```

并将原 `open(bookId)` 重构为优先使用本地 blob，回退到 URL：

```javascript
async open(bookId) {
  if (!globalScope.document || typeof globalScope.ePub !== 'function') {
    throw new Error('电子书阅读器未加载');
  }
  const localBook = await this.store.getBook(bookId);
  const bookMeta = this.catalog.find(b => b.id === bookId);
  const url = bookMeta && bookMeta.downloadUrls && bookMeta.downloadUrls[0];
  if (localBook && localBook.blob) {
    return this.openByUrl(bookId, URL.createObjectURL(localBook.blob));
  }
  if (url) {
    return this.openByUrl(bookId, url);
  }
  throw new Error('请先下载本书或检查下载地址');
}
```

Run: `npx jest tests/school-reader.test.js -t "exposes openByUrl"`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add public/school-reader.js tests/school-reader.test.js
git commit -m "feat(reader): add openByUrl for online EPUB reading"
```

---

## Task 2: SchoolApp 渲染双按钮

**Files:**
- Modify: `public/school-app.js`
- Modify: `public/index.html`（按钮容器类名）
- Test: `tests/school-integration.test.js`

### 步骤

- [ ] **Step 1: 写失败测试**

```javascript
// tests/school-integration.test.js
const html = require('fs').readFileSync('./public/index.html', 'utf8');

test('featured book cards have both read and download buttons', () => {
  expect(html).toMatch(/data-action="read"/);
  expect(html).toMatch(/data-action="download"/);
});
```

Run: `npx jest tests/school-integration.test.js -t "both read and download"`
Expected: FAIL

- [ ] **Step 2: 修改 school-app.js 模板**

在 `public/school-app.js` 的 `renderSchoolLibrary` 函数中，把按钮区改为：

```javascript
const isReady = state.status === 'ready';
const isDownloading = state.status === 'downloading';
const readLabel = '阅读';
const downloadLabel = isReady ? '已下载' : isDownloading ? '下载中' : state.status === 'error' ? '重试' : '下载离线';

return `
  ...
  <div class="school-book-controls">
    <button class="school-book-read" data-action="read" data-book-id="${escapeHtml(book.id)}">${readLabel}</button>
    <button class="school-book-download" data-action="download" data-status="${state.status}" data-book-id="${escapeHtml(book.id)}">${downloadLabel}</button>
    ${isReady ? '<button class="school-book-remove" data-action="remove" title="删除离线文件" aria-label="删除离线文件">×</button>' : ''}
  </div>`;
```

- [ ] **Step 3: 修改 handleBookAction 分发逻辑**

```javascript
function handleBookAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const bookId = btn.dataset.bookId;
  const book = runtimeCatalog.find(b => b.id === bookId);
  if (!book) return;

  if (action === 'read') {
    reader.open(bookId).catch(err => {
      console.error('打开书籍失败', err);
      showToast('打开失败，请尝试下载离线版本');
    });
    return;
  }
  if (action === 'download') {
    manager.startDownload(book);
    renderSchoolLibrary();
    return;
  }
  // ... 保留 remove 等其他分支
}
```

- [ ] **Step 4: 更新 index.html 中静态回退按钮**

在 `public/index.html` 搜索 `school-book-action` 相关硬编码（如有），替换为 `school-book-read` / `school-book-download` 两个按钮。

Run: `npx jest tests/school-integration.test.js -t "both read and download"`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add public/school-app.js public/index.html tests/school-integration.test.js
git commit -m "feat(school): add online read and offline download buttons"
```

---

## Task 3: 我的页面重设计

**Files:**
- Modify: `public/index.html`（`#page-profile` 区域）
- Modify: `public/user-pages.js`
- Modify: `index.html`、`docs/index.html`

### 步骤

- [ ] **Step 1: 重写 #page-profile HTML**

在 `public/index.html` 中，把现有 `#page-profile` 替换为：

```html
<section class="page page-profile" id="page-profile" style="display:none">
  <div class="profile-header">
    <div class="profile-avatar">道</div>
    <div class="profile-info">
      <div class="profile-name" id="profile-name">用户 _905</div>
      <div class="profile-id" id="profile-id">ID: 6350_905</div>
    </div>
    <button class="profile-settings" onclick="showPage('settings')" aria-label="设置">⚙</button>
  </div>

  <div class="profile-stats">
    <div class="profile-stat">
      <div class="profile-stat-value" id="profile-paipan-count">0</div>
      <div class="profile-stat-label">排盘</div>
    </div>
    <div class="profile-stat">
      <div class="profile-stat-value" id="profile-fav-count">0</div>
      <div class="profile-stat-label">收藏</div>
    </div>
    <div class="profile-stat">
      <div class="profile-stat-value" id="profile-study-days">0</div>
      <div class="profile-stat-label">学习天</div>
    </div>
    <div class="profile-stat">
      <div class="profile-stat-value" id="profile-vip-status">未</div>
      <div class="profile-stat-label">会员</div>
    </div>
  </div>

  <div class="profile-grid">
    <div class="profile-grid-item" onclick="showPage('favorites')">
      <div class="profile-grid-icon">藏</div>
      <div class="profile-grid-label">我的收藏</div>
    </div>
    <div class="profile-grid-item" onclick="showPage('messages')">
      <div class="profile-grid-icon">邮</div>
      <div class="profile-grid-label">我的消息</div>
    </div>
    <div class="profile-grid-item" onclick="showPage('history')">
      <div class="profile-grid-icon">历</div>
      <div class="profile-grid-label">阅读历史</div>
    </div>
    <div class="profile-grid-item" onclick="toggleTraditionalChinese()">
      <div class="profile-grid-icon" id="profile-trad-icon">繁</div>
      <div class="profile-grid-label" id="profile-trad-label">简繁转换</div>
    </div>
  </div>

  <div class="profile-group">
    <div class="profile-group-title">工具箱</div>
    <div class="profile-tools">
      <div class="profile-tool" onclick="showTool('bazi')">四柱八字</div>
      <div class="profile-tool" onclick="showTool('ziwei')">紫微斗数</div>
      <div class="profile-tool" onclick="showTool('meihua')">梅花易数</div>
      <div class="profile-tool" onclick="showTool('daliuren')">大六壬</div>
    </div>
  </div>

  <div class="profile-group">
    <div class="profile-group-title">系统</div>
    <div class="profile-list" id="profile-basic-settings">
      <div class="profile-list-item" onclick="showPage('settings')">
        <span>基础设置</span><span>›</span>
      </div>
      <div class="profile-list-item" onclick="toggleDarkMode()">
        <span>夜间模式</span><span id="dark-mode-toggle">关</span>
      </div>
      <div class="profile-list-item" onclick="showPage('about')">
        <span>关于</span><span>›</span>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: 添加 CSS**

在 `public/index.html` 的 `<style>` 区追加：

```css
.profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  background: linear-gradient(135deg, #f5f0e8 0%, #e8e0d0 100%);
  border-bottom: 1.5px solid #2b2b2b;
}
.profile-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #2b2b2b; color: #d4af37; font-size: 24px;
  font-family: 'KaiTi', serif;
}
.profile-info { flex: 1; }
.profile-name { font-size: 18px; font-weight: bold; color: #1a1a1a; }
.profile-id { font-size: 12px; color: #666; margin-top: 4px; }
.profile-settings {
  width: 40px; height: 40px; border: none; background: transparent;
  font-size: 22px; color: #2b2b2b; cursor: pointer;
}
.profile-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 8px; padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}
.profile-stat { text-align: center; }
.profile-stat-value { font-size: 20px; font-weight: bold; color: #b8954a; }
.profile-stat-label { font-size: 12px; color: #666; margin-top: 4px; }
.profile-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px;
  background: #e0e0e0; margin: 16px; border: 1px solid #e0e0e0;
}
.profile-grid-item {
  display: flex; align-items: center; gap: 12px; padding: 16px;
  background: #faf8f5; cursor: pointer;
}
.profile-grid-icon {
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  background: #2b2b2b; color: #d4af37; font-family: 'KaiTi', serif; font-size: 18px;
}
.profile-grid-label { font-size: 15px; color: #1a1a1a; }
.profile-group { margin: 16px; }
.profile-group-title { font-size: 13px; color: #999; margin-bottom: 8px; }
.profile-tools {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
  background: #faf8f5; border: 1px solid #e0e0e0; padding: 12px;
}
.profile-tool { text-align: center; font-size: 14px; color: #1a1a1a; cursor: pointer; }
.profile-list { background: #faf8f5; border: 1px solid #e0e0e0; }
.profile-list-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; border-bottom: 1px solid #e0e0e0; cursor: pointer;
}
.profile-list-item:last-child { border-bottom: none; }
```

- [ ] **Step 3: user-pages.js 数据绑定**

在 `public/user-pages.js` 中新增函数：

```javascript
function renderProfileStats() {
  const userId = getCurrentUserId(); // 复用现有函数
  const history = JSON.parse(localStorage.getItem(`qimen_history_${userId}`) || '[]');
  const favorites = JSON.parse(localStorage.getItem(`qimen_favorites_${userId}`) || '[]');
  const studyDays = JSON.parse(localStorage.getItem(`qimen_study_days_${userId}`) || '[]');
  const today = new Date().toISOString().slice(0, 10);
  if (!studyDays.includes(today)) {
    studyDays.push(today);
    localStorage.setItem(`qimen_study_days_${userId}`, JSON.stringify(studyDays));
  }
  document.getElementById('profile-paipan-count').textContent = history.length;
  document.getElementById('profile-fav-count').textContent = favorites.length;
  document.getElementById('profile-study-days').textContent = studyDays.length;
}
```

在 `showPage('profile')` 调用处触发 `renderProfileStats()`。

- [ ] **Step 4: 同步到根目录与 docs**

```bash
Copy-Item -Path public/index.html -Destination index.html -Force
Copy-Item -Path public/index.html -Destination docs/index.html -Force
```

- [ ] **Step 5: 提交**

```bash
git add public/index.html public/user-pages.js index.html docs/index.html
git commit -m "feat(profile): redesign my page with header, stats, grid and grouped list"
```

---

## Task 4: 本地验证

**Files:**
- 所有修改过的文件

### 步骤

- [ ] **Step 1: 启动本地服务**

Run: `node server.js`
Expected: Server running on port 8090

- [ ] **Step 2: 运行单元测试**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: 浏览器验证书院阅读**

打开 `http://localhost:8090/`，进入书院，点击任意书【阅读】，确认：
- 不先点击下载也能打开阅读器
- iframe 渲染出正文内容
- 目录可展开

- [ ] **Step 4: 浏览器验证我的页面**

切换到【我的】，确认：
- 顶部用户信息卡片显示正常
- 排盘/收藏/学习天/会员四个数据卡片显示
- 宫格入口 2×2 排列
- 工具箱、系统分组清晰
- 无文字重叠、截断、溢出

- [ ] **Step 5: 提交验证截图**

```bash
git add artifacts/visual-audit/*20260827*.jpg
git commit -m "chore(audit): add visual audit screenshots"
```

---

## Task 5: Render 部署

**Files:**
- Modify: `package.json`
- Modify: `README.md`

### 步骤

- [ ] **Step 1: 确认 package.json start 脚本**

```json
{
  "scripts": {
    "start": "node server.js",
    "test": "jest"
  }
}
```

- [ ] **Step 2: 创建 README 部署说明**

```markdown
## 部署到 Render

1. 推送代码到 GitHub。
2. 登录 https://render.com 新建 Web Service。
3. 选择 GitHub 仓库，Build Command 留空，Start Command 填 `node server.js`。
4. 环境变量：无需额外配置（PORT 由 Render 注入）。
5. 部署完成后复制公开 URL。
```

- [ ] **Step 3: 推送 GitHub**

```bash
git push origin master
```

如遇 443 错误，按项目经验手动重试：

```bash
git push origin master
```

- [ ] **Step 4: Render 创建服务**

按 README 步骤在 Render 控制台创建 Web Service，Start Command 为 `node server.js`。

- [ ] **Step 5: 验证公开链接**

打开 Render 提供的公开 URL，验证：
- 首页可打开
- 书院点击【阅读】能加载书籍
- AI 对话可正常返回（需确保 `API密钥.txt` 已提交或环境变量已配置）

- [ ] **Step 6: 提交部署文档**

```bash
git add package.json README.md
git commit -m "docs(deploy): add Render deployment instructions and start script"
```

---

## Task 6: 最终视觉审查与收尾

**Files:**
- `work-flow.md`

### 步骤

- [ ] **Step 1: 桌面端与移动端截图**

视口：700×582 和 360×800，分别截图书院、我的页面。

- [ ] **Step 2: 检查重叠/截断/溢出**

- 我的页面顶部卡片不换行
- 数据卡片数字不溢出
- 宫格入口文字居中
- 书院双按钮不重叠

- [ ] **Step 3: 更新 work-flow.md**

按项目规范追加节点：时间、事件、问题来源、执行方向、执行边界、执行结果、相关文档、公开网址。

- [ ] **Step 4: 最终提交**

```bash
git add work-flow.md artifacts/visual-audit/
git commit -m "docs(workflow): record deployment and visual audit"
```

---

## 自检

- **Spec coverage**: 在线阅读 → Task 1/2；公开网址 → Task 5；我的页面 → Task 3；视觉审查 → Task 6。
- **Placeholder scan**: 无 TBD/TODO；Render URL 为示例，属合理。
- **Type consistency**: `openByUrl(bookId, url)` 在 Task 1 定义，Task 2 调用一致；`profile-*` ID 在 HTML 与 JS 中一致。
