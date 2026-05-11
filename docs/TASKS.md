# 📋 总任务清单(v1.0.0 单一真相源)

> **本文是团队协作的「单一真相源」**——按模块组织,跨整个 v1 周期。
> 完成一项打勾(`[x]`),写明完成人和日期。每日站会以本文为准。
>
> 上游 → [`ROADMAP.md`](./ROADMAP.md)(为什么这么排)/ [`00-overview/mvp-scope.md`](./00-overview/mvp-scope.md)(每个模块的边界)
> 周执行清单 → [`AUTO-RUN-2026-05-12.md`](./AUTO-RUN-2026-05-12.md) / [`-19.md`](./AUTO-RUN-2026-05-19.md) / [`-26.md`](./AUTO-RUN-2026-05-26.md)

---

## 0. 进度大盘(每日下班前回填一次)

> **更新规则**:复制 `### 大盘 - YYYY-MM-DD` 块在最下方追加,旧的保留作历史。

### 大盘 - 2026-05-11(基线 / 计划制定日)

| 模块 | 任务数 | 已完成 | 进度 | 责任 | 风险 |
|---|---|---|---|---|---|
| 基础设施 | 6 | 6 | 🟢 100% | 后端 | — |
| 文档体系 | 8 | 8 | 🟢 100% | 共同 | — |
| auth | 7 | 5 | 🟡 71% | 后端 | 真实 AppID 待 C3 |
| user | 5 | 0 | ⚪ 0% | 后端 | — |
| pig | 6 | 0 | ⚪ 0% | 后端 | — |
| order | 7 | 0 | ⚪ 0% | 后端 | — |
| pay | 5 | 0 | ⚪ 0% | 后端 | 商户号 C4 |
| wallet | 4 | 0 | ⚪ 0% | 后端 | — |
| share | 3 | 0 | ⚪ 0% | 后端 | — |
| farmer / feeding / health / live | 8 | 0 | ⚪ 0% | 后端 | — |
| message / upload | 5 | 0 | ⚪ 0% | 后端 | — |
| 前端骨架 | 4 | 4 | 🟢 100% | 前端 | — |
| 前端页面(11) | 22 | 0 | ⚪ 0% | 前端 | — |
| 部署运维 | 8 | 4 | 🟡 50% | 后端 | — |
| **合规依赖** | 10 | 0 | 🔴 0% | **Owner** | 🚨 阻塞性 |
| 监控告警 | 5 | 0 | ⚪ 0% | 后端 | — |
| APP 打包 | 4 | 0 | ⚪ 0% | 前端 | iOS 账号 C9 |
| 测试 | 6 | 0 | ⚪ 0% | 共同 | — |
| **合计** | **123** | **27** | **22%** | | |

> 🚨 **当前最大瓶颈**:合规依赖 0/10。后续每一项都可能因此阻塞。

---

## 1. 已完成(W0 · v0.1.0 + v0.2.0 · 截至 2026-05-11)

> 留作团队入职"读完知道我们走到哪一步"的快速 onboarding 区。

### 1.1 基础设施 🟢 6/6

- [x] 腾讯云 CVM `175.24.175.123` Ubuntu 24.04 就位(2026-05-09 · Claude)
- [x] Node 20.20.2 / pnpm / pm2 / MySQL 8.0.45 / Redis 7.0.15 / nginx 1.24.0 安装(05-09 · Claude)
- [x] 数据库 `pig` + 应用账户 `pig_app@localhost` + 凭据 `/home/ubuntu/.pig-secrets`(05-09 · Claude)
- [x] 部署目录 `/opt/pig/{releases,shared,logs}` + pm2 开机自启(05-09 · Claude)
- [x] 域名 `www.rockingwei.online` + Let's Encrypt HTTPS + nginx 反代(05-11 · Owner)
- [x] 服务器磁盘清理(释放 11.4G,8.6G / 40G)(05-09 · Claude)

