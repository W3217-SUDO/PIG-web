# 🎯 MVP 范围矩阵(v1.0.0 · 2026-05-31 上线版)

> 上一篇 → [`product.md`](./product.md) 讲产品**为什么做**
> 本篇讲产品 **v1 做到哪里、不做到哪里、为什么这么砍**

每个模块都有清晰的「v1 / v1.5 / v2 / 砍」边界,以及**用户视角**的能/不能。

---

## 0. 一句话原则

> **能让一个完全陌生的用户「进 → 看 → 买 → 等」走完闭环,就是 MVP 必须的。**
> 一切其他都可以推迟。

---

## 1. 用户故事覆盖率

### v1 必交付的故事

| ID | 用户故事 | v1 范围 |
|---|---|---|
| U-01 | 作为新用户,我用微信小程序登录 | ✅ 完整 |
| U-02 | 我能填昵称 / 头像 / 收货地址 | ✅ 完整 |
| U-03 | 我能浏览所有可认领的猪(列表 + 筛选地区/品种) | ✅ 列表 + 详情;筛选只做地区 |
| U-04 | 我能看到某头猪的详情:基本信息 + 农户 + 喂养时间线 + 健康记录 + 直播 | ✅ 全部展示;**喂养/健康/直播是 mock** |
| U-05 | 我能给一头猪下单付款 | ✅ 微信支付 |
| U-06 | 我能看到「我认领的猪」与订单状态 | ✅ |
| U-07 | 我能给一头猪生成分享码邀请家人 | 🟡 仅生成,**家人加入功能 v1.5** |
| U-08 | 我能看到钱包余额 / 充值 | ✅ |
| U-09 | 我能收到订单状态变化通知 | ✅ 站内消息;**微信模板消息 v1.5** |

### v1 砍掉的故事(明确告诉用户:敬请期待)

| ID | 用户故事 | 砍/推 | 原因 |
|---|---|---|---|
| U-10 | 我能加入别人的拼猪组 | v1.5 | share 加入/成员管理状态复杂 |
| U-11 | 我能看真实的 24h 直播 | v2 | 需要 RTMP / CDN / 直播服务备案 |
| U-12 | 我能给农户评分 | v2 | 出栏后才发生,5/31 没人出栏 |
| U-13 | 我能买保险 | v2 | 保险产品没谈下来 |
| U-14 | 我能决定出栏方式(取/续/卖) | v2 | 5/31 没人出栏 |
| U-15 | 农户能上传喂养打卡 | v2 | 农户端独立 APP 流,5/31 农户人数 1-2 名直接微信发 |

---

## 2. 模块详细范围

> 🟢 = v1 必做 / 🟡 = v1 简化版 / 🔴 = v1 砍

### auth 🟢

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| 微信小程序登录(wx-login) | ✅ | | |
| dev-login(开发期旁路) | ✅ | | |
| JWT 签发 + refresh + logout | ✅ | | |
| 角色 `customer` | ✅ | | |
| 角色 `farmer` / `admin` | ✅ DB 字段 + 守卫 | | |
| APP 微信开放平台登录 | | ✅ | |
| 短信登录 | | | ✅ |

**v1 边界**:小程序里点击「微信登录」一键完成,APP 内打开 H5 用临时 dev-login(标"测试通道")。

### user 🟢

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| `GET/PATCH /api/users/me` | ✅ | | |
| 收货地址 CRUD | ✅ | | |
| 实名认证(身份证可选) | ✅ 选填,不强制 | | |
| 推送 token 注册 | | | ✅ |

### pig 🟡

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| `GET /api/pigs` 列表(分页 + 地区筛选) | ✅ | | |
| `GET /api/pigs/:id` 详情 | ✅ | | |
| `GET /api/pigs/:id/timeline` | ✅ 但 feeding/health 是 mock seed | ✅ 真实 | |
| `GET /api/my/pigs` 我的猪 | ✅ | | |
| 状态机完整(claimed/mature/slaughtered/...) | 🟡 仅 `available / claimed` 两态 | | ✅ |
| 品种筛选 | | ✅ | |

**v1 边界**:运营手工 INSERT 5-10 头猪;每头猪默认带 3 条 mock 喂养 + 1 条 mock 健康 + 1 条预录视频 URL。

