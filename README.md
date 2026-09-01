# 道家奇门遁甲排盘 APP

十三宫奇门遁甲阴盘排盘工具，基于 Express + Node.js 后端，前端为单页应用。

## 本地开发

```bash
npm install
npm start          # 启动 Express 服务，默认端口 8090
npm test           # 排盘算法验证
npm run test:school # 书院与前端集成测试
```

访问 http://localhost:8090/ 为用户端，http://localhost:8090/admin 为管理后台。

## 部署到 Render

1. 登录 Render，使用仓库根目录的 `render.yaml` 创建 Blueprint。
2. 服务名保持为 `qimen-shisan-gong-api`，使前端默认使用 `https://qimen-shisan-gong-api.onrender.com`。
3. Render 自动执行 `npm ci` 和 `node server.js`，健康检查地址为 `/api/health`。
4. 持久磁盘挂载到 `/var/data`，数据库通过 `DATA_DIR=/var/data` 保存，不能删除该磁盘。
5. 在 Render 环境变量中填写 `ADMIN_USERNAME`、`ADMIN_ACCESS_KEY_HASH`、`ADMIN_PASSWORD_HASH` 和自动生成的 `JWT_SECRET`。
6. 如需 AI 对话功能，在 Render 环境变量中填写 `AI_API_KEY`；不要将 `API密钥.txt` 提交到 GitHub。
7. 部署完成后先访问 `https://qimen-shisan-gong-api.onrender.com/api/health`，确认返回 HTTP 200 JSON，再打开 GitHub Pages。

GitHub Pages 前端地址：

`https://142857110823.github.io/app-for-father/`

本地备用地址：

`http://localhost:8090/`

## 目录结构

- `public/` — 用户端前端资源（index.html、JS、CSS）
- `public/admin.html` — 管理后台
- `public/books/` — 书院 EPUB 电子书
- `server.js` — Express 后端（静态服务 + API）
- `algorithm/` — 排盘算法核心模块
- `tests/` — 单元测试与集成测试
