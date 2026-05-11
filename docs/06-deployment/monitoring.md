# 监控与告警

> 当前阶段:**最小可用监控**(健康检查 + 日志告警 + PM2)。规模扩大后接入完整方案。

---

## 一、当前监控栈

| 维度 | 工具 | 状态 |
|---|---|---|
| 进程存活 | PM2 自带 | ✅ |
| 应用日志 | 文件 + grep | ✅ |
| 健康端点 | `/api/health` | ✅(待实现) |
| HTTP 访问日志 | nginx access.log | ✅ |
| 异常上报 | **Sentry** | ❌ 待接入 |
| 主机监控(CPU/MEM/DISK) | 腾讯云控制台 | ✅ 但被动 |
| 数据库慢查询 | MySQL slow log | ❌ 待开启 |
| 告警通知 | **企业微信机器人** | ❌ 待配置 |

---

## 二、健康检查端点

### `/api/health` 实现

```ts
@Public()
@Get('health')
async health() {
  const checks = await Promise.allSettled([
    this.dataSource.query('SELECT 1'),
    this.redis.ping(),
  ]);

  const dbOk = checks[0].status === 'fulfilled';
  const redisOk = checks[1].status === 'fulfilled';

  return {
    status: dbOk && redisOk ? 'ok' : 'degraded',
    uptime_seconds: Math.floor(process.uptime()),
    db: dbOk ? 'ok' : 'fail',
    redis: redisOk ? 'ok' : 'fail',
    version: process.env.APP_VERSION || 'dev',
    commit: process.env.GIT_COMMIT || 'unknown',
  };
}
```

### 监控接入

腾讯云监控 / UptimeRobot / 自建脚本,1 分钟一次 GET:

```bash
*/1 * * * * curl -fsS https://www.rockingwei.online/api/health > /dev/null || \
  curl -X POST <企业微信机器人 webhook> -d '{"msgtype":"text","text":{"content":"⚠️ pig-backend 健康检查失败"}}'
```

---

## 三、PM2 监控

### 基础命令

```bash
ssh pig 'pm2 list'              # 进程列表
ssh pig 'pm2 monit'             # 交互式监控面板(CPU/MEM)
ssh pig 'pm2 logs pig-backend'  # 日志流
ssh pig 'pm2 logs --lines 200'  # 看最近 200 行
ssh pig 'pm2 describe pig-backend'  # 详细信息
```

### 自动重启策略

`ecosystem.config.js` 配:

```js
{
  max_memory_restart: '512M',   // 内存超 512M 自动重启
  max_restarts: 10,             // 10 次内连续重启视为异常,停止
  min_uptime: '60s',            // 启动 60s 算稳定
  restart_delay: 4000,          // 重启间隔
  autorestart: true,
}
```

### PM2 Plus(后续)

PM2 官方 SaaS 监控,免费版 4 进程内。仪表盘 + 告警:
- https://app.pm2.io
- 后续接入

---

## 四、日志检索

### 常用查询

```bash
# 看错误
ssh pig 'tail -100 /opt/pig/logs/app.error.log | jq .'

# 按 trace_id 查全链路
ssh pig 'grep "req_01HXXX" /opt/pig/logs/app.log* | jq .'

# 按用户查
ssh pig 'grep "usr_01HXXX" /opt/pig/logs/app.log | jq .'

# 慢请求
ssh pig 'jq "select(.duration_ms > 1000)" /opt/pig/logs/app.log'

# 5xx
ssh pig 'jq "select(.status >= 500)" /opt/pig/logs/app.log'

# 统计今日请求量
ssh pig 'cat /opt/pig/logs/app.log | jq "select(.msg == \"HTTP\")" | wc -l'
```

### 后续接 Loki + Grafana

当日志量 > 1GB / 天 时接入。仪表盘:
- QPS
- p50 / p95 / p99 延迟
- 错误率
- TopN 慢接口

---

## 五、nginx 监控

### access log 切割

`/etc/logrotate.d/nginx`(系统默认):
- 每天切割
- 保留 14 天
- 压缩

### 看访问

```bash
ssh pig 'sudo tail -f /var/log/nginx/rockingwei.access.log'
```

### 统计 QPS / 4xx / 5xx