### 1.2 仓库 & 协作 🟢 8/8

- [x] 本地 Git 仓库 + `.gitignore`(05-09)
- [x] GitHub 远端 `github.com/W3217-SUDO/PIG-web` 推送(05-09)
- [x] Monorepo workspaces(backend / frontend / admin)+ 根 package.json(05-11)
- [x] EditorConfig / nvmrc / Prettier / ESLint(05-11)
- [x] GitHub 模板(PR / Issue × 3)+ Actions 工作流(CI / Deploy)(05-11)
- [x] 文档体系 8 章 26 篇(05-11)
- [x] CHANGELOG.md(05-11)
- [x] 5/31 上线总路线图 + MVP 范围 + W1/W2/W3 任务清单(05-11 · Claude)

### 1.3 后端骨架 🟡 5/7

- [x] NestJS 项目结构(controller / service / module / dto / filter / interceptor)(05-11)
- [x] TypeORM + 5 张 entity(user / pig / order / share / wallet)+ InitialSchema migration(05-11)
- [x] Redis 接入 + `/api/health` 健康检查(DB + Redis 双探)(05-11)
- [x] JWT 全局 guard + `@Public()` 装饰器(05-11)
- [x] `POST /api/auth/dev-login` + `GET /api/auth/me`(05-11)
- [ ] `POST /api/auth/wx-login` 真实 openid 换 token(占位 AppID,待 C3 拿到真 AppID 才能验)
- [ ] `POST /api/auth/refresh` + `POST /api/auth/logout`

### 1.4 前端骨架 🟢 4/4

- [x] uni-app + Vue3 + TS + Vite + Pinia(05-11)
- [x] `request.ts` 跨端封装(uni.request)(05-11)
- [x] H5 dev server 跑通(`http://localhost:5173/`)(05-11)
- [x] 首页演示 `/api/health` 探活 + dev-login 拿 token 调 `/me`(05-11)

---

## 2. v1 待办(按模块组织)

> 优先级:🔴P0 上线必须 / 🟡P1 上线最好有 / 🟢P2 推迟也可

### 2.1 🔴 auth · 认证(2/7)· W2 · 后端

完成度 71%(主流程已通,差真实小程序登录)

- [x] dev-login + JWT 签发
- [x] JwtAuthGuard + @Public()
- [ ] **wx-login 真实链路**(W2 · 等 C3 AppID)
  - [ ] `wx.login` code → 调微信 `code2Session` → 拿 openid + session_key
  - [ ] 落 user 表(openid 唯一索引)
  - [ ] 签发 access + refresh token
- [ ] `POST /api/auth/refresh`(W1)
- [ ] `POST /api/auth/logout`(W1,清 Redis 中的 refresh token)
- [ ] `@Roles('customer' | 'farmer' | 'admin')` 守卫装饰器(W1)
- [ ] 单测 e2e(覆盖率 ≥ 60%)(W3)

### 2.2 🔴 user · 用户(0/5)· W1 · 后端

完成度 0%

- [ ] `GET /api/users/me`(返回完整 profile)
- [ ] `PATCH /api/users/me`(改 nickname / avatar_url / phone / id_card)
- [ ] `address.entity.ts` + migration
- [ ] 地址 CRUD 4 接口(list / create / update / delete)
- [ ] is_default 互斥处理 + 单测

### 2.3 🔴 pig · 猪只(0/6)· W1 · 后端

完成度 0%

- [ ] `pig.entity` 加字段(farmer_id / mock_video_url / breed / expected_weight_kg)+ migration
- [ ] `GET /api/pigs?page=&pageSize=&region=`(默认 status=available)
- [ ] `GET /api/pigs/:id`(嵌套 farmer 简要信息)
- [ ] `GET /api/pigs/:id/timeline`(聚合 feeding + health)
- [ ] `GET /api/my/pigs`(从 Order 反查我名下 status=active 的猪)
- [ ] 状态机 v1(仅 `available / claimed` 两态)

