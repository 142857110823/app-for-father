# 公网账号登录后端设计

> 设计日期：2026-09-01
> 设计状态：已获用户确认，直接进入实施

## 目标

保留 `https://142857110823.github.io/app-for-father/` 作为前端入口，同时提供真正可访问的 HTTPS 后端，使账号密码登录、游客登录、注册、管理员认证和设备 1 天试用限制在公网有效。

## 根因与边界

GitHub Pages 只发布静态文件，不能运行当前 Express 服务，因此 `/api/auth/*` 不可能在 Pages 域名上执行。静态前端只能显示“后端不可用”，不能替代服务端认证；使用 LocalStorage 模拟账号会绕过管理员、VIP和设备期限规则，明确禁止。

现有后端使用 Express + SQLite。为保持改动可控，第一阶段继续使用 SQLite，并通过 Render 持久磁盘保存 `data/app.db`。管理员凭据从 Render 环境变量读取，绝不提交 `admin-credentials.local.json`。

## 架构

```text
浏览器
  ├─ GitHub Pages 前端（静态 HTML/JS）
  └─ HTTPS API → Render Web Service
                       ├─ Express 路由
                       ├─ SQLite
                       └─ 持久磁盘 /var/data
```

前端通过 `window.QIMEN_API_BASE` 指向后端；未配置时：

- 本地 `localhost/127.0.0.1` 使用同源 `/api`；
- GitHub Pages 使用配置的 Render HTTPS 地址；
- 没有公网地址时显示明确提示，不再尝试把静态 HTML 解析为 JSON。

## 后端部署配置

新增 `render.yaml`：

- Node 22 Web Service；
- `npm ci` 构建，`node server.js` 启动；
- `/api/health` 健康检查；
- SQLite 数据目录使用 `DATA_DIR=/var/data`；
- 持久磁盘挂载到 `/var/data`；
- `JWT_SECRET`、`ADMIN_USERNAME`、`ADMIN_ACCESS_KEY_HASH`、`ADMIN_PASSWORD_HASH` 作为必填 secret 环境变量；
- `CORS_ORIGINS` 允许 GitHub Pages 和本地开发地址。

`backend/db.js` 从 `DATA_DIR` 计算数据库路径，同时保留 `DB_PATH` 覆盖能力。服务启动时若管理员环境变量不完整，管理员登录接口返回配置错误，不回退读取不存在的公网本地凭据文件。

## 前端接口

新增统一的 `apiUrl(path)` 和 `apiFetch(path, options)`，认证、排盘、历史、AI、管理员页面统一使用。相对路径只用于本地同源；公网使用 `window.QIMEN_API_BASE`。

对跨域请求：

- 发送 `Authorization` 和 `X-Device-Id`；
- 后端允许明确的来源列表，不再反射任意 `Origin`；
- HTML、空响应、非 JSON 和网络错误均转换为用户可理解的提示。

## 安全

- 不把账号密码、管理员密钥、JWT secret 或 AI API key 写入前端；
- 不提交管理员本地凭据；
- 管理员继续要求访问密钥、账号、密码三项；
- 普通用户/游客设备期限继续由服务端判断；
- Render 环境变量只保存哈希后的管理员访问密钥和密码；
- 生产 CORS 不允许任意来源。

## 验收标准

1. `GET /api/health` 在 Render 公网返回 HTTP 200 JSON。
2. GitHub Pages 登录、注册、游客登录请求到 Render，而不是请求 Pages 的 `/api`。
3. 正确账号登录返回令牌，错误凭据返回中文错误。
4. 游客和普通账号的设备 1 天限制仍由后端执行。
5. 管理员后台在公网要求三项凭据。
6. 本地 `http://localhost:8090/` 继续可用。
7. 桌面与 375×812 页面无横向溢出。

## 未能自动完成的外部步骤

Render 服务首次创建或绑定 GitHub 仓库需要用户的 Render 账户授权；代码、Blueprint、环境变量名和前端配置全部由本项目准备。没有真实 Render 服务 URL 或账户授权时，不伪造公网后端地址。
