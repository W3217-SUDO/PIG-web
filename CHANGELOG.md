# Changelog

> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### Planning
- 制定 5/31 上线总路线图 `docs/ROADMAP.md`
- MVP v1.0.0 范围矩阵 `docs/00-overview/mvp-scope.md`
- W1 / W2 / W3 自动执行任务清单(`docs/AUTO-RUN-2026-05-12.md` / `-19.md` / `-26.md`)
- 总任务清单 `docs/TASKS.md`(单一真相源,按模块组织)
- 项目快照文件夹 `docs/snapshot/`(项目状态 + 服务器现状速读)
- 文档总索引更新,顶部增加"当前进行中"区块 + 新人入职引导

### W1 切片完成(2026-05-12,6 个端到端 commit)

**S1 - 猪列表 + 首页原型像素级复刻** (`00f6ea5`)
- pig.entity 加字段:farmer_id / region / expected_weight_kg / mock_video_url
- 新建 farmer 模块(entity + module)
- 新建 PigModule:`GET /api/pigs` 列表(分页 + 地区筛选)
- seed 脚本:2 农户 + 5 头猪(Unsplash 真实图)
- 首页 11 个区块按原型像素级复刻(Hero / 三大主张 / 直播 / 4 步流程 / 拼猪 / 选你的猪 / 关于我们 / 信任带 / Tabbar)
- 全部用 view/text/image + rpx,三端兼容

**S2 - 猪详情 + 时间线** (`869c8ff`)
- feeding_record + health_record entity(meal_type / record_type 枚举)
- migration S2Detail
- seed 扩展:每只猪 5 条喂养(过去 3 天循环)+ 3 条健康(体检/疫苗/称重)
- `GET /api/pigs/:id` 详情(含农户全字段 + story)
- `GET /api/pigs/:id/timeline` 喂养+健康聚合时间线
- pages/pig/detail.vue:封面 + 基础卡 + 农户卡 + 拼猪入口 + 时间线 tab + 底部 CTA

**S3 - 用户 + 地址 + 我的中心** (`1865c65`)
- address.entity + UpsertAddressDto(手机号正则校验 / is_default 互斥)
- AddressController + AddressService(CRUD,删除默认时自动提下一条)
- UserController:`PATCH /api/users/me`(部分字段更新)
- pages/login/index.vue + my/index.vue + my/profile.vue + my/addresses.vue
- request.ts 401 自动跳登录(避免在登录页本身循环)

**S4 - 下单 + 钱包 + mock 支付** (`0a3f47f`)
- order_payment + wallet_transaction entity(direction / type / balance_after)
- migration S4Order
- OrderService:create / list / detail / cancel / mockPay(事务包裹)
- WalletService:ensureWallet / getOverview / credit / debit(事务)
- mockPay 流程:校验份额 → order=paid → pig.sold_shares+= → SOLD_OUT 自动转 → 落 payment 流水
- pages:order/confirm + order/result + my/orders(4 状态 tab)+ my/wallet(暗红余额卡)
- pig/detail 立即认养 CTA 实跳

**S5 - 拼猪邀请短链** (`a825d39`)
- share_invite entity:8 位短码(去 IO01 易混)+ 30 天 TTL
- ShareService:createInvite(同订单复用未过期 code)+ lookup(@Public)
- pages/share/landing.vue:暗红邀请 hero + 浮起猪卡 + 四大卖点 + v1 说明
- 订单列表 paid 状态加 '🤝 发起拼猪' + 邀请码 modal(大字短码 + 一键复制)

**S6 - 消息中心 + 我的猪圈** (`709cadb`)
- message.entity:type 五枚举 + is_read + read_at + (user_id, is_read, created_at) 复合索引
- MessageService.notify():失败仅 log,异步触发,不影响主流程
- OrderService.mockPay 接入:支付成功自动触发 '🎉 认领成功' 消息
- pages/messages/index.vue:统计 + 全部已读 + 类型 icon + 红点 + 自动 mark-read
- pages/my/pigs.vue:从 paid 订单反查(份额 / 已养天数 / 已付)+ LIVE 红标

### 代养人端微信认证系统(2026-05-13 · Claude, commits `ae2a9d5` / `2a9b0fc`)

**农户账号体系**
- `farmer.entity` 新增 4 个微信字段：`openid`(唯一索引) / `phone` / `wx_nickname` / `wx_avatar`
- 每个农户账号绑定唯一 openid，无法跨账号登录（独立隔离）

**后端认证接口（`/api/foster/auth/*`）**
- `POST /foster/auth/login`：wx.login code → 调微信 code2session → 四分支返回
  - `success`：openid 已绑定 → 直接返回 farmerId + 30天 Token
  - `unbound`：openid 未绑定 → 返回可选农户列表（供用户认领身份）
  - `new_user`：无未绑定农户 → 走注册流程
  - `dev_mode`：无 AppSecret → 开发模式，按姓名直接登录
- `POST /foster/auth/bind`：首次认领，把 openid 写入已有农户
- `POST /foster/auth/register`：新建农户并绑定 openid（openid 幂等检查）
- `POST /foster/auth/dev-login`：开发模式按姓名直接登录（无 AppSecret 时）
- Token：HMAC-SHA256 + farmerId + 过期时间戳，base64url 编码，30天有效