### 2.4 🔴 order · 订单(0/7)· W1 · 后端

完成度 0%

- [ ] `order_payment.entity` + migration
- [ ] `POST /api/orders`(校验份额库存 + 创建 pending_payment)
- [ ] `GET /api/orders/me?page=&status=`
- [ ] `GET /api/orders/:id`(含 pig 嵌套)
- [ ] `POST /api/orders/:id/cancel`(仅 pending_payment 可取消)
- [ ] `POST /api/orders/:id/mock-paid`(NODE_ENV!=production)
- [ ] 状态机 v1(`pending_payment / active / cancelled`)+ 单测

### 2.5 🔴 pay · 微信支付(0/5)· W2 · 后端 · ⚠️ 依赖 C4-C5

完成度 0%

- [ ] 装 `wechatpay-node-v3` + `PayModule`
- [ ] `POST /api/pay/wx-prepay`(JSAPI 下单返回 5 字段)
- [ ] `POST /api/pay/wx-notify`(v3 签名校验 + APIv3Key 解密 + 幂等)
- [ ] nginx `/api/pay/wx-notify` location 限速(仅放微信 IP 段)
- [ ] 真实 ¥0.01 全链路通过(沙箱 + 真实双验)

### 2.6 🔴 wallet · 钱包(0/4)· W1 · 后端

完成度 0%

- [ ] `wallet_transaction.entity` + migration
- [ ] `GET /api/wallet/me`(自动 ensure 钱包存在)
- [ ] `GET /api/wallet/transactions?page=&direction=`
- [ ] `POST /api/wallet/topup`(走微信支付,W2 联动)

### 2.7 🟡 share · 拼猪 v1(0/3)· W1 · 后端

完成度 0%(v1 极简版)

- [ ] `share.entity` 加 share_code(CHAR(8) UNIQUE)+ expires_at(30 天)
- [ ] `POST /api/orders/:id/share`(主认领人生成短码)
- [ ] `GET /api/share/:code`(`@Public()`,返回简版 pig + 主认领人昵称)

### 2.8 🟡 farmer · 农户(0/2)· W1 · 后端

完成度 0%

- [ ] `farmer.entity` + migration(name / region / years / avatar_url / story / video_url)
- [ ] `GET /api/farmers/:id` + `GET /api/farmers/:id/pigs`

### 2.9 🟡 feeding / health / live · 时间线 mock(0/4)· W1 · 后端

完成度 0%

- [ ] `feeding_record.entity` + `health_record.entity` + migration
- [ ] `GET /api/feeding/pig/:pigId`(只读,返回 seed mock 数据)
- [ ] `GET /api/health/pig/:pigId`(同上)
- [ ] `GET /api/live/:pigId/stream`(返回预录视频 URL)

### 2.10 🟡 message · 站内消息(0/3)· W1 · 后端

完成度 0%

- [ ] `message.entity` + migration
- [ ] `messageService.notify(userId, type, payload)` 工具方法
- [ ] `GET /api/messages` + `PATCH /api/messages/:id/read` + `POST /api/messages/read-all`

### 2.11 🟡 upload · 文件上传(0/2)· W1 · 后端

完成度 0%

- [ ] `POST /api/upload/image`(头像,multer 写本地 `/opt/pig/shared/uploads/`)
- [ ] nginx `/uploads/` 静态托管(本地 dev 跑通即可)

### 2.12 🔴 Seed 测试数据(0/4)· W1 · 后端

完成度 0%

- [ ] `db/seeds/seed-v1.ts` 写入 2 农户 + 5 猪 + 喂养 mock + 健康 mock
- [ ] `package.json` 加 `db:seed` script
- [ ] dev 用户 + 钱包初始化
- [ ] Navicat 验证数据

### 2.13 🔴 前端页面 11 + 工具(0/22)· W1+W2 · 前端

完成度 0%

