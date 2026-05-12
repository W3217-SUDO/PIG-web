# 📡 后端 API 实现状态(当前快照)

> 这是**实际已实现并跑通**的 API 清单。
> 设计层规范见 [`api-spec.md`](./api-spec.md)。
> 与 [`api-spec.md`](./api-spec.md) 不一致时,**以本文为准**(代码就是真相)。
>
> 最后更新:2026-05-12(W1 切片 S1-S6 全部端到端 commit)

---

## 0. 通用约定

- 所有响应包装为 `{ code: 0, message: 'ok', data: ... }`(`code !== 0` = 错误)
- 鉴权:`Authorization: Bearer <access_token>`(JWT)
- `@Public` 标记的接口**不需要** token
- 401(未登录 / token 失效)前端自动跳登录页
- 所有时间戳为 ISO 8601(`2026-05-12T05:11:14.905Z`)
- 所有 ID 为 ULID(26 字符,可排序的唯一 ID)

---

## 1. auth · 认证(`/api/auth`)

| 方法 | 路径 | 鉴权 | 用途 | 状态 |
|---|---|---|---|---|
| POST | `/auth/wx-login` | @Public | 小程序登录(需要 code + AppSecret) | 🟡 占位 AppSecret,链路通但拿不到真 openid |
| POST | `/auth/dev-login` | @Public | 开发旁路(NODE_ENV!=production) | ✅ 完整 |
| GET | `/auth/me` | JWT | 当前用户 token 验证 | ✅ 完整 |

源码:[`backend/src/modules/auth/auth.controller.ts`](../../backend/src/modules/auth/auth.controller.ts)

## 2. user · 用户(`/api/users`)

| 方法 | 路径 | 鉴权 | 用途 |
|---|---|---|---|
| GET | `/users/me` | JWT | 当前用户完整资料(含 phone) |
| PATCH | `/users/me` | JWT | 更新昵称 / 头像 / 手机 |

[`user.controller.ts`](../../backend/src/modules/user/user.controller.ts)

## 3. address · 地址(`/api/users/me/addresses`)

| 方法 | 路径 | 鉴权 |
|---|---|---|
| GET | `/users/me/addresses` | JWT |
| POST | `/users/me/addresses` | JWT |
| PATCH | `/users/me/addresses/:id` | JWT |
| DELETE | `/users/me/addresses/:id` | JWT |

规则:每用户最多 1 个 `is_default`,删除默认会自动提下一条。
[`address.controller.ts`](../../backend/src/modules/address/address.controller.ts)

## 4. pig · 猪(`/api/pigs`)

| 方法 | 路径 | 鉴权 | 备注 |
|---|---|---|---|
| GET | `/pigs?page=&pageSize=&region=` | @Public | 默认 status=listed,sold_out 不返回 |
| GET | `/pigs/:id` | @Public | 含农户全字段 + mock_video_url |
| GET | `/pigs/:id/timeline` | @Public | 喂养 + 健康聚合,按时间倒序 |

[`pig.controller.ts`](../../backend/src/modules/pig/pig.controller.ts)

## 5. order · 订单(`/api/orders`)

| 方法 | 路径 | 鉴权 |
|---|---|---|
| POST | `/orders` | JWT |
| GET | `/orders/me?page=&status=` | JWT |
| GET | `/orders/:id` | JWT |
| POST | `/orders/:id/cancel` | JWT |
| POST | `/orders/:id/mock-paid` | JWT(仅 dev) |

状态机:`pending → paid` / `pending → cancelled`。
mockPay 是事务:order=paid + pig.sold_shares+= + 落 order_payment + 触发 message。
[`order.controller.ts`](../../backend/src/modules/order/order.controller.ts)

## 6. wallet · 钱包(`/api/wallet`)

| 方法 | 路径 | 鉴权 |
|---|---|---|
| GET | `/wallet/me` | JWT |
| GET | `/wallet/transactions?page=&direction=` | JWT |
| POST | `/wallet/topup` | JWT |

`topup` v1 是 mock 直接到账(`type=topup, direction=in`),v1.5 接微信支付。
[`wallet.controller.ts`](../../backend/src/modules/wallet/wallet.controller.ts)

## 7. share · 拼猪邀请(`/api/orders/:orderId/share` + `/api/share/:code`)

| 方法 | 路径 | 鉴权 | 备注 |
|---|---|---|---|
| POST | `/orders/:orderId/share` | JWT | 主认领人生成 8 位短码(30 天 TTL,同订单复用未过期 code) |
| GET | `/share/:code` | @Public | 受邀人公开查看(host 昵称 + 简版订单 + 猪) |

[`share.controller.ts`](../../backend/src/modules/share/share.controller.ts)

## 8. message · 消息(`/api/messages`)

| 方法 | 路径 | 鉴权 |
|---|---|---|
| GET | `/messages?page=&unread=true` | JWT |
| PATCH | `/messages/:id/read` | JWT |
| POST | `/messages/read-all` | JWT |

OrderService.mockPay 成功后自动触发 `🎉 认领成功:xxx` 消息(失败仅 log,不抛)。
[`message.controller.ts`](../../backend/src/modules/message/message.controller.ts)

## 9. health · 系统健康(`/api/health`)

| 方法 | 路径 | 鉴权 | 返回 |
|---|---|---|---|
| GET | `/health` | @Public | `{db, redis, env, uptime_seconds, version}` |

不是业务"健康档案",是系统探活。
[`health.controller.ts`](../../backend/src/modules/health/health.controller.ts)

---

## 已声明但**未实现**(v1.5 / v2)

按 [`api-spec.md`](./api-spec.md) 设计但 v1 未实现的接口:
- `/auth/sms/send` `/auth/sms-login` `/auth/refresh` `/auth/logout` `/auth/wx-app-login`
- `/farmers` 列表 / `/farmers/me/dashboard` / `/farmers/me/earnings`
- `/feeding/checkin`(写) / `/feeding/farmer/me/today`
- `/health/record`(写)
- `/insurance/*` 全部
- `/live/:pigId/viewers` / `/playbacks`
- `/pay/wx-prepay` / `/pay/wx-notify`(W2)
- `/share/:code/join` / `/share/:code/members` / `/leave` / `/kick`
- `/upload/image` / `/upload/video`(v1.5)
- `/admin/*` 全部

---

## 🛠 调试

- Swagger UI(dev only):[http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- curl 一条龙(从登录到下单):见 [`../05-debugging/debug-endpoints.md`](../05-debugging/debug-endpoints.md)

## 链接

- 设计规范 → [`api-spec.md`](./api-spec.md)
- 模块划分 → [`modules.md`](./modules.md)
- 数据库实际表 → [`db-status.md`](./db-status.md)
