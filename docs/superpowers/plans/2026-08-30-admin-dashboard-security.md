# 管理员后台与十三宫文案调整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除排盘结果冗余基础信息，统一十三宫分类名称，并交付受两步凭据保护的管理员仪表盘。

**Architecture:** 排盘页面维持现有单页结构，仅调整渲染与导出文案。管理员认证从固定密码升级为本地哈希凭据和管理员 JWT，管理统计由后端统一查询 SQLite 后返回。

**Tech Stack:** Node.js、Express、SQLite、bcryptjs、jsonwebtoken、HTML/CSS/Vanilla JavaScript、node:test、Playwright。

**Spec:** `docs/superpowers/specs/2026-08-30-admin-dashboard-security-design.md`

## Global Constraints

- 前端标题统一使用“道家奇门遁甲”。
- 管理员凭据不得写入前端源码或 Git。
- 管理后台 URL 保持 `/admin`。
- 根目录、`public/`、`docs/` 三处静态入口必须同步。
- 完成后更新 `work-flow.md` 并进行桌面与窄屏视觉审查。

---

### Task 1: 排盘结果文案

**Files:**
- Modify: `public/index.html`
- Modify: `tests/paipan-render.test.js`

**Interfaces:**
- Consumes: `renderResult()`、`showPalaceDetail()`、`buildPaipanHTML()`
- Produces: 基础信息与十三宫分类的新渲染契约

- [ ] 写失败测试：结果基础信息模板不含“公历/时辰”，详情分类包含“十三神/十三星/十三门”。
- [ ] 直接执行 `node tests/paipan-render.test.js`，确认测试因旧文案失败。
- [ ] 修改屏幕渲染、详情弹窗和打印导出。
- [ ] 再次执行测试并确认通过。

### Task 2: 管理员凭据与令牌

**Files:**
- Create: `backend/admin-auth.js`
- Create: `scripts/init-admin-credentials.js`
- Modify: `backend/routes/admin.js`
- Modify: `.gitignore`
- Test: `tests/admin-auth.test.js`

**Interfaces:**
- Consumes: `bcryptjs`、`jsonwebtoken`
- Produces: `verifyAdminLogin(credentials, input)`、`createAdminToken(username)`、`verifyAdminToken(token)`、`adminOnly`

- [ ] 写失败测试：正确三项凭据成功；任一错误失败；伪造和普通 JWT 被拒绝。
- [ ] 执行 `node tests/admin-auth.test.js`，确认缺少模块而失败。
- [ ] 实现本地凭据读取、哈希比较、管理员 JWT 和登录失败限流。
- [ ] 生成忽略文件 `admin-credentials.local.json`。
- [ ] 再次执行测试并确认通过。

### Task 3: 管理员登录弹窗

**Files:**
- Modify: `public/admin.html`
- Modify: `tests/admin-page.test.js`

**Interfaces:**
- Consumes: `POST /api/admin/login`
- Produces: 三字段登录弹窗和 `sessionStorage.admin_token`

- [ ] 写失败测试：登录页必须包含密钥、账号、密码，不显示默认密码，不使用 `localStorage` 保存管理员令牌。
- [ ] 执行测试确认失败。
- [ ] 修改登录页和登录逻辑。
- [ ] 执行测试确认通过。

### Task 4: 仪表盘统计

**Files:**
- Modify: `backend/routes/admin.js`
- Modify: `public/admin.html`
- Test: `tests/admin-dashboard.test.js`

**Interfaces:**
- Consumes: SQLite 表 `users`、`history`、`orders`
- Produces: `GET /api/admin/stats` 的 `users`、`paipan`、`membership`、`orders`、`trend`、`recent_history`、`recent_orders`、`system`

- [ ] 写失败测试：统计响应必须包含阳遁/阴遁、有效会员、即将到期、订单状态、收入和系统状态。
- [ ] 执行测试确认失败。
- [ ] 扩展统计查询和仪表盘卡片、趋势、最近活动。
- [ ] 执行测试确认通过。

### Task 5: 同步、集成与视觉验证

**Files:**
- Modify: `index.html`
- Modify: `docs/index.html`
- Modify: `admin.html`
- Modify: `docs/admin.html`
- Modify: `work-flow.md`

**Interfaces:**
- Consumes: 前四项任务输出
- Produces: 本地可访问且经过验证的完整交付

- [ ] 同步三处首页和三处后台页面。
- [ ] 运行算法、页面、管理员认证与仪表盘测试。
- [ ] 启动 `node server.js`，验证 `/`、`/admin` 和管理接口。
- [ ] 使用桌面与 375px 窄屏检查登录弹窗、仪表盘和排盘结果。
- [ ] 保存截图证据并更新 `work-flow.md`。