#### 工具层(4)

- [ ] `request.ts` 完善 token 透传 + 401 自动跳登录
- [ ] `stores/auth.ts` Pinia store(token 持久化)
- [ ] `stores/user.ts`(当前用户信息)
- [ ] 设计 tokens 抽到 `styles/variables.scss`(主色暗红 / 暖黄 / 米白)

#### 页面(11)

- [ ] `pages/login/index.vue` — 登录(微信一键 + dev 标"测试通道")
- [ ] `pages/index/index.vue` — 首页(猪列表 / 下拉刷新 / 上拉分页)
- [ ] `pages/pig/detail.vue` — 猪详情(基础 + 农户卡 + 时间线 + 视频)
- [ ] `pages/order/confirm.vue` — 下单确认
- [ ] `pages/order/result.vue` — 支付结果
- [ ] `pages/my/index.vue` — 我的首页
- [ ] `pages/my/orders.vue` — 订单列表(tabs)
- [ ] `pages/my/pigs.vue` — 我的猪
- [ ] `pages/my/wallet.vue` — 钱包
- [ ] `pages/my/addresses.vue` — 收货地址
- [ ] `pages/share/landing.vue` — 分享落地
- [ ] `pages/static/privacy.vue` — 隐私政策
- [ ] `pages/static/terms.vue` — 用户协议
- [ ] `pages/static/about.vue` — 关于(含 ICP 备案号)

#### 全局组件(3)

- [ ] `components/Empty.vue` / `components/Loading.vue` / `components/ErrorBoundary.vue`
- [ ] 11 个页面真机走查(H5 + 小程序双端)
- [ ] 11 个页面截图存到 `docs/04-frontend/screens/`

### 2.14 🔴 部署 / CI · 后端(4/8)· W2-W3 · 后端

完成度 50%(基础就位,生产部署待跑通)

- [x] GitHub Actions `ci.yml` workflow
- [x] GitHub Actions `deploy-backend.yml` workflow(配置就绪)
- [x] 部署 SSH key 生成 + CODEOWNERS
- [x] docker-compose(本地 dev)
- [ ] **GitHub Actions 实跑一次部署**(SSH key 加白 + pm2 reload 验证)
- [ ] `pm2 ecosystem.config.js`(cluster × 2 + 日志切割)
- [ ] nginx 反代 `/api/` + 静态 `/uploads/` 上线
- [ ] `backend/.env.production` 从 `~/.pig-secrets` 派生(运维操作,不入仓)

### 2.15 🔴 监控可观测性(0/5)· W3 · 后端

完成度 0%

- [ ] Sentry 后端接入(@sentry/nestjs)
- [ ] Sentry 前端接入(@sentry/vue + sourcemap 上传)
- [ ] pino 日志 JSON 行式 + 按日切割(30 天保留)
- [ ] `/api/health` 加 disk / mem / pm2 状态
- [ ] 飞书 / 钉钉机器人告警 webhook(pm2 restart × 3 / Sentry 阈值)

### 2.16 🟡 APP 打包(0/4)· W3 · 前端 · ⚠️ iOS 依赖 C9

完成度 0%

- [ ] Android APK 出包(HBuilderX 云打包或本地)
- [ ] APK 自签名 + 上传内部分发(蒲公英 / 群文件)
- [ ] iOS .ipa 出包(若 C9 到位)
- [ ] TestFlight 内部测试 + 3 名测试员安装

### 2.17 🟡 测试(0/6)· W1-W3 · 共同

完成度 0%

- [ ] 后端单测覆盖率 ≥ 40%
- [ ] e2e 测试套件(supertest):auth / order / wallet 主链路
- [ ] `scripts/smoke-w1.sh` curl 一条龙
- [ ] 前端 H5 端到端真机走查
- [ ] 微信开发者工具真机调试
- [ ] 上线前压测(loadtest 50 RPS / 5 分钟)

### 2.18 🔴 运营支撑(0/3)· W3 · 共同