```bash
# 今日 4xx
ssh pig "sudo awk '\$9 >= 400 && \$9 < 500' /var/log/nginx/rockingwei.access.log | wc -l"

# 5xx
ssh pig "sudo awk '\$9 >= 500' /var/log/nginx/rockingwei.access.log"

# TopN 接口
ssh pig "sudo awk '{print \$7}' /var/log/nginx/rockingwei.access.log | sort | uniq -c | sort -rn | head -20"
```

---

## 六、MySQL 慢查询

启用:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL long_query_time = 1;        -- > 1s 算慢
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

或永久写在 `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
log_queries_not_using_indexes = 1
```

定期看:

```bash
ssh pig 'sudo mysqldumpslow -t 10 /var/log/mysql/slow.log'   # Top10 慢查询
```

---

## 七、磁盘监控

腾讯云轻量应用服务器自带告警,触发条件:
- CPU > 80% 持续 5 分钟
- 内存 > 85%
- 磁盘 > 80%

接收方:邮件 / 短信 / 企业微信。

### 手动看

```bash
ssh pig 'df -h'                    # 磁盘
ssh pig 'free -h'                  # 内存
ssh pig 'top -bn1 | head -20'      # CPU
ssh pig 'du -sh /opt/pig/logs/'    # 日志占用
```

### 自动清理

`crontab` 加:

```
# 每周一清旧日志
0 4 * * 1 find /opt/pig/logs -name "*.log.*" -mtime +30 -delete

# 每周一清老 release(保留最近 5)
0 5 * * 1 ls -1t /opt/pig/releases | tail -n +6 | xargs -r -I{} rm -rf /opt/pig/releases/{}
```

---

## 八、告警 · 企业微信机器人

### 设置

1. 企业微信群 → 群设置 → 群机器人 → 添加机器人
2. 复制 webhook URL
3. 加到 `/opt/pig/shared/.env.production`:
   ```env
   ALERT_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
   ```

### 应用层告警

`src/common/alert.service.ts`:

```ts
@Injectable()
export class AlertService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async send(message: string, level: 'info' | 'warn' | 'error' = 'warn') {
    const url = this.config.get('alert.webhookUrl');
    if (!url) return;
    await this.http.post(url, {
      msgtype: 'markdown',
      markdown: {
        content: `**[${level.toUpperCase()}]** ${message}\n> ${new Date().toISOString()}`,
      },
    });
  }
}
```

### 应用场景

- 支付回调签名失败 → error
- 钱包扣款失败 → error
- 第三方 API 调用超时 > 5 次/分钟 → warn
- 数据库连接断开 → error
- 部署成功 / 失败 → info

---

## 九、Sentry 接入(后续)

Sentry 提供前后端异常聚合 + 用户上下文。

### 后端

```bash
npm i @sentry/node
```

```ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 前端

```bash
npm -w frontend i @sentry/vue
```

```ts
import * as Sentry from '@sentry/vue';
Sentry.init({
  app,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

---

## 十、业务监控(后续)

业务指标也要监控,比如:

| 指标 | 阈值 |
|---|---|
| 日新增用户 | 低于平均 50% → 报警 |
| 日下单 | 异常波动 |
| 支付成功率 | < 95% |
| 直播流断流 | 任何一头 > 10 分钟 |
| 钱包余额 < 100 的用户 | > 100 个 → 提醒充值通知 |

实现:定时任务每小时扫一遍 → 触发告警。

---

## 十一、最小可用监控配置(MVP)

按优先级,这几样**先做**:

1. ✅ 健康检查 + UptimeRobot 1 分钟一次
2. ✅ 企业微信机器人告警(`AlertService`)
3. ✅ PM2 max_memory_restart + 日志
4. ✅ 数据库每日备份 + cron
5. ⬜ Sentry(P1)
6. ⬜ MySQL 慢日志(P2)
7. ⬜ Loki / Grafana(P3,日志量大了)

---

## 十二、应急联系

| 角色 | 联系方式 |
|---|---|
| Owner | (内部) |
| 服务器(腾讯云) | 控制台 + 短信 |
| 域名 | 注册商控制台 |
| 微信小程序 | mp.weixin.qq.com 后台 |
| 微信支付 | pay.weixin.qq.com |

事故时联系顺序:Owner → 评估 → 必要时联系腾讯云客服。