**前端代养人端全面升级（`foster-care-page/`）**
- `utils/request.ts`：新增 `setFosterToken` / `getFosterToken` / `clearAuth`；所有请求自动携带 `X-Foster-Token` 头
- `pages/login/index.vue`：完全重写，四路分流登录：
  - 微信一键登录 → 自动路由到 success/unbound/new_user/dev_mode 流程
  - 已登录状态：绿色当前身份栏 + "进入工作台" 快捷按钮 + 切换账号入口
  - unbound 流程：农户列表选择 → 一键绑定认领
  - new_user 流程：填写姓名/地区/散养年限 → 注册并绑定
  - dev_mode 流程：输入姓名或快速点选列表，无需微信授权
- `pages/workbench/index.vue`：退出时调用 `clearAuth()` 同时清除 farmerId 和 Token
- `pages/pigs/index.vue`：体重修改必须上传称重图片验证；ownerNote 专用列（不混入 description）

**错误修复**
- 修复 `GET /foster/pigs 500`（order 表缺少多个列，逐一 ALTER TABLE 补全）
- 修复 ownerNote 显示猪 description 内容（改用专用 `owner_note` 列）
- 修复 PUT→PATCH 方法不匹配导致 405（admin 页面所有 update 改 PATCH）
- 修复 Unsplash 图片在微信小程序 404（seed 数据改为空字符串，前端文字头像回退）
- 修复 TypeScript 编译阻塞（`@sentry/node` 改为 dynamic require，`null` 过滤改 `IsNull()`）
- 说明 `Error: timeout` 根因：微信开发者工具须勾选"不校验合法域名"

### W2 进行中
- 真实小程序 AppID `wx4409bb388ab1a03e` 配入 `frontend/src/manifest.json`(`5026ce2`)
- 静态页 3 张:`pages/static/about` + `terms` + `privacy`(提审必需)
- ICP 备案号占位,Owner 拿到后回填 about 页

### 生产部署 + 运维 (2026-05-12, commits `8c70767` / `318fe52`)
- **首次生产部署完成** · `/opt/pig/releases/20260512-*/` · pm2 fork 模式
- nginx `/api/` 反代修复(去 proxy_pass 末尾 `/`)
- 生产 MySQL 14 张表 + seed mock 数据(2 农户 / 5 猪 / 40 时间线记录)
- H5 上线到 `/var/www/html/pig/`(原型备份到 `pig-prototype-*`)
- 公网 https://www.rockingwei.online/ 全链路 200
- `infra/deploy/{backend.sh,h5.sh,ecosystem.config.cjs}` 部署自动化
- `docs/06-deployment/deploy-runbook.md` 实战手册(含 5 个踩过的坑)
- `scripts/smoke-prod.sh` 23 项 curl 测试(全绿才算上线 OK)
- `infra/backup/mysql-backup.sh` + cron 0 3 * * * 每日备份(保留 30 天)
- `/api/health.system.*` 加 8 字段(pid/node/rss/load/mem/cpu/uptime)
- **微信小程序登录链路真实跑通** · AppSecret 写服务器 `~/.pig-secrets`
  与 `.env.production`(均 mode 600)· 后端调微信 `jscode2session`
  通过 AppID+Secret 配对验证(用假 code 测试,返回 invalid code 而非
  invalid appsecret = 配对正确)
  → 待 Owner 在微信公众平台后台加 `https://www.rockingwei.online`
    到「request 合法域名」即可完整端到端真实登录

## [0.2.0] - 2026-05-11

### Added
- 完整 Monorepo 仓库骨架(根 README / package.json workspaces / EditorConfig / nvmrc)
- 完整开发文档体系(`docs/` 8 章 26 篇)
  - 00-overview · 产品定位 / 术语表
  - 01-getting-started · 环境准备 / 本地启动 / 服务器现状
  - 02-architecture · 架构总览 / 技术栈 / 目录规范
  - 03-backend · 模块 / API 规范 / 数据库 / 认证 / 日志 / 安全 / 配置
  - 04-frontend · 小程序 / APP / H5
  - 05-debugging · 调试接口 / Postman / FAQ
  - 06-deployment · CI/CD / 发版 / 监控
  - 07-contribution · 协作流程 / 代码规范
- GitHub 模板(PR / Issue × 3)+ Actions 工作流(CI / Deploy Backend)
- 客户端 / 后端 子项目 README 占位

### Changed
- 原型(`docs/prototype/index.html`)首页重做:沉浸式 Hero / 三大主张 / 拼猪 / 4 步流程
- 养殖周期统一 9-10 个月 → **10-12 个月 / 约一年的年猪**
- 配色由冷绿改为中国年色(暗红 / 暖黄 / 米白 / 土褐)

### Infrastructure
- 域名 `www.rockingwei.online` + Let's Encrypt HTTPS + 80→443 跳转配置
- nginx 站点配置 `/etc/nginx/sites-enabled/rockingwei.online`(根 → 原型,`/api/` → :3000,`/ws/` → WebSocket)

## [0.1.0] - 2026-05-09

### Added
- 初始化项目结构(`backend/` / `frontend/` / `docs/`)
- 静态 HTML 原型(三端整合)
- 服务器基础设施就绪(Node20 / MySQL8 / Redis7 / nginx / PM2)

---

## 版本号规则

- **MAJOR**:不向下兼容的变更(API 大改 / DB 大改)
- **MINOR**:新功能,向下兼容
- **PATCH**:bug 修复 / 文档

[Unreleased]: https://github.com/W3217-SUDO/PIG-web/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/W3217-SUDO/PIG-web/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/W3217-SUDO/PIG-web/releases/tag/v0.1.0
