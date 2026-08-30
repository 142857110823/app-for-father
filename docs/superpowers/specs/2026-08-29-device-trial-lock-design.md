# 设备 3 天试用期锁定设计文档

## 1. 背景与目标

为软件增加一层设备级使用限制：**同一台设备首次打开后仅有 3 天完整使用期**，到期后核心排盘功能被锁定，但允许继续浏览非核心页面。

约束：
- 不修改 URL。
- 3 天内前端无任何弹窗、提示或倒计时。
- 到期后弹出「管理员解锁」和「会员充值」两个入口。
- 管理员账号密码预先准备，不受 3 天限制。

## 2. 核心规则

- 计时起点：**首次打开 App/Web 页面**（页面脚本首次执行）。
- 计时长度：**3 天**（`3 × 24 × 60 × 60 × 1000 ms`）。
- 到期前：不显示任何与试用期相关的 UI。
- 到期后：
  - 禁用「开始排盘」等核心入口。
  - 点击被禁用的入口时弹出锁定窗口。
  - 锁定窗口提供两个按钮：「管理员解锁」、「充值会员」。

## 3. 设备识别方案

采用 **localStorage + IndexedDB + Cookie** 多重写入，取三者中最早的时间戳。

| 存储位置 | Key / Store | 说明 |
|---|---|---|
| `localStorage` | `qimen_device_first_open` | 字符串时间戳 |
| `IndexedDB` | `deviceMeta` 表，key=`firstOpenAt` | 对象 `{key, value}` |
| `Cookie` | `qimen_dfo=<timestamp>` | `path=/; max-age=31536000; SameSite=Strict` |

初始化逻辑：
1. 读取三处存储。
2. 若三处都不存在，视为新设备，写入当前时间。
3. 若存在不一致，以**最早值**为准，并回写到三处。
4. 若三处都被清空，则重新计时（客户端方案的固有限制）。

## 4. 锁定判定

```text
isLocked = (now - firstOpenAt > TRIAL_MS)
           && !adminSessionUnlock
           && !(currentUserIsMember)
```

- `TRIAL_MS` = 3 天。
- `adminSessionUnlock`：管理员本次会话解锁标记，存于 `sessionStorage`。
- `currentUserIsMember`：已登录用户且 `member_expire_at > now`。

## 5. 后端接口复用

不新增后端表和路由，直接复用现有接口：

| 功能 | 接口 | 说明 |
|---|---|---|
| 管理员校验 | `POST /api/admin/login` | 固定密码 `admin888`，成功后返回 token |
| 会员套餐 | `GET /api/payment/plans` | 获取可购买套餐 |
| 创建订单 | `POST /api/payment/orders` | 需登录态 |
| 模拟支付 | `POST /api/payment/orders/:id/pay` | 支付成功后更新会员有效期 |
| 用户状态 | `GET /api/user/profile` | 获取当前会员有效期 |

## 6. 前端模块设计

### 6.1 新增 `public/device-lock.js`

职责：
- `DeviceLock.init()`：页面加载时执行，读取/初始化三处存储，计算锁定状态。
- `DeviceLock.isLocked()`：返回当前是否锁定。
- `DeviceLock.ensureUnlocked(onSuccess)`：未锁定时直接执行 `onSuccess`；已锁定时显示锁定弹窗。
- `DeviceLock.unlockByAdmin(token)`：管理员解锁成功后写入 `sessionStorage`。
- `DeviceLock.checkMemberStatus()`：若用户已登录，调用 `/api/user/profile` 更新会员状态。

### 6.2 `public/index.html` 改动

1. 引入 `<script src="device-lock.js"></script>`。
2. 页面初始化时调用 `DeviceLock.init()`。
3. 「开始排盘」按钮点击及 `paipan()` 函数入口用 `DeviceLock.ensureUnlocked(...)` 包裹。
4. 新增锁定弹窗 DOM：标题、提示文案、「管理员解锁」按钮、「充值会员」按钮。
5. 新增管理员密码输入子弹窗。
6. 复用或新建会员购买弹窗。

## 7. UI/交互流程

### 7.1 未到期（前 3 天）

- 无任何提示。
- 「开始排盘」正常使用。

### 7.2 到期后

- 首页「开始排盘」按钮仍可点击（或显示为可点击），点击后触发锁定弹窗。
- 锁定弹窗：
  - 标题：「本设备试用已到期」
  - 说明：「每台设备首次打开后可免费使用 3 天，如需继续使用请充值会员或联系管理员。」
  - 按钮 1：「管理员解锁」→ 弹出密码输入框，调用 `/api/admin/login`。
  - 按钮 2：「充值会员」→ 打开会员购买弹窗。

### 7.3 管理员解锁

- 输入密码，调用 `/api/admin/login`。
- 成功后将返回的 token 存入 `sessionStorage.qimen_admin_unlock`。
- 关闭锁定弹窗，允许本次会话继续使用。
- 关闭标签/浏览器后需重新解锁。

### 7.4 会员充值

- 未登录用户：先弹出登录/注册流程（复用现有短信验证码登录）。
- 已登录用户：展示会员套餐列表，选择后创建订单并模拟支付。
- 支付成功后调用 `/api/user/profile` 刷新会员状态，解除锁定。

## 8. 安全与边界

- 普通用户清空浏览器存储可重置 3 天，这是纯客户端方案的固有限制，本阶段可接受。
- 管理员密码不硬编码在前端，仅通过后端接口校验。
- 不显示倒计时、浮窗、角标，避免 3 天内打扰用户。
- 会员状态优先于设备锁定：已登录的有效会员不受设备试用期限制。

## 9. 文件变更

- **新增**：`public/device-lock.js`
- **修改**：`public/index.html`（引入脚本、初始化、锁定弹窗、排盘入口加锁）
- **复用**：`backend/routes/admin.js`、`backend/routes/payment.js`、`backend/routes/auth.js`、`backend/routes/user.js`

## 10. 验收标准

- [ ] 首次打开设备后 3 天内无任何弹窗/提示。
- [ ] 3 天后点击「开始排盘」弹出锁定窗口。
- [ ] 锁定窗口包含「管理员解锁」和「充值会员」。
- [ ] 管理员输入正确密码后，本次会话可继续使用。
- [ ] 购买会员后，锁定解除。
- [ ] 不修改任何 URL。
