# 后端模块划分

> 每个模块是一个独立的 NestJS Module,职责单一。本文是模块清单与职责定义。

---

## 模块总览

| 编号 | 模块名 | 路由前缀 | 主要职责 |
|---|---|---|---|
| 01 | **auth** | `/api/auth` | 微信登录 / JWT 签发与刷新 |
| 02 | **user** | `/api/users` | 用户档案 / 实名 / 偏好设置 |
| 03 | **farmer** | `/api/farmers` | 农户档案 / 评分 / 收益 |
| 04 | **pig** | `/api/pigs` | 猪只档案 / 状态机 |
| 05 | **order** | `/api/orders` | 认领订单 / 支付回调 / 钱包扣款 |
| 06 | **share** | `/api/share` | 拼猪 / 分享码 / 成员管理 |
| 07 | **live** | `/api/live` | 直播流地址 / 在线人数 / 回放 |
| 08 | **feeding** | `/api/feeding` | 每餐打卡(农户)+ 列表(用户) |
| 09 | **health** | `/api/health` | 健康档案 / 兽医记录 / 疫苗 |
| 10 | **insurance** | `/api/insurance` | 保险购买 / 理赔触发 |
| 11 | **wallet** | `/api/wallet` | 用户余额 / 流水 / 充值 |
| 12 | **message** | `/api/messages` | 站内通知 / 消息中心 |
| 13 | **upload** | `/api/upload` | 文件上传(头像 / 喂养图) |
| 14 | **admin** | `/api/admin` | 管理后台专用接口(独立鉴权) |
| - | **common** | - | 横切关注点(过滤器 / 拦截器 / 守卫) |
| - | **config** | - | 环境变量加载与校验 |
| - | **database** | - | TypeORM 配置 + 共享实体 |

---

## 01. auth · 认证

### 职责
- 微信小程序登录(`wx.login` → 后端换 openid → 签发 JWT)
- APP 微信登录 / 短信登录
- JWT 签发 / 刷新 / 吊销
- 角色守卫(`@Roles('customer' | 'farmer' | 'admin')`)

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/api/auth/wx-login` | 小程序登录(传 code) |
| POST | `/api/auth/wx-app-login` | APP 微信开放平台登录 |
| POST | `/api/auth/sms/send` | 发短信验证码 |
| POST | `/api/auth/sms-login` | 短信登录 |
| POST | `/api/auth/refresh` | 用 refresh token 换 access token |
| POST | `/api/auth/logout` | 注销 |

详见 → [`auth.md`](./auth.md)

---

## 02. user · 用户

### 职责
- 个人资料 CRUD
- 实名认证(身份证可选)
- 收货地址管理
- 推送 token 注册

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/users/me` | 获取当前用户 |
| PATCH | `/api/users/me` | 更新昵称 / 头像 / 手机 |
| GET | `/api/users/me/addresses` | 收货地址列表 |
| POST | `/api/users/me/addresses` | 新增地址 |
| DELETE | `/api/users/me/addresses/:id` | 删除地址 |

### 实体
- `User`(见 [`database.md#users`](./database.md))
- `Address`

---

## 03. farmer · 农户

### 职责
- 农户档案(姓名 / 地区 / 散养年限 / 头像 / 故事 / 视频)
- 农户评分(用户出栏后评)
- 农户收益统计

### 关键 API(C 端可读)

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/farmers` | 列表(支持区域筛选) |
| GET | `/api/farmers/:id` | 农户详情 |
| GET | `/api/farmers/:id/pigs` | 该农户当前在养的猪 |

### 关键 API(农户端)

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/farmers/me/dashboard` | 工作台数据(托管数 / 今日任务 / 收益) |
| GET | `/api/farmers/me/earnings` | 收益明细 |

---

## 04. pig · 猪只

### 职责
- 猪只档案(品种 / 入栏体重 / 入栏日期 / 农户 / 状态)
- 状态机(`available` / `claimed` / `mature` / `slaughtered` / `dead`)
- 猪只详情聚合(基本档案 + 喂养摘要 + 健康摘要 + 直播)

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/pigs` | 可认领列表(品种/地区/重量过滤) |
| GET | `/api/pigs/:id` | 猪只详情 |
| GET | `/api/pigs/:id/timeline` | 该猪的喂养+健康+直播事件时间线 |
| GET | `/api/my/pigs` | 我认领的猪只列表(含拼猪) |

### 实体
- `Pig`
- `PigTimelineEvent`(虚拟视图,聚合 feeding/health 等)

---

## 05. order · 订单

### 职责
- 认领订单创建(选品种 → 选农户 → 选保险 → 确认)
- 支付下单(微信支付)
- 支付回调处理
- 钱包预扣 / 每日代养费扣款(定时任务)
- 出栏触发屠宰流程

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/api/orders` | 创建订单(返回 prepay 参数) |
| GET | `/api/orders/:id` | 订单详情 |
| GET | `/api/orders/me` | 我的订单列表 |
| POST | `/api/orders/:id/cancel` | 取消订单(出栏前) |
| POST | `/api/orders/:id/mature-action` | 出栏决策(取猪 / 续养 / 卖回平台) |
| POST | `/api/pay/wx-notify` | **微信支付回调**(签名校验严格) |

