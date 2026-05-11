# 配置与环境变量

> 所有可变配置统一通过 `.env` + `config service` 加载。**禁止把环境差异写死在代码里**。

---

## 一、配置加载流程

```
.env.{NODE_ENV}              ← 当前环境的变量
       ▼
Joi 校验(types + required)
       ▼
ConfigService.get('key')
       ▼
注入到各 Service / Module
```

### 优先级

1. 系统环境变量(`process.env.XXX`)—— 最高,部署时通过 PM2 ecosystem 传
2. `backend/.env.<NODE_ENV>` —— 主配置
3. 代码默认值 —— 最低

---

## 二、`.env.example`(模板,入库)

```env
# ============================================
# 私人订猪 后端 环境变量模板
# 拷贝到 .env.development / .env.production 后填实际值
# ============================================

# ── 运行 ────────────────────────────────────
NODE_ENV=development         # development / test / staging / production
PORT=3000                    # 监听端口

# ── 数据库 ──────────────────────────────────
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=changeme             # 本地用 local_dev_pass,生产用强密码
DB_NAME=pig
DB_LOGGING=false             # true 时打印 SQL(性能开销大,生产关)
DB_SYNCHRONIZE=false         # 绝对不要在生产开 true(会自动改表结构!)

# ── Redis ────────────────────────────────────
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASS=
REDIS_DB=0

# ── JWT ──────────────────────────────────────
JWT_SECRET=changeme_32chars_minimum_for_production_use
JWT_ACCESS_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

# ── 微信小程序 ───────────────────────────────
WX_MP_APPID=wx_xxxxxx
WX_MP_SECRET=xxxxxx
WX_MP_LOGIN_URL=https://api.weixin.qq.com/sns/jscode2session

# ── 微信开放平台(APP 用) ────────────────────
WX_OPEN_APPID=wx_xxxxxx
WX_OPEN_SECRET=xxxxxx

# ── 微信支付 ────────────────────────────────
WX_PAY_MCH_ID=
WX_PAY_API_KEY=
WX_PAY_API_CERT_PATH=
WX_PAY_NOTIFY_URL=https://www.rockingwei.online/api/pay/wx-notify

# ── 短信 ────────────────────────────────────
SMS_PROVIDER=tencent          # tencent / aliyun
SMS_TENCENT_SECRET_ID=
SMS_TENCENT_SECRET_KEY=
SMS_TENCENT_APP_ID=
SMS_TENCENT_SIGN=私人订猪
SMS_TENCENT_TEMPLATE_LOGIN=

# ── 文件存储 ────────────────────────────────
STORAGE_PROVIDER=local        # local / cos / oss
STORAGE_LOCAL_DIR=./uploads
STORAGE_LOCAL_BASE_URL=http://127.0.0.1:3000/uploads
# 生产用 cos
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=ap-chongqing
COS_BASE_URL=https://cos.rockingwei.online

# ── 直播 ────────────────────────────────────
LIVE_PROVIDER=mock            # mock / tencent / qiniu
LIVE_PUSH_DOMAIN=
LIVE_PLAY_DOMAIN=
LIVE_PUSH_KEY=
LIVE_PLAY_KEY=

# ── 日志 ────────────────────────────────────
LOG_LEVEL=debug               # trace / debug / info / warn / error / fatal
LOG_PRETTY=true               # 开发期彩色,生产关
LOG_FILE_DIR=./logs

# ── 限流 ────────────────────────────────────
THROTTLE_TTL=60               # 时间窗口(秒)
THROTTLE_LIMIT=60             # 窗口内最大请求

# ── CORS ────────────────────────────────────
CORS_ORIGINS=http://localhost:5173,http://localhost:8080,https://www.rockingwei.online

# ── 监控 / 告警(后续) ──────────────────────
SENTRY_DSN=
PROMETHEUS_ENABLED=false
```

---

## 三、Joi 校验

```ts
// src/config/validation.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').required(),
  PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASS: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_LOGGING: Joi.boolean().default(false),
  DB_SYNCHRONIZE: Joi.boolean().default(false),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASS: Joi.string().allow('').default(''),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('2h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  WX_MP_APPID: Joi.string().required(),
  WX_MP_SECRET: Joi.string().required(),

  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
  // …
});
```

**关键约束**:
- 启动时,任何 required 缺失立刻 throw,不让应用起来
- `JWT_SECRET` 强制 ≥ 32 字符
- `DB_SYNCHRONIZE` 生产必须 false(代码层面再做一道判断)

---

## 四、模块化加载

