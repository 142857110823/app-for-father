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

1. 推送代码到 GitHub。
2. 登录 https://render.com 新建 Web Service。
3. 选择 GitHub 仓库，Build Command 留空，Start Command 填 `node server.js`。
4. 环境变量：`PORT` 由 Render 自动注入；如需 AI 对话功能，配置 `AI_API_KEY`。
5. 部署完成后复制公开 URL。

## 目录结构

- `public/` — 用户端前端资源（index.html、JS、CSS）
- `public/admin.html` — 管理后台
- `public/books/` — 书院 EPUB 电子书
- `server.js` — Express 后端（静态服务 + API）
- `algorithm/` — 排盘算法核心模块
- `tests/` — 单元测试与集成测试
