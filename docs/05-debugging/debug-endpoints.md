# 调试接口

> 后端内置一组**仅在 development / staging 环境可用**的调试接口,生产环境通过 `@DevOnly` 守卫自动关闭。

---

## 一、为什么需要调试接口

- 模拟微信支付回调(本地没有真实支付)
- 快速创建测试用户 / 猪只 / 订单
- 触发定时任务(不等到点)
- 看 Redis / 数据库的某个 key

> 这些接口写在 `src/modules/debug/`,**生产环境永久 404**(代码中检查 `NODE_ENV`)。

---

## 二、统一前缀

```
/api/debug/*
```

所有调试接口加 `@DevOnly()` 装饰器:

```ts
@Controller('debug')
@DevOnly()
export class DebugController {
  // ...
}
```

`DevOnly` 实现:
```ts
@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(): boolean {
    return process.env.NODE_ENV !== 'production';
  }
}
```

---

## 三、调试接口清单

### 1. 健康检查

```http
GET /api/health
```

响应:
```json
{
  "code": 0,
  "data": {
    "status": "ok",
    "uptime_seconds": 12345,
    "db": "ok",
    "redis": "ok",
    "version": "0.1.0",
    "commit": "70021ef"
  }
}
```

✅ 生产也开放(走轻量负载均衡 / 监控)

### 2. 看版本 / 路由清单

```http
GET /api/debug/routes
```

返回所有注册的路由清单,便于排查"为什么这个 URL 404"。

### 3. 创建测试用户

```http
POST /api/debug/seed/user
{
  "nickname": "调试用户A",
  "phone": "13800138001",
  "role": "customer"
}
```

直接绕过微信登录,返回完整用户 + token。

### 4. 模拟微信支付成功回调

```http
POST /api/debug/wx-pay/notify
{
  "out_trade_no": "ord_01HXXX..."
}
```

绕过真实微信支付,直接把订单标记为已支付。

### 5. 触发定时任务

```http
POST /api/debug/cron/daily-charge      # 立即跑日扣代养费
POST /api/debug/cron/mature-check      # 立即检查出栏
POST /api/debug/cron/clear-soft-deleted # 立即清软删
```

### 6. 修改当前时间(MockClock)

某些功能依赖时间(腊月倒计时、定时任务),需要"快进"测试:

```http
POST /api/debug/clock/set
{
  "timestamp": "2026-12-23T00:00:00Z"
}

POST /api/debug/clock/reset
```

实现:Service 里所有 `new Date()` 改用 `clockService.now()`。

### 7. 看 Redis 内容

```http
GET /api/debug/redis/key/:key
DELETE /api/debug/redis/key/:key
GET /api/debug/redis/keys?pattern=share:*
```

### 8. 看 / 改钱包余额

```http
POST /api/debug/wallet/topup
{
  "user_id": "usr_xxx",
  "amount": 10000
}
```

跳过支付,直接给余额。

### 9. 直接修改订单状态

```http
POST /api/debug/order/:id/set-status
{
  "status": "mature"
}
```

让订单立即跳到出栏状态,方便测出栏流程。

### 10. 强制错误

```http
POST /api/debug/throw/500
POST /api/debug/throw/timeout
POST /api/debug/throw/oom
```

测前端错误处理 + Sentry 接入。

### 11. 灌数据

```http
POST /api/debug/seed/all
{
  "users": 10,
  "farmers": 3,
  "pigs": 20,
  "orders": 5
}
```

一键造数据集。

### 12. 清空所有(危险!)

```http
DELETE /api/debug/db/truncate-all
```

** 只在 NODE_ENV=development 工作,且需要 `?confirm=true&danger=I_KNOW`**。

---

## 四、调试 SQL

`/api/debug/sql` 接口允许执行只读 SQL:

```http
POST /api/debug/sql
{
  "query": "SELECT id, breed, status FROM pigs WHERE status = 'available' LIMIT 10"
}
```