### order 🟢(P0 核心)

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| `POST /api/orders` 创建订单 → 拉起微信支付 prepay | ✅ | | |
| 订单状态机 `pending_payment / active / cancelled` | ✅ | | |
| 状态机 `mature / slaughtering / shipping / delivered` | | | ✅ |
| `GET /api/orders/me` 我的订单 | ✅ | | |
| `POST /api/orders/:id/cancel` 取消(未支付) | ✅ | | |
| 出栏决策 | | | ✅ |
| 每日代养费扣款(定时任务) | | ✅ | |
| 支付回调幂等 | ✅ | | |

### pay 🟢(P0 核心)

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| 微信小程序支付(JSAPI / openid) | ✅ | | |
| 微信 APP 支付 | | ✅ | |
| 支付回调 `POST /api/pay/wx-notify` 签名校验 + 幂等 | ✅ | | |
| 退款 | | ✅ | |

### wallet 🟢

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| 钱包余额查询 | ✅ | | |
| 充值(走微信支付) | ✅ | | |
| 流水分页 | ✅ | | |
| 每日定时扣代养费 | | ✅ | |
| 余额不足提醒 | | ✅ | |

### share 🟡(产品核心,但 v1 极简)

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| 主认领人 `POST /api/orders/:id/share` 生成 share_code | ✅ | | |
| 受邀人 `GET /api/share/:code` 看订单简版(未登录可看品种 + 农户) | ✅ | | |
| 受邀人 `POST /api/share/:code/join` 加入 | | ✅ | |
| 成员列表 / 踢出 / 退出 | | | ✅ |
| 拼猪权限隔离(成员只能看不能改) | | ✅ | |

**v1 边界**:发分享链接给亲戚,亲戚打开能看到这是哪头猪、主认领人是谁。**不能加入,不能看直播以外的内容**。 营销文案改为:「拼猪 V1:邀请家人一起围观,完整拼猪体验 6 月上线」。

### farmer 🟡

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| `GET /api/farmers/:id` 农户详情 | ✅ | | |
| `GET /api/farmers/:id/pigs` 这个农户的猪 | ✅ | | |
| `GET /api/farmers` 列表 | 🟡 可不暴露,猪详情里直接跳详情 | ✅ | |
| 农户工作台 | | | ✅ |
| 农户评分 | | | ✅ |

**v1 边界**:运营手工 INSERT 1-2 个 demo 农户。

### feeding 🟡

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| `GET /api/feeding/pig/:pigId` 返回 seed mock 数据 | ✅ | | |
| `POST /api/feeding/checkin` 农户打卡 | | | ✅ |

**v1 边界**:每头猪入库时 seed 3-5 条假打卡,猪详情页能看到时间线。文案标注「数据仅为示意,正式喂养记录将在出栏档案中提供」。

### health 🟡

同 feeding。

### live 🟡

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| `GET /api/live/:pigId/stream` 返回预录视频 URL | ✅ | | |
| 真实直播流接入(腾讯云直播) | | | ✅ |

**v1 边界**:每头猪绑 1 个 30-60 秒的演示视频(放 COS / 阿里云 OSS),小程序 video 组件直接播。文案改为「24h 直播 v2 上线」。

### message 🟢

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| 站内消息(订单状态变化 / 支付成功) | ✅ | | |
| 已读 / 未读 | ✅ | | |
| 微信模板消息推送 | | ✅ | |
| APP 推送 | | | ✅ |

### upload 🟢

| 项 | v1 | v1.5 | v2 |
|---|---|---|---|
| 图片上传(头像)→ 本地 `uploads/` + nginx 静态目录 | ✅ | | |
| 视频上传 | | ✅ | |
| 腾讯云 COS 直传 | | ✅ | |

**v1 边界**:服务器 `/opt/pig/shared/uploads/` 挂载到 nginx,直接对外可访问。

### insurance 🔴

整体推 v2。猪详情页的"保险"标签隐藏。

### admin 🔴

v1 完全不做 GUI 后台。运营操作走 Navicat,**必须有 SOP 文档**(W3 写)。

---

## 3. 数据库 schema 范围

`backend/db/migrations/InitialSchema` 已有 5 张表(user/pig/order/share/wallet)。