```ts
// src/config/configuration.ts
export default () => ({
  app: {
    env: process.env.NODE_ENV,
    port: parseInt(process.env.PORT, 10),
  },
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    name: process.env.DB_NAME,
    logging: process.env.DB_LOGGING === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
    pass: process.env.REDIS_PASS,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  wx: {
    mp: {
      appid: process.env.WX_MP_APPID,
      secret: process.env.WX_MP_SECRET,
    },
  },
  log: {
    level: process.env.LOG_LEVEL,
    pretty: process.env.LOG_PRETTY === 'true',
  },
  // …
});
```

### 使用

```ts
@Injectable()
export class OrderService {
  constructor(private readonly config: ConfigService) {}

  someMethod() {
    const expiresIn = this.config.get<string>('jwt.accessExpiresIn');
  }
}
```

---

## 五、多环境差异

| 配置项 | development | staging | production |
|---|---|---|---|
| `NODE_ENV` | development | staging | production |
| `DB_HOST` | 127.0.0.1 | 127.0.0.1(服务器内) | 127.0.0.1 |
| `DB_PASS` | local_dev_pass | strong-pass-1 | strong-pass-2 |
| `LOG_LEVEL` | debug | info | info |
| `LOG_PRETTY` | true | false | false |
| `DB_LOGGING` | true | false | false |
| `DB_SYNCHRONIZE` | **false** | **false** | **false** |
| `STORAGE_PROVIDER` | local | cos | cos |
| `LIVE_PROVIDER` | mock | mock / tencent | tencent |
| `THROTTLE_LIMIT` | 1000(放开调试) | 100 | 60 |

> ⚠️ **永远不要在生产开 `DB_SYNCHRONIZE=true`**——会自动 ALTER TABLE,可能直接删数据。

---

## 六、PM2 ecosystem 配置

服务器上 `/opt/pig/shared/ecosystem.config.js`(不入库):

```js
module.exports = {
  apps: [
    {
      name: 'pig-backend',
      script: '/opt/pig/current/dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        // 其余从 .env.production 读
      },
      env_file: '/opt/pig/shared/.env.production',
      log_file: '/opt/pig/logs/app.log',
      error_file: '/opt/pig/logs/app.error.log',
      time: true,
      max_memory_restart: '512M',
      autorestart: true,
      watch: false,
    },
  ],
};
```

---

## 七、本地 vs 服务器 配置文件路径

| 文件 | 路径 |
|---|---|
| 本地 dev | `backend/.env.development` |
| 本地 test | `backend/.env.test` |
| 服务器 staging | `/opt/pig/shared/.env.staging` |
| 服务器 production | `/opt/pig/shared/.env.production` 或 `~/.pig-secrets` |
| 模板(入库) | `backend/.env.example` |

---

## 八、新增配置项 SOP

每次加一个新配置:

1. 在 `.env.example` 加一行 + 注释说明
2. 在 `src/config/validation.ts` 加 Joi 规则
3. 在 `src/config/configuration.ts` 加映射
4. 文档:**本文(`config.md`)更新表格**
5. 通知合作者:他们要 update 本地 `.env.development`
6. 服务器:owner 部署前更新 `/opt/pig/shared/.env.production`

---

## 九、动态配置(运行时可改)

某些配置需要不重启服务也能改(运营调价、限流阈值):

| 短期方案 | 中期方案 |
|---|---|
| 写在数据库 `system_configs` 表 | 接 Nacos / Apollo(团队大了再说) |

`system_configs` 表 schema(后续做):

```sql
CREATE TABLE system_configs (
  key             VARCHAR(100)    PRIMARY KEY,
  value           TEXT            NOT NULL,
  type            VARCHAR(20),         -- string / number / json / bool
  description     VARCHAR(500),
  updated_by      CHAR(27),
  updated_at      DATETIME(3) ON UPDATE CURRENT_TIMESTAMP(3)
);
```

例:`pricing.feeding_daily` = `10.00`,`feature_flag.live_enabled` = `false`

读取时:
```ts
const fee = await this.configService.dynamic('pricing.feeding_daily');
```

加 Redis 缓存 + 失效订阅,改了立即生效。

---

## 十、配置检查清单(部署前)

- [ ] `JWT_SECRET` 是否 ≥ 32 字符,且 staging / production 各自独立
- [ ] `DB_PASS` 是否强密码
- [ ] `WX_MP_SECRET` 是否填了
- [ ] `WX_PAY_*` 是否配齐(没接支付前可空)
- [ ] `CORS_ORIGINS` 是否包含线上域名
- [ ] `LOG_PRETTY` 是否关
- [ ] `DB_SYNCHRONIZE` 是否关
- [ ] `STORAGE_PROVIDER` 是否切换到 cos