完成度 0%

- [ ] `docs/06-deployment/admin-sop.md`(运营 SOP 完整版)
- [ ] `scripts/admin/*.sql.template`(发猪 / 改单 / 充值模板)
- [ ] 与运营做一次"跟随我操作"演练并修订 SOP

---

## 3. 🚨 合规依赖(Owner 主责 · 0/10)· 跨周

> ⚠️ 这是 v1 的**最大风险源**。详见 ROADMAP §4。

| 编号 | 事项 | Deadline | 负责人 | 状态 | 不做的后果 |
|---|---|---|---|---|---|
| C1 | 小程序帐号注册(主体确认) | 5/14 | Owner | ⬜ | 无法上线 |
| C2 | 小程序类目选定 + 资质(农副产品/食品) | 5/14 | Owner | ⬜ | 卡审 |
| C3 | AppID / AppSecret 写入服务器 `~/.pig-secrets` | 5/14 | Owner | ⬜ | wx-login 不通 |
| C4 | 微信支付商户号开通 | 5/20 | Owner | ⬜ | 不能收款 |
| C5 | 商户号 API v3 密钥 / 证书 | 5/20 | Owner | ⬜ | 同上 |
| **C6** | **rockingwei.online ICP 备案确认** | **立刻** | **Owner** | ❓ | **整体停摆** |
| C7 | 食品/农副产品资质(若类目需要) | 5/25 | Owner | ⬜ | 卡审 |
| C8 | 隐私政策 + 用户协议文案 | 5/22 | Owner | ⬜ | 提审驳回 |
| C9 | Apple Developer Program(¥688) | 5/15 | Owner | ⬜ | iOS 砍 / TestFlight 无 |
| C10 | 软件著作权(部分安卓商店) | — | Owner | ⬜ | 商店上架卡 |

---

## 4. 团队分工总览

| 角色 | 主战场 | W1 重点 | W2 重点 | W3 重点 |
|---|---|---|---|---|
| **后端 + 部署** | `backend/` 模块 + 服务器 | user/pig/order/wallet/share/message + seed | pay + notify + 部署生产 | 监控 + 灰度 + 故障应对 |
| **前端 + 设计** | `frontend/` + UI | H5 6 页跑通 + 工具层 | 11 页像素级 + 小程序兼容 | 审核修改 + APP 打包 |
| **Owner(合规)** | 资质 / 文案 / 帐号 | C1-C3 | C4-C5 + C8 | C7 兜底 + 灰度运营 |
| **共同** | `docs/` + `db/migrations/` + 测试 | 数据模型 + API 契约 review | 联调 + 用户体验走查 | 运营 SOP + 上线日全员在线 |

> 2 人小团队约定:每人主战场不超过 1 个模块,跨界协作只在「数据模型 + API 契约」交叉。

---

## 5. 工作流约定

### 5.1 状态语义

| 标记 | 含义 |
|---|---|
| `[ ]` | 未开始 |
| `[~]` | 进行中(可选,markdown 不识别但人能看懂) |
| `[x]` | 已完成 |
| `[!]` | 阻塞(必须在下方"阻塞日志"区段说明) |
| `[-]` | 已废弃 / 砍掉(在 ROADMAP 决策日志留痕) |

### 5.2 完成一项任务时

1. 把 `[ ]` 改成 `[x]`
2. 在该行末尾追加 ` ✓ YYYY-MM-DD · 完成人`(例:`✓ 2026-05-13 · 后端`)
3. 顺手更新 §0 大盘的"已完成"数字
4. 在 commit message 里引用任务 ID(例:`feat(pig): 列表 + 详情 #2.3`)

### 5.3 发现新任务

1. 加在对应模块下,标 `[ ]`
2. 在 §0 大盘对应模块的"任务数"+1
3. 如果超出 v1 范围 → 放到 §7 v1.5 储备清单

### 5.4 阻塞