v1 还需要补:
- [ ] `address`(用户收货地址)
- [ ] `farmer`(农户)
- [ ] `pig` 表加 `farmer_id` 外键 + `mock_video_url` 字段
- [ ] `feeding_record`(seed 用)
- [ ] `health_record`(seed 用)
- [ ] `wallet_transaction`(流水)
- [ ] `order_payment`(支付流水)
- [ ] `message`(站内消息)

**所有新表用一个 migration 合并**: `db/migrations/<ts>-V1Tables.ts`,与已有 InitialSchema 区分。

---

## 4. 接口列表(v1 必须实现)

> 完整规范见 → [`../03-backend/api-spec.md`](../03-backend/api-spec.md)

### 已实现 ✅
- `POST /api/auth/wx-login`(待真实 AppID)
- `POST /api/auth/dev-login`
- `GET /api/auth/me`
- `GET /api/health`

### W1 待实现(20+ 接口)
- `PATCH /api/users/me`
- `GET/POST/DELETE /api/users/me/addresses[/:id]`
- `GET /api/pigs?page=&region=`
- `GET /api/pigs/:id`
- `GET /api/pigs/:id/timeline`
- `GET /api/my/pigs`
- `POST /api/orders`
- `GET /api/orders/me`
- `GET /api/orders/:id`
- `POST /api/orders/:id/cancel`
- `GET /api/wallet/me`
- `GET /api/wallet/transactions?page=`
- `POST /api/wallet/topup`
- `GET /api/farmers/:id`
- `GET /api/feeding/pig/:pigId`
- `GET /api/health/pig/:pigId`
- `GET /api/live/:pigId/stream`
- `POST /api/orders/:id/share`(生成 code)
- `GET /api/share/:code`(简版查看)
- `GET /api/messages`
- `PATCH /api/messages/:id/read`
- `POST /api/upload/image`

### W2 待实现(支付链路)
- `POST /api/pay/wx-prepay`(创建预支付)
- `POST /api/pay/wx-notify`(微信回调)

---

## 5. 前端页面范围(小程序为主)

### v1 必交付页面

| 路径 | 页面 | 复用 H5 |
|---|---|---|
| `/pages/index/index` | 首页(猪列表) | ✅ |
| `/pages/pig/detail` | 猪详情 | ✅ |
| `/pages/order/confirm` | 下单确认页 | ✅ |
| `/pages/order/result` | 支付结果页 | ✅ |
| `/pages/my/index` | 我的(头像/订单/钱包入口) | ✅ |
| `/pages/my/orders` | 我的订单列表 | ✅ |
| `/pages/my/pigs` | 我的猪 | ✅ |
| `/pages/my/wallet` | 钱包(余额 + 流水 + 充值) | ✅ |
| `/pages/my/addresses` | 收货地址管理 | ✅ |
| `/pages/share/landing` | 分享落地页(受邀人看简版) | ✅ |
| `/pages/login/index` | 登录(微信一键 / dev 标"测试通道") | ✅ |

11 个页面 = MVP 完整 UI。

---

## 6. 验收标准(5/31 那天的 checklist)

完成下列 **全部 ✅** 才认为达成 5/31 上线目标:

- [ ] 小程序在微信公众平台显示「已发布」
- [ ] 普通用户用自己的微信扫码进入小程序,**不需要任何额外操作**
- [ ] 能完成:登录 → 浏览猪列表 → 进详情 → 下单 → 支付 ¥0.01 → 回到订单看到「已支付」状态
- [ ] 我的钱包能看到充值流水
- [ ] 分享一头猪给微信好友,好友点链接能看到这头猪的简版信息(不强求登录)
- [ ] 服务器无报错(`/opt/pig/logs/` 最近 1 小时 error 计数 = 0)
- [ ] Sentry 已接,任何 500 自动告警
- [ ] 5 头真实(运营手工录)猪在线可下单
- [ ] iOS TestFlight 内测包,3 名内部用户已安装并跑通登录

**未完成项必须有兜底**(例如分享落地页没好,落地直接跳商品详情)。

---

## 7. 链接

- 产品定位 → [`product.md`](./product.md)
- 总路线图 → [`../ROADMAP.md`](../ROADMAP.md)
- 后端模块详细 → [`../03-backend/modules.md`](../03-backend/modules.md)
- API 规范 → [`../03-backend/api-spec.md`](../03-backend/api-spec.md)
- W1 任务 → [`../AUTO-RUN-2026-05-12.md`](../AUTO-RUN-2026-05-12.md)
