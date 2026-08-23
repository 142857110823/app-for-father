# Work-Flow - 十三宫奇门遁甲 APP 项目进度

> 本文件动态记录项目进度，每次重要节点更新。

---

## 项目信息

| 项目 | 内容 |
|------|------|
| 项目名称 | 十三宫奇门遁甲排盘 APP |
| 目标平台 | Android 手机（APK） |
| 风格参考 | 夸克扫描王 |
| 业务依据 | `前言.docx`（阴盘排盘） |
| 规范文件 | `AGENTS.md` |
| 启动日期 | 2026-08-20 |

---

## 阶段总览

| 阶段 | 状态 | 说明 |
|------|------|------|
| 0. 项目初始化 | ✅ 完成 | 读取前言、配置 AGENTS、建立 work-flow |
| 1. 需求 brainstorming | ⏳ 进行中 | 明确技术栈、功能范围、UI 设计 |
| 2. 设计文档 | ⏳ 待开始 | 输出 spec 设计稿 |
| 3. 实施计划 | ⏳ 待开始 | writing-plans 生成实施计划 |
| 4. 算法实现 | ⏳ 待开始 | 干支计算、定遁定局、十三宫排布 |
| 5. UI 实现 | ⏳ 待开始 | 夸克扫描王风格界面 |
| 6. 测试验证 | ⏳ 待开始 | 前言示例用例验证 |
| 7. APK 打包 | ⏳ 待开始 | 输出可安装 APK |

---

## 当前状态

**当前阶段**：1. 需求 brainstorming
**当前动作**：已完成项目初始化，准备进入需求澄清
**下一步**：与用户确认技术栈与功能范围后，输出设计文档

---

## 进度日志

### 2026-08-20 项目初始化

- [x] 读取 `前言.docx`，解析十三宫奇门遁甲阴盘业务逻辑
  - 提取：十天干/十二地支序号
  - 提取：阳遁/阴遁判定算法
  - 提取：定局算法（阳遁直接取余，阴遁再取地支）
  - 提取：神/星/门十三宫默认顺序
  - 提取：贵神口诀
  - 提取：阳顺阴逆排布原则
- [x] 联网搜索夸克扫描王 UI 风格特征
  - 干净整洁、无花里胡哨装饰
  - 操作便捷、流程简化
  - 以用户为中心
- [x] 创建 `AGENTS.md`（项目规范、业务逻辑、技术规范、风格规范）
- [x] 创建 `work-flow.md`（项目进度跟踪）

### 2026-08-20 算法实现与验证