任何 `[!]` 任务必须在下方记录:

#### 阻塞日志(空) — 出现时往这里写

```
- [日期] 任务 ID — 阻塞原因 — 等待 — 预计解除时间
```

### 5.5 commit 规约

```
<type>(<scope>): <summary> [#TASK-ID]

详细说明...
```

`<type>` ∈ `feat / fix / docs / chore / refactor / test / perf / style`
`<scope>` ∈ `auth / user / pig / order / pay / wallet / share / mp / app / infra / docs`

---

## 6. 验收清单(5/31 23:59 = 项目成功)

> 与 [`00-overview/mvp-scope.md`](./00-overview/mvp-scope.md) §6 一致,这里聚合到本文方便单页 checklist。

- [ ] 微信小程序「已发布」(灰度或全量)
- [ ] 任意真实用户用自己微信扫码可进入并下单
- [ ] 5 头真实运营录入的猪在售
- [ ] 至少 1 单真实小额付款成功(¥0.01-1.00)
- [ ] Sentry 24h error 数 < 10
- [ ] 服务器无未恢复故障
- [ ] Android APK 已分发,≥ 3 名内测安装成功
- [ ] iOS TestFlight 已分发(若 C9 到位)
- [ ] 运营用 SOP 自助新增 ≥ 1 头猪
- [ ] `v1.0.0-release` tag 已 push
- [ ] 复盘文档已写

---

## 7. v1.5 储备清单(6 月起点)

> 这里不动手做,只挂账。每次有"想做但 v1 不做"的事都进来。

- [ ] 拼猪完整版(加入 / 成员管理 / 踢出 / 退出 / 权限隔离)
- [ ] 每日定时扣代养费(node-cron)
- [ ] 微信模板消息推送(订单状态)
- [ ] 短信登录 + 阿里云 / 腾讯云 SMS
- [ ] 真实直播 v1(腾讯云 LCB / RTMP / FLV)
- [ ] 真实喂养打卡(农户端写入 + 异常告警)
- [ ] 真实健康档案写入(兽医角色 / 疫苗记录)
- [ ] 保险产品配置 + 购买 + 理赔
- [ ] GUI 管理后台 v1(Vue3 + ElementPlus,管理员、订单、猪、农户、对账)
- [ ] iOS App Store 正式上架
- [ ] Android 多渠道上架(华为 / 小米 / OPPO / VIVO / 应用宝)
- [ ] 软件著作权
- [ ] 农户工作台(独立 APP / 复用 C 端按角色切换)
- [ ] 出栏决策流程(用户选取猪 / 续养 / 卖回)
- [ ] 屠宰流程 + GPS 冷链追踪
- [ ] 农户评分系统
- [ ] 数据 BI 看板(运营 GMV / 复购率 / 拼猪率)

---

## 8. 历史大盘(归档)

> 每天的大盘快照,便于回溯进度趋势。最新的在 §0,旧的在这里。

### 大盘 - 2026-05-09(项目起点)

| 模块 | 状态 |
|---|---|
| 工作区 | 仅 1 份 HTML 原型 |
| 服务器 | 待装环境 |
| 代码仓库 | 未建立 |

### 大盘 - 2026-05-11(v0.2.0 发布日,计划制定)

见 §0(当前)。

---

## 链接

- 路线图 → [`ROADMAP.md`](./ROADMAP.md)
- MVP 范围 → [`00-overview/mvp-scope.md`](./00-overview/mvp-scope.md)
- 周执行清单 → [`AUTO-RUN-2026-05-12.md`](./AUTO-RUN-2026-05-12.md) / [`-19.md`](./AUTO-RUN-2026-05-19.md) / [`-26.md`](./AUTO-RUN-2026-05-26.md)
- 变更日志 → [`../CHANGELOG.md`](../CHANGELOG.md)
- 协作流程 → [`07-contribution/workflow.md`](./07-contribution/workflow.md)