限制:
- 只允许 SELECT
- 解析 AST 拒绝任何写操作
- 最多返回 1000 行
- 慢 SQL > 3s 直接 abort

---

## 五、前端 mock 切换

前端在开发期通过环境变量切换 mock / 真实:

```env
# env/.env.development
VITE_USE_MOCK=true
```

```ts
// src/api/request.ts
if (import.meta.env.VITE_USE_MOCK === 'true') {
  return mockHandler(opts);
}
```

mock 数据放在 `src/api/mocks/`。

---

## 六、Postman / Apifox 集合

详见 [`postman-collection.md`](./postman-collection.md)

---

## 七、Swagger / OpenAPI

`NODE_ENV !== production` 时自动开 Swagger UI:

```
http://127.0.0.1:3000/api/docs
```

包含所有接口(含 `/api/debug/*`)的完整文档,可在线 try。

生产环境关闭(代码内判断 + nginx 加 location 拒绝)。

---

## 八、安全说明

### 调试接口的安全边界

- ✅ 只在 `NODE_ENV !== 'production'` 启用
- ✅ 测试服务器 staging 也启用(便于联调),但需要 `X-Debug-Token` 头(配置在 `.env.staging`)
- ❌ 生产环境**永久 404**,nginx 兜底再拦一层:
  ```nginx
  location /api/debug/ {
    return 404;
  }
  ```
- ❌ 不允许在生产部署的代码里出现 `@DevOnly` 的真实业务逻辑

### 误开放的危险

如果生产意外开放调试接口:
- 用户能任意改钱包
- 任意改订单状态
- 看到所有用户数据
- 拒绝服务(`/throw/oom`)

所以 **nginx 层 + 应用层 双重拦截**。

---

## 九、本地常用调试 case

### Case 1:测试"下单 → 支付 → 出栏"全流程

```bash
# 1. 创建测试用户 + 充值
curl -X POST http://127.0.0.1:3000/api/debug/seed/user \
  -H 'Content-Type: application/json' \
  -d '{"nickname":"测试A","phone":"13800138001"}'
# 返回 access_token

# 2. 用返回的 token 下单
TOKEN=...
curl -X POST http://127.0.0.1:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pig_id":"pig_xxx","breed":"blackpig",...}'
# 返回 order.id

# 3. 模拟支付成功
ORDER_ID=...
curl -X POST http://127.0.0.1:3000/api/debug/wx-pay/notify \
  -d "{\"out_trade_no\":\"$ORDER_ID\"}"

# 4. 时间快进到 1 年后
curl -X POST http://127.0.0.1:3000/api/debug/clock/set \
  -d '{"timestamp":"2027-04-01T00:00:00Z"}'

# 5. 触发出栏检查
curl -X POST http://127.0.0.1:3000/api/debug/cron/mature-check
```

### Case 2:测试拼猪

```bash
# 1. 主认领人下单(同上)
# 2. 开启拼猪
curl -X POST http://127.0.0.1:3000/api/orders/$ORDER_ID/share \
  -H "Authorization: Bearer $TOKEN_A"
# 返回 share_code

# 3. 创建用户 B
curl -X POST http://127.0.0.1:3000/api/debug/seed/user -d '{"nickname":"测试B"}'
TOKEN_B=...

# 4. B 加入拼猪
curl -X POST "http://127.0.0.1:3000/api/share/$SHARE_CODE/join" \
  -H "Authorization: Bearer $TOKEN_B"

# 5. 看成员列表
curl "http://127.0.0.1:3000/api/share/$SHARE_CODE/members" \
  -H "Authorization: Bearer $TOKEN_A"
```

---

## 十、调试日志

开发期日志级别默认 `debug`,会打出:
- 入参出参完整 JSON(已脱敏)
- SQL 语句
- Redis 命令

如果还嫌不够:
```env
LOG_LEVEL=trace
```

或者临时:
```bash
LOG_LEVEL=trace npm run start:dev
```
