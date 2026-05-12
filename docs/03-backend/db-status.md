# 💾 数据库当前实际 schema(快照)

> 实际**已建表 + 跑过 migration** 的清单。
> 设计规范见 [`database.md`](./database.md)。冲突时**以本文为准**(代码就是真相)。
>
> 最后更新:2026-05-12(W1 切片 S1-S6 全部 migration 化)

---

## 0. 全表清单(13 张)

| 表 | 来源 migration | entity 文件 | 用途 |
|---|---|---|---|
| user | InitialSchema | [`user.entity.ts`](../../backend/src/modules/user/user.entity.ts) | 用户(openid 唯一) |
| wallet | InitialSchema | [`wallet.entity.ts`](../../backend/src/modules/wallet/wallet.entity.ts) | 钱包(user_id 唯一) |
| order | InitialSchema | [`order.entity.ts`](../../backend/src/modules/order/order.entity.ts) | 订单(状态机) |
| pig | InitialSchema | [`pig.entity.ts`](../../backend/src/modules/pig/pig.entity.ts) | 猪只 |
| share | InitialSchema | [`share.entity.ts`](../../backend/src/modules/share/share.entity.ts) | (v1 闲置,设计为持仓记录,v1.5 用) |
| **farmer** | **S1Pig** | [`farmer.entity.ts`](../../backend/src/modules/farmer/farmer.entity.ts) | 农户档案 |
| _pig 字段扩展_ | S1Pig | — | 加 farmer_id / region / expected_weight_kg / mock_video_url |
| **feeding_record** | **S2Detail** | [`feeding-record.entity.ts`](../../backend/src/modules/feeding/feeding-record.entity.ts) | 喂养打卡 |
| **health_record** | **S2Detail** | [`health-record.entity.ts`](../../backend/src/modules/health/health-record.entity.ts) | 健康档案 |
| **address** | **S3Address** | [`address.entity.ts`](../../backend/src/modules/address/address.entity.ts) | 收货地址 |
| **order_payment** | **S4Order** | [`order-payment.entity.ts`](../../backend/src/modules/order/order-payment.entity.ts) | 支付流水(幂等) |
| **wallet_transaction** | **S4Order** | [`wallet-transaction.entity.ts`](../../backend/src/modules/wallet/wallet-transaction.entity.ts) | 钱包流水 |
| **share_invite** | **S5Share** | [`share-invite.entity.ts`](../../backend/src/modules/share/share-invite.entity.ts) | 拼猪邀请短链 |
| **message** | **S6Message** | [`message.entity.ts`](../../backend/src/modules/message/message.entity.ts) | 站内消息 |

加粗 = W1 新建。共 **13 张业务表 + 1 张 migrations 表**。

---

## 1. 通用约定(全部表)

- **主键**:`id CHAR(26)` ULID(可排序的全局唯一 ID,在 `BaseEntity.@BeforeInsert` 自动填)
- **时间戳**:`created_at` / `updated_at` `DATETIME(6)` 自动维护
- **引擎**:全 InnoDB
- **字符集**:utf8mb4 / utf8mb4_unicode_ci
- **时区**:`Asia/Shanghai`(`+08:00`),`docker-compose.yml` 强制

---

## 2. 关键索引

| 表 | 索引 | 用途 |
|---|---|---|
| `user` | UNIQUE(`openid`) | 微信登录 |
| `wallet` | UNIQUE(`user_id`) | 一对一 |
| `order` | (`user_id`)(`pig_id`)(`status`) | 列表 / 状态筛选 |
| `pig` | (`status`)(`merchant_id`)(`farmer_id`)(`region`) | 列表筛选 |
| `feeding_record` | (`pig_id`, `checked_at`) | 时间线 |
| `health_record` | (`pig_id`, `recorded_at`) | 时间线 |
| `order_payment` | UNIQUE(`transaction_id`)(`order_id`)(`status`) | 微信支付幂等 |
| `wallet_transaction` | (`wallet_id`, `created_at`)(`user_id`) | 流水分页 |
| `share_invite` | UNIQUE(`code`)(`order_id`)(`user_id`) | 短码查 |
| `message` | (`user_id`, `is_read`, `created_at`) | 列表+未读筛选 |
| `address` | (`user_id`, `is_default`) | 默认地址查 |

---

## 3. 状态机

### 3.1 order.status

```
pending ──支付成功──> paid
   │                    │
   │取消              退款
   ▼                    ▼
cancelled            refunded
```

### 3.2 pig.status

```
draft ── 上架 ──> listed ── 卖完 ──> sold_out ── 出栏 ──> closed
```

v1 实际用到的:`listed` / `sold_out`。其它状态字段在,但流程未触达。

### 3.3 order_payment.status

```
pending → success / failed / closed
```

通过 `transaction_id` UNIQUE 索引保证微信支付回调幂等。

---

## 4. 跑迁移

```bash
cd backend

# 看现状
npm run migration:show

# 跑(必须):增量
npm run migration:run

# 回滚最后一条
npm run migration:revert

# 改 entity 后生成新迁移
npm run migration:generate -- db/migrations/<Name>

# (开发期)清空数据 + 重 seed
npm run seed:dev
```

`db/migrations/` 现含 5 个迁移文件,按时间戳顺序执行。

---

## 5. seed 数据(开发期)

`backend/src/database/seeds/dev.seed.ts` 一次填:

- 2 农户(老李 · 广元 / 老王 · 绵阳)
- 5 头猪(4 listed + 1 sold_out,Unsplash 真实图)
- 25 条喂养记录(每只猪 5 条,过去 3 天循环)
- 15 条健康记录(每只猪 3 条:体检/疫苗/称重)

每次 `seed:dev` 会 truncate 这 4 张表(不动 user / wallet / order)。

---

## 6. 重要数据约束(应用层)

数据库**没有强 FK**(为了灵活),业务层在 Service 里强制:

- `order.user_id` 必须存在(由 JWT guard 保证)
- `order.pig_id` 必须 `pig.status = listed` 才能下单
- `wallet.balance` 必须 ≥ 0(`debit` 抛错)
- `pig.sold_shares` 必须 ≤ `total_shares`(`mockPay` 事务校验)
- `address.is_default` 同 user_id 下最多 1 条(`AddressService` 互斥更新)
- `share_invite.code` 全局唯一(碰撞重试 5 次)

---

## 7. 不应该手动改的事

❌ **不要直接 UPDATE order.status 跳过中间状态**(例如 pending → refunded)——会破坏 pig.sold_shares 一致性。走 SOP §3。

❌ **不要 DELETE order**——破坏 wallet_transaction / message 引用。要"取消"用 `cancel` 状态。

❌ **不要 DELETE 用户**——v1.5 才支持注销;v1 用 `user.status = banned` 软删。

---

## 链接

- 设计规范 → [`database.md`](./database.md)
- 模块划分 → [`modules.md`](./modules.md)
- 当前 API 清单 → [`api-status.md`](./api-status.md)
- 运营 SOP(发猪 / 改单 / 退款)→ [`../06-deployment/admin-sop.md`](../06-deployment/admin-sop.md)