### 实体
- `Order`
- `OrderPayment`(支付流水)

### 关键状态机

```
pending_payment ──支付成功──> active ──日扣──> active(余额不足报警)
       │                          │
       │                          └──达到出栏──> mature
       │                                          │
   取消/超时                              用户决策──> slaughtering
       │                                          │
       ▼                                          ▼
   cancelled                                    shipping
                                                  │
                                                  ▼
                                              delivered
```

---

## 06. share · 拼猪

### 职责
- 主认领人生成拼猪邀请(生成 share_code 短码 + URL)
- 受邀人凭码加入
- 拼猪成员管理(踢出 / 自愿退出)
- 拼猪权限(成员都能看直播、不能操作订单)

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/api/orders/:id/share` | 主认领人开启拼猪 → 生成 code |
| GET | `/api/share/:code` | 校验 code,返回订单概要(未授权也能看简版) |
| POST | `/api/share/:code/join` | 当前用户凭码加入 |
| GET | `/api/share/:code/members` | 成员列表(已加入) |
| POST | `/api/share/:code/leave` | 自愿退出 |
| POST | `/api/share/:code/kick` | 主认领人踢人 |

### 实体
- `Share`(对应订单的拼猪聚合)
- `ShareMember`(每个加入者)

### 业务规则
- 一个订单最多 1 个 share 记录
- 一个 share 最多 3 个 member(包含主认领人)
- share_code TTL 30 天
- 主认领人退出 ≠ 解散(由主认领人主动 `dismiss`)
- **平台不记账 / 不分钱 / 不分肉**(产品 hard rule)

详见 → [`../00-overview/product.md#四-拼猪-模式升级`](../00-overview/product.md)

---

## 07. live · 直播

### 职责
- 提供 RTMP 推流地址(给农户摄像头)
- 提供 FLV / HLS 播放地址(给用户)
- 实时在线人数
- 回放生成(每天定时切片)

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/live/:pigId/stream` | 获取播放地址(带防盗链签名) |
| GET | `/api/live/:pigId/viewers` | 在线人数 |
| GET | `/api/live/:pigId/playbacks` | 回放列表 |

### MVP 简化
- **Q2 阶段**:用模拟视频(预录),不接真实直播
- **Q3 阶段**:接腾讯云直播 或 七牛

---

## 08. feeding · 喂养

### 职责
- 农户每餐(早/中/晚)打卡上传图片
- 用户查看猪只喂养历史
- 异常告警(超过 X 小时未打卡)

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/api/feeding/checkin` | 农户打卡(上传图 + 食材) |
| GET | `/api/feeding/pig/:pigId` | 该猪的喂养记录(分页) |
| GET | `/api/feeding/farmer/me/today` | 农户今日任务清单 |

### 实体
- `FeedingRecord`

---

## 09. health · 健康

### 职责
- 体检记录
- 兽医上门记录
- 疫苗记录
- 异常事件(生病 / 受伤)

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/api/health/record` | 创建健康记录(农户或兽医) |
| GET | `/api/health/pig/:pigId` | 该猪的健康档案 |

### 实体
- `HealthRecord`

---

## 10. insurance · 保险

### 职责
- 保险产品配置(基础版 / 全面版)
- 用户购买
- 理赔触发(`pig.status = dead`)

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/insurance/products` | 保险产品列表 |
| POST | `/api/insurance/claim/:orderId` | 触发理赔 |

---

## 11. wallet · 钱包

### 职责
- 用户余额管理
- 充值 / 扣款流水
- 自动扣代养费(每日定时任务)
- 余额不足提醒

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/wallet/me` | 当前余额 + 最近 10 条流水 |
| POST | `/api/wallet/topup` | 充值(走微信支付) |
| GET | `/api/wallet/transactions` | 流水分页 |

### 实体
- `Wallet`(每个用户一条)
- `WalletTransaction`(每笔变动)

---

## 12. message · 消息

### 职责
- 站内消息中心
- 推送(微信模板消息 / APP 推送)
- 已读 / 未读

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/messages` | 消息列表 |
| PATCH | `/api/messages/:id/read` | 标记已读 |
| POST | `/api/messages/read-all` | 全部已读 |

---

## 13. upload · 文件上传

### 职责
- 接收图片 / 视频上传
- 短期写本地 `uploads/`,长期写腾讯云 COS
- 返回可访问 URL

### 关键 API

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/api/upload/image` | 上传图片(最大 5MB) |
| POST | `/api/upload/video` | 上传视频(最大 50MB) |
| GET | `/api/upload/cos-token` | 获取 COS 直传 token(后续用) |

---

## 14. admin · 管理后台

### 职责
- 管理后台所有接口都在这里,与 C 端隔离
- 独立鉴权(用户名密码 + 2FA,非微信)
- 高危操作必须留审计日志

### 关键 API

略,见管理后台开发时补充。

**重要**:**任何 admin 接口必须加 `@Roles('admin')` 守卫**——这是审计与权限分离的底线。

---

## 模块开发顺序(MVP)

```
P0(必须):  auth → user → pig → order → wallet
P1(关键):  share → farmer → feeding → message
P2(完整):  health → insurance → live → upload
P3(后续):  admin
```

P0 + P1 完成 = MVP 可上线。P2 跟进迭代。
