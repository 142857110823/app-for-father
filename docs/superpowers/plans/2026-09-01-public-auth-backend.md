# 公网账号登录后端实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 GitHub Pages 前端接入可部署的 HTTPS Express 后端，使公网账号体系真正可用。

**Architecture:** 保留 GitHub Pages 作为静态前端，Render 运行现有 Express 服务。SQLite 数据库迁移到 Render 持久磁盘，管理员凭据使用环境变量，前端通过统一 API 基址同时支持本地同源和公网跨域。

**Tech Stack:** Express、Node.js 22、SQLite、Render Blueprint、GitHub Pages。

**Spec:** `docs/superpowers/specs/2026-09-01-public-auth-backend-design.md`

## Global Constraints

- 不提交 `admin-credentials.local.json`、`API密钥.txt`、数据库和未跟踪临时文件。
- 公网认证必须使用 HTTPS 后端，禁止 LocalStorage 模拟服务端账号。
- 设备 1 天限制必须由服务端继续判定。
- 保持 `http://localhost:8090/` 可用。
- 同步 `public/index.html`、根目录 `index.html` 和 `docs/index.html`。

---

### Task 1: 数据目录与 Render Blueprint

**Files:**
- Create: `render.yaml`
- Modify: `backend/db.js`
- Test: `tests/deployment-config.test.js`

- [ ] **Step 1: 写失败测试**

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Render 配置使用持久数据目录和健康检查', () => {
  const yaml = fs.readFileSync('render.yaml', 'utf8');
  assert.match(yaml, /healthCheckPath:\s*\/api\/health/);
  assert.match(yaml, /mountPath:\s*\/var\/data/);
  assert.match(yaml, /DATA_DIR/);
});
```

- [ ] **Step 2: 运行测试确认失败**

运行：`node tests/deployment-config.test.js`

预期：因 `render.yaml` 不存在而失败。

- [ ] **Step 3: 实现最小配置**

创建 `render.yaml`，服务名为 `qimen-shisan-gong-api`，构建命令为 `npm ci`，启动命令为 `node server.js`，健康检查为 `/api/health`，并挂载 `/var/data`。

修改 `backend/db.js`：

```javascript
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');
```

- [ ] **Step 4: 运行测试确认通过**

运行：`node tests/deployment-config.test.js`

预期：PASS。

- [ ] **Step 5: 提交**

```bash
git add render.yaml backend/db.js tests/deployment-config.test.js
git commit -m "feat(deploy): add persistent Render backend configuration"
```

### Task 2: 生产环境 CORS 与管理员配置

**Files:**
- Modify: `server.js`
- Modify: `backend/admin-auth.js`
- Test: `tests/deployment-config.test.js`

- [ ] **Step 1: 写失败测试**

```javascript
test('生产配置要求管理员环境变量且不反射任意 Origin', () => {
  const server = fs.readFileSync('server.js', 'utf8');
  const admin = fs.readFileSync('backend/admin-auth.js', 'utf8');
  assert.match(server, /CORS_ORIGINS/);
  assert.doesNotMatch(server, /Access-Control-Allow-Origin', origin/);
  assert.match(admin, /ADMIN_ACCESS_KEY_HASH/);
});
```

- [ ] **Step 2: 运行测试确认失败**

运行：`node tests/deployment-config.test.js`

预期：因当前 CORS 反射任意来源而失败。

- [ ] **Step 3: 实现最小修改**

在 `server.js` 按逗号解析 `CORS_ORIGINS`，默认允许本地地址和 GitHub Pages；只有来源在白名单时写入 `Access-Control-Allow-Origin`，其他来源不写入。

保持 `admin-auth.js` 使用 `ADMIN_USERNAME`、`ADMIN_ACCESS_KEY_HASH`、`ADMIN_PASSWORD_HASH`、`JWT_SECRET`，并在生产缺少环境变量时返回配置不可用。

- [ ] **Step 4: 运行测试确认通过**

运行：`node tests/deployment-config.test.js`

预期：PASS。

- [ ] **Step 5: 提交**

```bash
git add server.js backend/admin-auth.js tests/deployment-config.test.js
git commit -m "fix(security): restrict production CORS and admin configuration"
```

### Task 3: 前端公网 API 基址

**Files:**
- Modify: `public/index.html`
- Modify: `public/admin.html`
- Modify: `public/ai-client.js`
- Modify: `index.html`
- Modify: `docs/index.html`
- Modify: `docs/admin.html`
- Test: `tests/deployment-config.test.js`

- [ ] **Step 1: 写失败测试**

```javascript
test('公网页面使用可配置 API 基址', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  const admin = fs.readFileSync('public/admin.html', 'utf8');
  assert.match(html, /window\.QIMEN_API_BASE/);
  assert.match(html, /function apiUrl\(path\)/);
  assert.match(admin, /window\.QIMEN_API_BASE/);
});
```

- [ ] **Step 2: 运行测试确认失败**

运行：`node tests/deployment-config.test.js`

预期：因页面没有统一 API 基址函数而失败。

- [ ] **Step 3: 实现统一请求**

在用户端加入：

```javascript
const PUBLIC_API_BASE = window.QIMEN_API_BASE || '';
function apiUrl(path) {
  const base = PUBLIC_API_BASE.replace(/\/+$/, '');
  return base ? `${base}${path}` : path;
}
```

将认证、`/api/auth/me`、`/api/paipan` 和登出请求从硬编码相对路径改为 `apiUrl(...)`。`ai-client.js` 复用相同配置。

管理员页面的登录、统计和数据请求同样使用 `apiUrl(...)`。

不填入未经验证的 Render URL；通过 `runtime-config.js` 或页面顶部配置保留正式地址注入口，避免把不存在的地址发布为“已上线”。

- [ ] **Step 4: 运行测试确认通过**

运行：`node tests/deployment-config.test.js`

预期：PASS。

- [ ] **Step 5: 提交**

```bash
git add public/index.html public/admin.html public/ai-client.js index.html docs/index.html docs/admin.html tests/deployment-config.test.js
git commit -m "feat(frontend): support configurable public API endpoint"
```

### Task 4: 同步、验证与发布

**Files:**
- Modify: `README.md`
- Modify: `work-flow.md`

- [ ] **Step 1: 同步前端副本**

复制 `public/index.html` 到根目录和 `docs/index.html`，并确认三份文件的 API 基址代码一致。

- [ ] **Step 2: 运行静态与服务验证**

运行：

```bash
node --check server.js
node --check backend/db.js
node tests/deployment-config.test.js
git diff --check
```

再用本地服务验证：

```text
GET http://localhost:8090/api/health
```

应返回 HTTP 200 JSON。

- [ ] **Step 3: 更新部署说明**

在 `README.md` 记录 Render 环境变量名、持久磁盘要求、健康检查地址和首次部署时需要在 Render 控制台完成的账户授权。

- [ ] **Step 4: 发布 GitHub Pages**

提交已验证的代码到 `master-doc`，并同步到 Pages 实际发布分支 `master`。不提交任何 secret。

- [ ] **Step 5: 最终验证**

验证：

- `http://localhost:8090/`
- `https://142857110823.github.io/app-for-father/`
- 两个地址 HTTP 200；
- 公网页面不再请求 Pages 自身的 `/api`；
- 若 Render 尚未授权，页面明确提示“公网后端尚未配置”，不显示 JSON 解析异常。

- [ ] **Step 6: 提交工作流记录**

记录实际提交号、验证时间、可访问地址和 Render 外部授权是否完成。
