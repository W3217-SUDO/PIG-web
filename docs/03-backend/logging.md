# 日志规范

> 用 **Pino**(结构化 JSON)+ 文件落盘 + 按天切割。**所有日志必须可被 trace_id 追踪**。

---

## 一、日志级别

| Level | 用途 | 示例场景 |
|---|---|---|
| `fatal` | 致命错误,服务无法继续 | 数据库连接彻底失败 |
| `error` | 异常,但服务还能继续 | 调微信 API 失败、单条订单处理出错 |
| `warn` | 警告,需要关注 | 限流触发、余额不足、重试 |
| `info` | 正常事件 | 用户登录、订单创建、定时任务执行 |
| `debug` | 开发调试 | SQL 语句、入参出参细节 |
| `trace` | 极细粒度(几乎不用) | 函数入口/出口 |

### 各环境默认级别

| 环境 | LOG_LEVEL |
|---|---|
| development | `debug` |
| test | `warn` |
| staging | `info` |
| production | `info`(关键路径 debug 通过白名单开) |

---

## 二、日志输出

### 开发环境

```bash
# stdout:用 pino-pretty 彩色可读
[14:30:12.456 INFO  trace_id=abc OrderService] 创建订单 user_id=usr_xxx pig_id=pig_xxx
```

### 生产环境

```bash
# stdout(被 PM2 捕获):JSON
{"level":30,"time":1620000000000,"trace_id":"abc","module":"OrderService","msg":"创建订单","user_id":"usr_xxx","pig_id":"pig_xxx"}
```

### 文件落盘(PM2 配置)

```
/opt/pig/logs/app.log         应用日志(info+)
/opt/pig/logs/app.error.log   仅 error/fatal
/opt/pig/logs/app.access.log  HTTP 访问日志(可选)
```

每天切割,保留 30 天:
```
/opt/pig/logs/app.log.2026-05-10
/opt/pig/logs/app.log.2026-05-09
...
```

---

## 三、关键字段(必带)

每条日志都应包含:

| 字段 | 来源 | 例 |
|---|---|---|
| `level` | Pino 自动 | `30`(info) |
| `time` | Pino 自动 | `1620000000000` |
| `pid` | 进程 ID | `12345` |
| `trace_id` | 请求级 | `req_01H...` |
| `module` | 模块名 | `OrderService` |
| `msg` | 主消息 | `创建订单成功` |

业务相关:

| 字段 | 何时加 |
|---|---|
| `user_id` | 用户产生的操作 |
| `farmer_id` | 农户相关 |
| `order_id` / `pig_id` / `share_code` | 对应操作 |
| `duration_ms` | 调外部 / DB 查询 |
| `error.type` / `error.message` / `error.stack` | error 级 |

---

## 四、Trace ID 注入

### 中间件

```ts
// common/middleware/trace.middleware.ts
import { ulid } from 'ulid';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId = (req.headers['x-trace-id'] as string) || `req_${ulid()}`;
    req['trace_id'] = traceId;
    res.setHeader('X-Trace-Id', traceId);
    next();
  }
}
```

### Logger 配置

```ts
// 用 AsyncLocalStorage 维护请求级上下文
import { AsyncLocalStorage } from 'async_hooks';
export const requestContext = new AsyncLocalStorage<{ trace_id: string }>();
```

### 在 service 里用

```ts
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  async create(userId: string, dto: CreateOrderDto) {
    this.logger.log({
      msg: '创建订单',
      user_id: userId,
      pig_id: dto.pig_id,
    });
    // ...
  }
}
```

输出:
```json
{
  "level": 30,
  "time": 1620000000000,
  "trace_id": "req_01H...",
  "module": "OrderService",
  "msg": "创建订单",
  "user_id": "usr_xxx",
  "pig_id": "pig_xxx"
}
```

---

## 五、HTTP 访问日志

全局拦截器,记录每个 HTTP 请求:

```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log({
          msg: 'HTTP',
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration_ms: Date.now() - start,
          ip: req.ip,
          user_id: req.user?.id,
          user_agent: req.headers['user-agent'],
        });
      }),
      catchError(err => {
        this.logger.error({
          msg: 'HTTP error',
          method: req.method,
          path: req.path,
          duration_ms: Date.now() - start,
          error: { type: err.name, message: err.message, stack: err.stack },
        });
        throw err;
      }),
    );
  }
}
```

---

## 六、敏感数据脱敏 ⚠️

**绝对不能进日志的字段**:

| 字段 | 处理 |
|---|---|
| 密码 | 完全不打 |
| 微信 session_key | 完全不打 |
| 身份证号 | 不打,或只打 `***` |
| 手机号 | 打码 `138****1234` |
| 完整 JWT token | 只打前 8 位 + `...` |
| 微信支付的 key / API 证书 | 完全不打 |
| 用户信用卡(未来) | 完全不打 |

### 实现

```ts
// common/utils/log-safe.ts
export function maskPhone(p: string): string {
  if (!p || p.length < 7) return '***';
  return p.slice(0, 3) + '****' + p.slice(-4);
}

export function maskToken(t: string): string {
  if (!t) return '';
  return t.slice(0, 8) + '...';
}

export function sanitizeForLog(obj: any): any {
  const SENSITIVE = ['password', 'session_key', 'id_card', 'access_token', 'refresh_token'];
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (SENSITIVE.includes(key)) result[key] = '[REDACTED]';
    if (key === 'phone') result[key] = maskPhone(result[key]);
  }
  return result;
}
```

---

## 七、定时任务日志

每个 cron 必须打开始 + 结束 + 处理量:

```ts
@Cron('0 0 * * *')
async dailyChargeFeeding() {
  this.logger.log({ msg: '开始日扣代养费' });
  const start = Date.now();
  let processed = 0;
  let failed = 0;
  // ...
  this.logger.log({
    msg: '日扣代养费完成',
    duration_ms: Date.now() - start,
    processed,
    failed,
  });
}
```

---

## 八、错误日志 vs 业务日志

| 业务异常(用户输入错误、状态冲突) | `warn` |
|---|---|
| 系统异常(DB 连接 / 第三方 API 挂) | `error` |
| 致命(进程要退出) | `fatal` |

**不要把业务异常打成 error 级**——会污染告警。

---

## 九、查询日志(线上排错)

### SSH 上看实时

```bash
ssh pig 'tail -f /opt/pig/logs/app.log | jq .'
```

### 按 trace_id 查

```bash
ssh pig 'grep "req_01H..." /opt/pig/logs/app.log* | jq .'
```

### 按用户查

```bash
ssh pig 'grep "usr_01H..." /opt/pig/logs/app.log | jq .'
```

### 看 error

```bash
ssh pig 'tail -100 /opt/pig/logs/app.error.log | jq .'
```

---

## 十、未来:接日志聚合

短期靠 grep + jq 够用。当日量 > 1GB 时,迁移到:

- **Loki + Grafana**(轻量)
- **ELK Stack**(完整但重)
- **腾讯云 CLS**(托管)

迁移工作:配置 promtail / filebeat 把 `/opt/pig/logs/*.log` 收集走。

---

## 十一、日志规范 Checklist(PR review 用)

- [ ] 是否带 `trace_id`?
- [ ] 是否带 `module`?
- [ ] 业务字段是否完整(user_id / order_id …)?
- [ ] 是否有敏感字段?(密码 / session_key / 身份证)
- [ ] 错误级别用对?(business → warn,system → error)
- [ ] 是否在循环里打日志?(导致日志爆炸)
- [ ] 是否在热点路径上打 debug?(性能)
