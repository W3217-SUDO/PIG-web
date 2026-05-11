# REST API 规范

> **所有后端接口必须遵守本规范。** 任何破坏规范的接口都会在 PR review 被打回。

---

## 一、基础约定

### URL

- 全部以 `/api/` 开头(由 nginx 反代)
- 资源用**复数**:`/api/orders` 而不是 `/api/order`
- 嵌套不超过 2 层:✅ `/api/orders/:id/share`,❌ `/api/users/:uid/orders/:oid/share/:sid`
- 查询参数用 **kebab-case** 或 **snake_case**(选 snake_case,与字段一致)
- 路径参数用 `:id` 形式

### HTTP 动词语义

| 动词 | 用途 | 幂等 |
|---|---|---|
| GET | 读取 | ✅ |
| POST | 创建 / 触发动作 | ❌ |
| PATCH | 部分更新 | ❌(语义上幂等,实际看实现) |
| PUT | 整体替换(项目内**避免使用**,用 PATCH 替代) | ✅ |
| DELETE | 删除 | ✅ |

### 状态码

| 码 | 用途 |
|---|---|
| 200 | 成功(GET / PATCH / DELETE) |
| 201 | 创建成功(POST) |
| 204 | 成功无返回体(很少用) |
| 400 | 请求参数错误 |
| 401 | 未登录 / token 失效 |
| 403 | 已登录但权限不足 |
| 404 | 资源不存在 |
| 409 | 状态冲突(如订单已支付,不能再支付) |
| 422 | 业务校验失败(如余额不足) |
| 429 | 限流触发 |
| 500 | 服务器内部错误 |
| 502/503 | 上游 / 依赖故障 |

---

## 二、响应格式(所有接口统一)

### 成功

```json
{
  "code": 0,
  "data": { ... },
  "message": "ok"
}
```

- `code`: 业务码,**0 表示成功**(非 HTTP 状态码,业务校验失败时 HTTP 仍 200 但 code 非 0)
- `data`: 具体业务数据,可以是对象 / 数组 / null
- `message`: 人类可读消息,前端默认显示

### 错误

```json
{
  "code": 40101,
  "data": null,
  "message": "微信登录失败,请重试",
  "error": {
    "type": "WxLoginFailed",
    "trace_id": "abc123def"
  }
}
```

- `code`: 业务错误码(见下文)
- `error.type`: 程序可读类型(用于客户端 switch)
- `error.trace_id`: 链路追踪 ID,用于查日志

### 分页

```json
{
  "code": 0,
  "data": {
    "items": [...],
    "page": 1,
    "page_size": 20,
    "total": 156,
    "has_next": true
  },
  "message": "ok"
}
```

请求时:`GET /api/pigs?page=1&page_size=20`

---

## 三、业务错误码(`code`)

### 规则
- 5 位数字
- 第 1-2 位:模块(10=auth, 20=user, 30=order, 40=share …)
- 第 3-5 位:具体错误

### 已分配

| 码 | 含义 |
|---|---|
| 0 | 成功 |
| ── auth(10xxx) ── | |
| 10001 | 缺少 token |
| 10002 | token 无效 / 过期 |
| 10003 | token 解析失败 |
| 10101 | 微信 code 无效 |
| 10102 | 微信 code 已使用 |
| 10201 | 短信验证码错误 |
| 10202 | 短信验证码过期 |
| 10203 | 短信发送过于频繁 |
| ── user(20xxx) ── | |
| 20001 | 用户不存在 |
| 20101 | 实名认证失败 |
| ── pig(25xxx) ── | |
| 25001 | 猪只不存在 |
| 25002 | 猪只已被认领 |
| 25003 | 猪只状态不允许此操作 |
| ── order(30xxx) ── | |
| 30001 | 订单不存在 |
| 30002 | 订单已支付 |
| 30003 | 订单状态不允许此操作 |
| 30101 | 钱包余额不足 |
| 30201 | 支付失败 |
| 30202 | 支付回调签名错误 |
| ── share(40xxx) ── | |
| 40001 | 分享码不存在 / 已失效 |
| 40002 | 分享码已满员 |
| 40003 | 已加入此拼猪,不能重复加入 |
| 40004 | 你不是主认领人,不能开启拼猪 |
| 40005 | 不能踢出自己 |
| ── farmer(50xxx) ── | |
| ── feeding(60xxx) ── | |
| ── health(65xxx) ── | |
| ── wallet(70xxx) ── | |
| 70001 | 充值金额超限 |
| ── upload(80xxx) ── | |
| 80001 | 文件类型不允许 |
| 80002 | 文件超出大小限制 |
| ── 通用(90xxx) ── | |
| 90001 | 参数校验失败(具体在 message) |
| 90002 | 操作过于频繁 |
| 90099 | 服务器内部错误 |

新增错误码时,**更新本表 + 在 PR 中提**。

---

## 四、字段命名

### JSON 字段