- [x] 实现排盘算法核心 [algorithm/qimen.js](file:///F:/1/夫/algorithm/qimen.js)
  - 定遁定局（阳遁取天干余数，阴遁取地支余数）
  - 十三宫排布（神/星/门，阳顺阴逆）
  - 贵神口诀映射（日干+昼夜）
- [x] 实现四柱干支计算 [algorithm/pillars.js](file:///F:/1/夫/algorithm/pillars.js)（lunar-javascript 库）
- [x] 验证前言示例①（2026-08-14 14:22 → 阴盘-阳遁-5局）✅
- [x] 验证前言示例②（2026-08-14 12:22 → 阴盘-阴遁-5局）✅
- [x] 验证四柱从公历计算（两示例四柱均与前言一致）✅

### 2026-08-21 算法校准与后端用户端实现

- [x] 修正 `AGENTS.md` 十三宫空间布局与定遁定局规则
- [x] 同步修正 `algorithm/qimen.js` 的 `GONG_LAYOUT` 与正序/逆序路径
- [x] 同步修正 `algorithm/reference.js` 参考数据，匹配 docx 4×4 表格
- [x] 单元测试通过：阴盘-阳遁-5局、阴盘-阴遁-5局与参考文档完全一致
- [x] 完成后端用户端基础实现
  - 账号认证：`/api/auth/*`（手机/密码/短信/第三方登录占位）
  - 用户资料：`/api/user/profile`
  - 排盘历史：`/api/history/*`
  - 支付会员：`/api/payment/*`
  - AI 对话：`/api/ai/*`（含额度、记录、反馈）
  - 通知运营：`/api/notification/*`
  - 安全合规：bcrypt、JWT+DB Token、操作日志
  - 数据统计：`/api/admin/*`
- [x] 输出 `完善方向.md` 汇总后端用户端全部功能与实现状态

### 待办（下一步）

- [ ] 前端接入登录态与历史记录同步
- [ ] 接入真实短信服务商
- [ ] 接入微信支付/支付宝真实回调
- [ ] 部署后端到带 HTTPS 的生产环境

### 2026-08-23 修正排盘算法文档与「我的」模块优化

**【时间】** 2026-08-23
**【事件】** 修正排盘算法文档错误 + 优化「我的」模块（夜间模式/我的收藏/我的消息/导出历史）+ 移除会员权益
**【问题来源】** 用户指出当前排盘算法和相关内容存在重大错误，重新编写了前言.docx 和排盘-【阴盘-阴遁-5局】.docx；「我的」模块不符合用户使用需求
**【执行方向】**
1. 文档修复：根据新版前言.docx 和排盘-【阴盘-阴遁-5局】.docx 修正 AGENTS.md 和项目指南.md
2. AGENTS.md 新增 work-flow 记录规范（第9条）
3. 前端优化：「我的」模块新增夜间模式/我的收藏/我的消息/导出历史四项功能
4. 移除「会员权益」模块
**【执行边界】** 仅修改文档和前端 UI/交互逻辑，不修改排盘算法核心代码（algorithm/qimen.js）
**【执行结果】**
- AGENTS.md §2.4(一) 神默认顺序修正为：玄武→白虎→太常→六合→勾陈→腾蛇→玄灵→天后→九天→太阴→贵神→青龙→朱雀
- AGENTS.md §2.4(九) 天盘干与暗干→更正为地盘与天盘推导法（基于门盘/星盘原始宫位→人盘映射）
- AGENTS.md §2.4(十) 门盘与星盘→星盘修正为依据日柱推导（非"与门盘相同"）
- AGENTS.md §三 新增第9条：每次工作完成必须在 work-flow.md 记录
- 项目指南.md 同步修正
- 前端 index.html 新增夜间模式/我的收藏/我的消息/导出历史功能
- 前端 index.html 移除会员权益模块
- 前端 index.html 顶部 vip-card-float 浮卡移除，新增页面 page-favorites/page-messages
- 前端 index.html 新增用户隔离机制 getUserId/userKey，按用户独立存储 history/favorites/messages/theme
- 前端 index.html 新增欢迎消息自动发送（新用户首次访问时）
- 前端 index.html 新增夜间模式 CSS 变量 html.dark 与切换/持久化逻辑
- 前端 index.html 新增收藏按钮（排盘结果顶端）+ 收藏列表渲染/删除/清空
- 前端 index.html 新增消息红点显示/已读切换/全部已读
- 前端 index.html 新增批量导出（多页 page-break-after）exportMultiplePDF 与 buildPaipanHTML 函数
- 前端 index.html 新增导出浮动条 export-bar 与批量选择交互
- 前端 index.html 历史记录页 renderHistory 支持批量选择 checkbox 显示
- 前端 index.html localStorage 全部改为按用户隔离（userKey('history'/'favorites'/'messages'/'theme'）)
**【执行验证】**
- 函数定义全部正常（10 个新函数 typeof=function）
- 用户隔离 key 按格式生成（qimen_*_<userId>）
- 欢迎消息自动生成（标题"欢迎来到道家奇门遁甲"，read=false）
- 夜间模式切换有效（documentElement.dark 类切换 + 图标月/日 + 标签夜间模式/日间模式）
- 收藏功能正常（star-btn.active 状态 + favorites 数量更新）
- 消息红点逻辑正确（unread>0 时 show）
- 批量导出 3 条记录生成 9990 字符 HTML，包含 3 个 <div class="page">、3 个 <h1>、page-break-after 分页符，标题"道家奇门遁甲排盘 · 批量导出"
- 单页 buildPaipanHTML 生成 2205 字符有效 HTML
**【相关文档】** AGENTS.md、项目指南.md、work-flow.md、前言.docx、排盘-【阴盘-阴遁-5局】.docx、index.html

### 2026-08-23 紧急修复：排盘崩溃 + 导出栏遮挡 + 排盘分析删除

**【时间】** 2026-08-23
**【事件】** 修复三项严重质量问题：① export-bar 浮动条遮挡主按钮 ② 排盘分析模块删除 ③ 开始排盘无法输出结果
**【问题来源】** 用户反馈"垃圾玩意"+"严重影响用户体验"+"点击开始排盘根本无法正常输出排盘结果"
**【执行方向】**
1. 系统性根因调查（systematic-debugging）定位三个问题的深层原因
2. 修复 export-bar CSS 隐藏机制（translateY + opacity + pointer-events 三重保障）
3. 删除 page-result 中排盘分析模块 HTML + renderResult() 中 renderAnalysis() 调用
4. 修复 paipan() 函数 location 读取 null 崩溃 + pillars.zhi 空引用崩溃 + gender-hidden 缺失
**【执行边界】** 仅修改 index.html，不修改算法核心
**【执行结果】**
- export-bar 默认 opacity:0 + pointer-events:none + translateY(calc(100%+60px))，完全隐藏不遮挡
- page-result 中 analysis-card HTML 已移除，renderAnalysis() 调用已删除，renderAnalysis() 函数加 null guard
- paipan() 重写 location 读取：从 wheelState 取省/市/区，fallback 到 location-display
- paipan() 重写 gender 读取：多级 fallback（gender-hidden → gender select → .gender-btn.active）
- paipan() 添加 curData.input/pan null safety
- renderResult() 添加 p.zhi.year null safety（fallback 到 p.year[1]）
- 四项浏览器验证全部通过：export-bar 不可见、无排盘分析、排盘成功输出13宫位
**【相关文档】** index.html、work-flow.md

### 2026-08-23 第二轮修复：UI清理 + 排盘布局修正

**【时间】** 2026-08-23
**【事件】** 修复六项问题：①排盘页布局（LAYOUT数组）与AGENTS.md规范不一致 ②基础设置删除冗余模块 ③其他工具删除双人合盘 ④排盘页替换双人排盘为万年历 ⑤删除"其他"模块+清空历史移至记录页 ⑥验证算法与参考数据一致性
**【问题来源】** 用户反馈"排盘结果未呈现灵盘布置"+"算法与文档不吻合"+具体UI修改要求
**【执行方向】**
1. 系统性调试定位根因：renderTraditionalPlate()中LAYOUT数组宫位索引与AGENTS.md规范完全不同
2. 修正两处LAYOUT数组（renderTraditionalPlate + buildPaipanHTML），按AGENTS.md 4×4表格重排
3. 我的-基础设置：删除真太阳时/早晚子时/闰月设置/星曜，仅保留夜间模式/我的收藏/我的消息/导出历史
4. 我的-其他工具：删除双人合盘，保留万年历/智能罗盘/古籍查阅
5. 排盘页：替换"开始合盘"为"万年历"
6. 我的页：删除"其他"分区（含清空历史），将"清空历史"按钮移至记录页顶端
7. 重建algorithm.bundle.js并验证算法与参考数据完全一致
**【执行边界】** 仅修改index.html和重建bundle，不修改算法核心逻辑
**【执行结果】**
- LAYOUT数组修正为：Row1[0,1,2,3] Row2[11,12(center),4] Row3[10,5] Row4[9,8,7,6]，与AGENTS.md 4×4表格完全匹配
- Node.js单元测试通过：阴遁5局13宫与参考完全一致、阳遁5局13宫与参考完全一致
- 浏览器验证通过：基础设置4项、其他工具3项、排盘页万年历+古籍、记录页清空历史、无"其他"分区
- 排盘结果页：十三宫盘表4行布局正确渲染，神/星/门/干数据正确显示
**【相关文档】** index.html、work-flow.md、algorithm/qimen.js、algorithm/reference.js

### 2026-08-23 算法重构 Task 1.1–1.7：神顺序 + 灵盘/天罡/日排局 + 三分区

**【时间】** 2026-08-23
**【事件】** 按 docs/superpowers/plans/2026-08-23-algo-settings-refactor.md 执行算法重构 Task 1.1–1.7：追加天罡/日排局知识表、更新 qimen.js 神顺序与新函数、重写 reference.js 阴遁5局参考数据、传农历参数、更新 AGENTS.md / 项目指南.md、重建 bundle、单元测试通过
**【问题来源】** 用户指令明确要求 Task 1.1–1.7，基于 2(1)(1).docx 排盘文档 + 天罡.docx 新增灵盘/天罡/日排局三要素及三分区 UI 规范
**【执行方向】**
1. Task 1.1: `algorithm/knowledge.js` 末尾追加天罡系统 (TIANGANG_ELEMENTS/ZODIAC_GONG_INDEX/TIANGANG_TABLE) 和日排局月配置 (RI_PAIJU_MONTH_CONFIG) 知识表，并更新 module.exports + window.KNOWLEDGE 导出
2. Task 1.2: `algorithm/qimen.js` 更新 SHEN 数组（玄武→白虎→太常→六合→勾陈→腾蛇→玄灵→天后→九天→太阴→贵神→青龙→朱雀），createEmptyPalaces 新增 lingGan/tiangang/riPaiJu 字段，新增 placeLingGan/placeTianGang/placeRiPaiJu 三函数，fullPaiPan 接受 extraContext 参数并串联调用
3. Task 1.3: `algorithm/reference.js` 按 2(1)(1) 文档 TABLE 16(神)/TABLE 9(星)/TABLE 2&5(门)/TABLE 0(天/地干) 逐宫校准 YIN_DUN_5.palaces，灵盘按"神原始宫位→地盘干"规则填入，附加天罡/日排局标签
4. Task 1.4: `algorithm/pillars.js` fullPaiPanFromTime 引入 lunar-javascript，提取 lunarMonth/lunarDay/shiZhi 构造 extraContext 传入 corePaiPan
5. Task 1.5: `AGENTS.md` §2.4(六) 追加暗干说明(辅助/不显示)；§2.4(九) 追加灵盘规则(公式灵盘[i]=地盘[SHEN.indexOf(神盘[i])])；重排编号新增§(十)天罡系统规则/§(十一)日排局系统规则/§(十二)标准宫位三分区；原§(十)门盘星盘→§(十三)、原§(十一)参考文档→§(十四)并补充 2(1)(1).docx/天罡.docx
6. Task 1.6: `项目指南.md` §1.1 补充神/星/门/干全要素/灵盘/天罡/日排局/三分区说明；§1.2 补充 extraContext = { lunarMonth, lunarDay, shiZhi } 输入字段与输出字段(lingGan/tiangang/riPaiJu)；§2.1 补充 2(1)(1).docx/天罡.docx 为权威文档、列单测/bundle 构建命令
7. Task 1.7: `cd f:\1\夫 ; npm run build:browser` 重建 public/algorithm.bundle.js (esbuild IIFE, 687.7kb)
8. 验证: `cd algorithm && node test.js` 阴遁/阳遁 5 局 13 宫全通过；`node pillars.js` 四柱 + 完整排盘通过
**【执行边界】** 改 algorithm/*.js 核心算法 + AGENTS.md/项目指南.md 文档，未动前端 index.html 三分区实际渲染(留给 UI 任务)
**【执行结果】**
- knowledge.js 新增 12 天罡要素、ZODIAC_GONG_INDEX 宫位映射、12×12 TIANGANG_TABLE、12 月 RI_PAIJU_MONTH_CONFIG(1/4/7/10 三日期模式，其余二日期)，导出完整
- qimen.js SHEN 13 神顺序正确；createEmptyPalaces 宫位对象含 9 字段(shen/xing/men/tianGan/diGan/anGan/lingGan/tiangang/riPaiJu)；placeLingGan 按神索引取原始宫地盘；placeTianGang 按(shiZhi→行, lunarMonth-1→列)查表→ZODIAC_GONG_INDEX→起始宫，按顺时针 [0..11] 填入 12 要素；placeRiPaiJu 遍历 RI_PAIJU_MONTH_CONFIG 匹配宫位打"X月 Y日"标签；fullPaiPan(ctx, extraContext) 末尾顺序调用三个新函数
- reference.js YIN_DUN_5 13 宫 TABLE 16 神/TABLE 9 星/TABLE 2/5 门/TABLE 0 天干全部重写校准，宫位 lingGan/tiangang/riPaiJu 按规则填充
- pillars.js fullPaiPanFromTime 引入 { Solar } from 'lunar-javascript'，提取 lunar.getMonth()/lunar.getDay()/pillars.zhi.time，组装 extraContext 传入 corePaiPan
- AGENTS.md §2.4 编号重组：(九)地盘天盘灵盘推导法/(十)天罡/(十一)日排局/(十二)三分区/(十三)门盘星盘/(十四)参考文档
- 项目指南.md §1.1 功能表加 5 行新功能；§1.2 输入输出加 extraContext 与新字段；§2.1 第 1 点准确性拆 4 项文档/第 4/5 点加三分区与单测/bundle 命令
- build:browser 输出 `public\algorithm.bundle.js 687.7kb  Done in 57ms`
- node test.js: 阴盘-阳遁-5局 ✅ 全部 13 宫与参考完全一致；阴盘-阴遁-5局 ✅ 全部 13 宫与参考完全一致；====== 全部测试通过 ✅ ======
- node pillars.js: 示例①②四柱 ✅ 通过；完整排盘贵神/宫位数量/示例宫位正确；====== 全部验证通过 ✅ ======
**【相关文档】** algorithm/knowledge.js、algorithm/qimen.js、algorithm/reference.js、algorithm/pillars.js、algorithm/test.js、AGENTS.md、项目指南.md、work-flow.md、docs/superpowers/plans/2026-08-23-algo-settings-refactor.md、排盘-【阴盘-阴遁-5局】 2(1)(1).docx、天罡.docx、前言.docx

### 2026-08-23 后端 auth 扩展 Task 2：账号安全 9 接口

**【时间】** 2026-08-23
**【事件】** 按计划执行 Task 2：在 backend/routes/auth.js 追加 9 个账号安全接口，并扩充 backend/db.js users 表字段
**【问题来源】** 用户需求"齿轮"设置页需支持绑定手机/微信/QQ/邮箱、重置密码、注销账号
**【执行方向】**
1. backend/db.js：在 `CREATE TABLE IF NOT EXISTS users` 末尾追加 email_verified INT DEFAULT 0 和 status VARCHAR(16) DEFAULT 'active' 两个字段，支持邮箱验证和账号冻结/注销状态
2. backend/routes/auth.js：追加 `/api/auth/bind-phone` `/api/auth/bind-email` `/api/auth/bind-wechat` `/api/auth/bind-qq` `/api/auth/unbind-provider` `/api/auth/send-reset-code` `/api/auth/reset-password` `/api/auth/change-password` `/api/auth/delete-account` 共 9 个接口，全部带 authMiddleware JWT 校验、操作日志写入 (INSERT INTO audit_logs)、SQL 参数化防注入
3. 代码审阅：每个接口含 try/catch、BCRYPT_ROUNDS=10、邮箱手机正则校验、JWT secret 复用、409 冲突码(手机号已绑定)
**【执行边界】** 仅后端 auth.js/db.js，短信/邮件发送调用短信网关/邮件网关占位（需后续部署真实网关），真实微信/QQ OAuth 需接入开放平台 AppID
**【执行结果】**
- users 表新增 email_verified/status 两列（执行 `const db = require('./db.js')` 无报错）
- auth.js 新增 9 接口共 ~95 行代码：
  - 绑定手机/邮箱：sendCode 查 user→update SET phone=?,phone_verified=1 / SET email=?,email_verified=1
  - 绑定微信/QQ：openid + nickname 头像，首次绑定或解除绑定
  - 解绑 provider：按 provider 清空字段
  - 发送重置码：sendResetCode 生成 6 位码写入 user.reset_code + TTL 5min
  - 重置密码：校验 reset_code → bcrypt 新密码 hash → 清除 token
  - 修改密码：校验当前密码 → 更新
  - 注销账号：UPDATE users SET status='deleted', password_hash=NULL, phone=NULL, email=NULL 软删除 + 清除 token
- authMiddleware：requireAuth 校验 req.user.id
- audit_logs 操作日志表插入每条操作 (user_id, action, detail, ip, created_at)
**【相关文档】** backend/routes/auth.js、backend/db.js、work-flow.md

### 2026-08-23 前端设置页 + 三分区 UI Task 3

**【时间】** 2026-08-23
**【事件】** 按计划执行 Task 3：在 index.html 追加"齿轮"设置页（4 模块 + 3 弹窗），排盘结果十三宫三分区渲染，设置模块/其他工具/排盘页/记录页 UI 清理与完善
**【问题来源】** 用户需求：齿轮跳转设置页（用户信息/账号安全/隐私政策/退出登录），三分区显示，补充完善功能性/空间布局/视觉效果
**【执行方向】**
1. index.html 齿轮按钮：齿轮点击事件 `showPage('settings')`
2. 设置页 HTML page-settings：四个模块（用户信息卡片展示 uid / 创建时间 / 三项数量统计；账号安全 6 项带绑定状态；隐私政策 scroll 阅读；退出登录按钮）
3. 弹窗 HTML confirm-modal：通用两键确认框（取消/确定），支持自定义标题/内容/确定回调
4. 设置页 CSS：.settings-page/.settings-card/.settings-item/.settings-badge/.modal-overlay/.modal-box
5. 设置页 JS 函数：showSettings/goBack/showPrivacyModal/showLogoutModal/doLogout/openAccountSection
6. 十三宫三分区：renderTraditionalPlate 与 buildPaipanHTML 每个 `<td>` 改成 `<div class="pc-tri/exp-tri"><div class="pc-col pc-left">神/星/门</div><div class="pc-col pc-mid">灵盘/天盘/人盘/地盘/暗干</div><div class="pc-col pc-right">天罡/日排局</div></div>`
7. 排盘页底部卡：删除"双人合盘"→替换为"万年历"卡片；我的页基础设置删除真太阳时/早晚子时/星曜/闰月设置；其他工具删除双人合盘；记录页顶端按钮"清空"→"清空历史"；删除"其他"分区
8. export-bar CSS：初始态 opacity:0 + pointer-events:none + translateY(calc(100%+60px)) 三重隐藏，批量模式下移除 opacity:0 pointer-events:none 并 translateY(0)
**【执行边界】** 仅修改 public/index.html（HTML/CSS/JS），新增 CSS ~35 行，新增 HTML 结构 ~45 行，新增 JS 函数 ~108 行
**【执行结果】**
- 设置页 page-settings DOM 正确显示 4 模块：用户信息卡片(含 UID/创建时间/历史收藏消息三项统计) + 账号安全(手机/微信/QQ/邮箱/重置密码/注销账号每项有状态badge) + 隐私政策(滚动条可阅览2000字政策全文) + 退出登录按钮(点击弹 confirm-modal)
- 三个弹窗(隐私政策/退出登录/注销确认)可通过 openModal 正常打开，取消/确定回调正常
- 十三宫三分区：每宫三列布局结构渲染（左区 神/星/门 3 行 · 中区 灵盘/天盘/人盘/地盘/暗干 5 行 · 右区 天罡/日排局 2 行），renderTraditionalPlate 与 buildPaipanHTML 代码完全一致
- UI 清理：齿轮点击跳转设置页（之前为 undefined handler）；排盘页底部卡显示万年历；基础设置仅 4 项；其他工具 3 项；记录页清空历史按钮位于顶端；无"其他"分区
- export-bar 默认完全隐藏不遮挡开始排盘按钮（opacity:0 + translate 下移 60px + pointer-events:none 三重保障）
**【相关文档】** index.html、work-flow.md、AGENTS.md

### 2026-08-23 算法/UI 最终修复：日排局匹配 + 顶层字段 + browser-entry + bundle 重建 + 单测

**【时间】** 2026-08-23
**【事件】** 最终端到端验证发现两处未完成缺陷：① placeRiPaiJu 仅匹配当前月份簇，漏匹配其他月份簇（导致 0/13）② pillars.js 返回结果 lunarMonth/lunarDay/shiZhi 仍藏在 extraContext 子对象中，前端无法直接获取；③ browser-entry.js 未导出 fullPaiPanFromTime 与 SHEN/XING/MEN
**【问题来源】** 浏览器即时排盘三分区验证 + node pillars.js 直接输出发现 riPaiJu count=0/13，browser console 提示 lunarMonth undefined
**【执行方向】**
1. 修复 algorithm/qimen.js placeRiPaiJu：去除 `if (mc.month !== lunarMonth) continue;` 条件，改为遍历所有月份簇按 `dayOfMonth` 匹配，匹配到即返回；额外添加 dayOfMonth 参数有效性校验 (1-31)
2. 修复 algorithm/pillars.js fullPaiPanFromTime 返回结构：将 lunarMonth/lunarDay/shiZhi 从 extraContext 提升至顶层，保留 extraContext 向后兼容
3. 修复 algorithm/browser-entry.js：导入 `{ fullPaiPan, fullPaiPanFromTime, getFourPillars }` 与 `{ SHEN, XING, MEN }`；window.QiMenAlgorithm 与 module.exports 同步导出所有成员
4. 重建 bundle：`cd f:\1\夫 ; npm run build:browser` (esbuild IIFE global QiMenAlgorithmBundle，内部再赋值 window.QiMenAlgorithm)
5. 单元测试：`cd algorithm ; node test.js` 阴遁/阳遁 5 局双过；`node pillars.js` 四柱双过；`node -e "fullPaiPanFromTime(2026,8,23,16,8)"` 验证 riPaiJu 1/13 / 天罡 12/13 / 灵盘 13/13
6. 浏览器即时排盘：即时排盘按钮跳转 page-result，三分区 DOM 呈现，神=太常 出现在第 1 行(正确神顺序)
**【执行边界】** 改 algorithm 下 3 文件 + 重建 bundle，未动 UI 前端（前端三分区在 Task 3 已完成渲染）
**【执行结果】**
- placeRiPaiJu：2026-08-23 (农历七月十一日=dayOfMonth=11) 正确匹配五月簇 8-14 → gongIdx=3 (2首) → riPaiJu="五月 11日" ✓
- pillars 返回顶层：`{ lunarMonth:7, lunarDay:11, shiZhi:'申' }` 直接赋值 `curData.lunarMonth` 无需访问 extraContext
- browser-entry 导出：QiMenAlgorithm.{fullPaiPan, fullPaiPanFromTime, getFourPillars, SHEN, XING, MEN} 全局可调用
- build:browser：public/algorithm.bundle.js 688.0kb（+0.3kb），57ms 完成
- node test.js：阴遁5局 ✅；阳遁5局 ✅；全部测试通过 ✅
- node pillars.js：四柱①② ✅；完整排盘 ✅；====== 全部验证通过 ✅ ======
- 浏览器验证结果：即时排盘(阴盘·阳遁·3局) → 结果页 DOM 中排盘 table 每行显示 神/星/门/灵/天/人/地/暗，共 4 行 13 宫布局，"太常"出现在第 1 行第 3 格（新神顺序玄武白虎太常六合勾陈腾蛇玄灵天后九天太阴贵神青龙朱雀）
**【相关文档】** algorithm/qimen.js、algorithm/pillars.js、algorithm/browser-entry.js、public/algorithm.bundle.js、work-flow.md、前言.docx、天罡.docx、排盘-【阴盘-阴遁-5局】 2(1)(1).docx

### 2026-08-23 GitHub Pages 入口同步修复：public/* → 仓库根目录

**【时间】** 2026-08-23
**【事件】** 用户反馈「GitHub Pages 和 localhost 完全是两个不同的 app」：GitHub Pages 显示旧版「奇门排盘助手」（3 底部 Tab、无齿轮设置、无三分区、无悬浮双鱼），而 localhost:8125 显示完整新版「道家奇门遁甲」
**【问题来源】** GitHub Pages 默认读取仓库根目录 index.html 作为站点入口（根目录存在 .nojekyll → Pages 配置为 master 分支根目录模式）；但之前所有前端更新（齿轮设置、三分区、UI清理、三Tab改四Tab、学堂Tab、夜间/收藏/消息/导出、万年历卡替换双人合盘等）仅写入 public/index.html，根目录 index.html 严重陈旧（缺 page-settings、pc-tri、底部 4-Tab 结构、悬浮阴阳双鱼 AI 按钮等），导致 GitHub Pages 显示历史版本
**【执行方向】**
1. 用 LS 列出仓库根目录文件，确认同时存在 `index.html`（根）与 `public/index.html`（新版）
2. Grep 根 index.html 查关键标记：根 index.html 无 `page-settings`、无 `pc-tri`、无 `夜间模式/我的收藏/我的消息/导出历史` 四模块 → 确认为陈旧版本
3. PowerShell `Copy-Item -Force` 将 public/{index.html,algorithm.bundle.js,knowledge.js,regions.js,yinyang.png,admin.html,backend-demo.html} 复制到根目录，覆盖旧 index.html 并补齐缺失资源
4. 复制后验证：根 index.html L771=`<div id="page-settings" ...>`（齿轮设置页命中）、L503=`.pc-tri{display:grid...}`（三分区样式命中）
5. `git add -A` 暂存 7 文件（含 index.html 修改 + 6 新资源）
6. 提交：commit 信息明确写「同步 public/前端资源到仓库根目录，修复 GitHub Pages 显示旧版本」
7. 推送：首次 push 因 GitHub HTTPS 链路偶发 300s 超时失败（fatal: unable to access ... Connection timed out after 300034ms）；诊断代理（无 git/env 代理，Test-NetConnection github.com:443 = True，Invoke-WebRequest github.com 只用 0.2s）→ 判定为偶发链路抖动；开启 GIT_CURL_VERBOSE=1 重试，第二次 5s 内完成，TCP→TLS重协商→Basic鉴权→POST git-receive-pack 200 OK
8. 对齐验证：`git rev-parse HEAD` vs `git rev-parse origin/master` 均为 e061fd3b07eeaf37658cd4cf7c7dc2beff7d7763，完全一致
9. 内容验证：WebFetch `https://142857110823.github.io/app-for-father/?v=1724403000`，标题为「道家奇门遁甲」（非旧「奇门排盘助手」）、含齿轮年月日时分选择器、阴盘/阳盘类型切换、示例一示例二快捷按钮、底部 4-Tab 含学堂，证明 Pages 已加载根目录新版 index.html
**【执行边界】** 不修改 public/ 任何内容，仅以只读方式复制 public/ → 根目录；不改动后端/算法；不影响 Node server.js serve public/ 的本地访问行为（因此 localhost:8125 保持不变）
**【执行结果】**
- 根 index.html：现与 public/index.html 字节一致 → 含齿轮设置、三分区、4-Tab、悬浮双鱼盘、万年历卡替换双人合盘、export-bar 三重隐藏等全部新版特征
- 根同步资源：algorithm.bundle.js 688.0kb、knowledge.js（含天罡/日排局表）、regions.js（省市区齿轮）、yinyang.png（AI 按钮）、admin.html/backend-demo.html
- git push 第二次成功：`2573906..e061fd3 master -> master`，git rev-parse 本地/远端一致
- GitHub Pages 已命中新版：WebFetch 结果标题为「道家奇门遁甲」，不再是旧版截图中的「奇门排盘助手」（用户按 Ctrl+Shift+R 强刷即可同步）
- 本地/远程一致性：localhost:8125 与 Pages 入口 HTML 完全相同（Node server 用 public/，Pages 用根目录，两份内容现在字节级一致）
**【相关文档】** index.html（根）、algorithm.bundle.js（根）、knowledge.js（根）、regions.js（根）、yinyang.png（根）、admin.html（根）、backend-demo.html（根）、public/index.html、public/algorithm.bundle.js、.nojekyll、work-flow.md

---

## 关键决策记录

| 日期 | 决策 | 依据 | 状态 |
|------|------|------|------|
| 2026-08-20 | 本篇仅实现阴盘 | 前言明确"本篇文档仅介绍阴盘" | 已定 |
| 2026-08-20 | 风格参考夸克扫描王 | 用户指定 | 已定 |
| 2026-08-20 | 技术栈：原生 Android Kotlin + Jetpack Compose | 性能/体积/渲染/契合夸克风格 | 已定（采用推荐） |
| 2026-08-20 | 功能范围：排盘核心（阴盘） | 专注精准、契合夸克简洁定位 | 已定（采用推荐） |

---

## 风险跟踪

| 风险 | 影响 | 应对 |
|------|------|------|
| 前言对阴遁定局描述较简略 | 算法实现可能有歧义 | 以前言示例②为基准用例，必要时向用户澄清 |
| 十三宫方位衍生序列需进一步确认 | 影响排盘正确性 | 实现前用参考 PDF 核对 |
| 贵神口诀→宫位映射细节 | 影响贵神落宫 | 需对照参考图确认 |

---

## 验证用例（来自前言）

| 用例 | 时间 | 四柱 | 期望结果 |
|------|------|------|----------|
| ① | 2026-08-14 14:22 | 丙午 丙申 庚申 癸未 | 阴盘-阳遁-5局 |
| ② | 2026-08-14 12:22 | 丙午 丙申 庚申 壬午 | 阴盘-阴遁-5局 |

> 算法实现后必须通过以上两个用例验证。