**统一用 `snake_case`**(与后端 TypeORM 字段保持一致):

```json
{
  "id": "ord_01H...",
  "user_id": "usr_01H...",
  "pig_id": "pig_01H...",
  "created_at": "2026-05-11T07:30:00Z",
  "updated_at": "2026-05-11T07:30:00Z",
  "status": "active"
}
```

> 前端通过 axios interceptor 统一转 camelCase,详见 [`../04-frontend/miniapp.md`](../04-frontend/miniapp.md)

### 时间

- 一律 **ISO 8601 + UTC 时区**(`Z` 结尾)
- 前端按需本地化展示
- 日期类型字段统一 `_at` 后缀(`created_at`, `paid_at`, `mature_at`)

### ID

- 用 **ULID** 不用自增 ID(分布式友好 + 时序可排序)
- 前缀标识资源类型:`usr_`, `ord_`, `pig_`, `share_`, `frm_`

### 金额

- 统一 **元**(单位:CNY),浮点数(小数 2 位)
- ❌ 不用分 / 不用 BigInt(便于前端展示)
- 支付时与第三方对接转分(在 service 层封装)

### 枚举

- 全小写 + 下划线,见 [`../00-overview/glossary.md`](../00-overview/glossary.md)
- ❌ 不用数字状态(0/1/2 没人懂)

---

## 五、鉴权

### Header

所有需要登录的接口:

```http
GET /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 公开接口(不需登录)

代码加 `@Public()` 装饰器:
```ts
@Public()
@Post('wx-login')
async wxLogin(...) {}
```

详见 → [`auth.md`](./auth.md)

---

## 六、分页 / 排序 / 过滤

### 分页

```
GET /api/pigs?page=1&page_size=20
```

- 默认 `page=1, page_size=20`
- `page_size` 最大 100
- 超过返回 400

### 排序

```
GET /api/pigs?sort=-created_at,price
```

- `-` 前缀表示降序
- 多个用逗号
- 字段必须在允许列表(防 SQL 注入)

### 过滤

```
GET /api/pigs?breed=blackpig&farmer_id=frm_xxx&min_weight=140
```

- 简单等于:`?status=active`
- 范围:`min_xxx` / `max_xxx`
- 多值:`?status=active,mature`(用逗号 IN)

---

## 七、幂等性

### 创建类接口(POST)

必须支持幂等键(防止重复提交):

```http
POST /api/orders
Idempotency-Key: req_01H8XYZ...
```

后端:
- 第一次:正常创建,缓存 24h
- 第二次同 key:返回首次结果,不重复创建

### 支付回调

微信支付回调天然不幂等(可能重复推送),后端必须按 `out_trade_no` 去重。

---

## 八、限流

### 默认规则(每 IP)

| 接口类型 | QPS |
|---|---|
| 公开读 | 60 |
| 登录后读 | 120 |
| 写操作 | 30 |
| 短信发送 | 1/分钟,5/天 |
| 微信登录 | 10/分钟 |

详见 → [`security.md#限流`](./security.md)

---

## 九、版本演进

### 不向下兼容的变更

- **绝对禁止**直接改字段含义或删字段
- 走两步:
  1. 新增 `field_v2`,前端先升级用 v2
  2. 老字段下线时发公告 + 留 30 天兼容期
- 大版本必要时 `/api/v2/...`(目前**不要**预留 v2 路径,YAGNI)

---

## 十、示例:一个完整接口长这样

### 后端代码

```ts
// modules/order/order.controller.ts
@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: '创建认领订单' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateOrderDto,
    @Headers('Idempotency-Key') idemKey?: string,
  ) {
    return this.orderService.create(user.id, dto, idemKey);
  }
}
```

### 请求

```http
POST /api/orders HTTP/1.1
Authorization: Bearer eyJ...
Content-Type: application/json
Idempotency-Key: req_01H8XYZ

{
  "pig_id": "pig_01H...",
  "breed": "blackpig",
  "farmer_id": "frm_01H...",
  "insurance_plan": "full",
  "wallet_topup": 500
}
```

### 响应

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "code": 0,
  "message": "ok",
  "data": {
    "order": {
      "id": "ord_01H...",
      "user_id": "usr_01H...",
      "pig_id": "pig_01H...",
      "status": "pending_payment",
      "total_amount": 800,
      "created_at": "2026-05-11T07:30:00Z"
    },
    "wx_prepay": {
      "appId": "wx_xxx",
      "timeStamp": "1620000000",
      "nonceStr": "xyz",
      "package": "prepay_id=xxx",
      "signType": "RSA",
      "paySign": "xxxxx"
    }
  }
}
```

### 错误响应示例

```http
HTTP/1.1 422 Unprocessable Entity

{
  "code": 30101,
  "message": "钱包余额不足,请充值后再下单",
  "data": null,
  "error": {
    "type": "InsufficientBalance",
    "trace_id": "abc123",
    "current_balance": 100,
    "required": 500
  }
}
```
