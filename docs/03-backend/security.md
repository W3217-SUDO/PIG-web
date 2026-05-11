# 安全规范

> 信息安全的底线。开发期、上线前、运行期都按本文执行。

---

## 一、威胁模型(我们防什么)

| 威胁 | 严重度 | 当前防护 |
|---|---|---|
| SQL 注入 | 🔴 高 | ORM 参数化 + 禁用拼接 |
| XSS(主要 H5 / 管理后台) | 🟡 中 | Vue 自动转义 + CSP |
| CSRF(管理后台) | 🟡 中 | SameSite cookie + token |
| 越权(横向 / 纵向) | 🔴 高 | 守卫 + service 层鉴权 |
| 接口暴力调用 | 🟡 中 | 限流 |
| 密钥泄露 | 🔴 高 | .env 不入库 + 服务器隔离 |
| 用户数据脱裤 | 🔴 高 | 数据库不对公网 + 备份加密 |
| 文件上传漏洞 | 🟡 中 | 类型 / 大小 / MIME 校验 |
| 微信支付伪造回调 | 🔴 高 | 严格签名校验 |
| DDoS | 🟢 低 | 腾讯云 CDN / 高防(后续) |

---

## 二、鉴权 / 越权防护

### 横向越权

**问题**:用户 A 通过改 URL 参数访问用户 B 的资源。

```
GET /api/orders/ord_B_的订单_ID
Authorization: Bearer A_的_token  ← 危险!
```

**防护**:**所有资源查询必须带 `user_id` 过滤**:

```ts
// ❌ 危险
async findOne(id: string) {
  return this.orderRepo.findOneByOrFail({ id });
}

// ✅ 安全
async findOneForUser(id: string, userId: string) {
  const order = await this.orderRepo.findOneByOrFail({ id });
  if (order.user_id !== userId) {
    throw new ForbiddenException();
  }
  return order;
}

// 拼猪场景:还要查 share_members
```

### 纵向越权

**问题**:普通用户访问 admin 接口。

**防护**:
1. `@Roles('admin')` 装饰器 + `RolesGuard`
2. admin 路由前缀单独鉴权(独立 controller / interceptor)
3. 关键操作留审计日志

---

## 三、SQL 注入防护

### 强制规则

- **绝对禁止**用模板字符串拼 SQL:
  ```ts
  // ❌
  this.dataSource.query(`SELECT * FROM users WHERE name = '${name}'`);

  // ✅
  this.dataSource.query('SELECT * FROM users WHERE name = ?', [name]);
  ```

- ORM 的 `QueryBuilder` 始终用参数化:
  ```ts
  // ✅
  qb.where('user.name = :name', { name });

  // ❌ 危险
  qb.where(`user.name = '${name}'`);
  ```

- 排序字段必须**白名单**:
  ```ts
  // ❌ 直接用前端传的 sort 字段
  qb.orderBy(req.query.sort);

  // ✅
  const ALLOWED_SORT = ['created_at', 'price', 'rating'];
  if (!ALLOWED_SORT.includes(sortField)) throw new BadRequestException();
  qb.orderBy(sortField);
  ```

---

## 四、输入校验

### 全局 ValidationPipe

```ts
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,             // 自动剥离未声明字段
    forbidNonWhitelisted: true,  // 多余字段直接 400
    transform: true,             // 自动 type 转换
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

### DTO 必须用 class-validator

```ts
export class CreateOrderDto {
  @IsString()
  @Length(27, 27)
  @Matches(/^pig_[0-9A-HJKMNP-TV-Z]+$/)
  pig_id: string;

  @IsString()
  @IsIn(['blackpig', 'changbai', 'huazhu'])
  breed: string;

  @IsString()
  @Length(27, 27)
  farmer_id: string;

  @IsOptional()
  @IsIn(['basic', 'full', 'none'])
  insurance_plan?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50000)
  wallet_topup?: number;
}
```

**不要省略**:每个字段都要校验,缺一个 PR review 不过。

---

## 五、限流(Rate Limiting)

### 用 nestjs-throttler

```ts
// app.module.ts
ThrottlerModule.forRoot({ ttl: 60, limit: 60 })  // 默认每分钟 60 次
```

### 关键接口加更严

```ts
@Throttle(1, 60)                                  // 每分钟 1 次
@Post('sms/send')
async sendSms() { ... }

@Throttle(10, 60)                                 // 每分钟 10 次
@Post('wx-login')
async wxLogin() { ... }

@Throttle(3, 3600)                                // 每小时 3 次
@Post('withdraw')
async withdraw() { ... }
```

### 维度

- 默认按 IP
- 登录后按 user_id(更准)
- 短信发送按 phone + IP 双维度

---

## 六、密钥管理

### 三层隔离

| 层 | 存储 | 谁能看 |
|---|---|---|
| 本地 dev | `backend/.env.development`(`.gitignore`) | 开发者本机 |
| Staging | 服务器 `/opt/pig/shared/.env.staging` | 部署机器 |
| Production | 服务器 `~/.pig-secrets`(只 owner 可读) | Owner + 部署脚本 |

### 永远不入库的密钥

- 数据库密码
- Redis 密码
- JWT secret
- 微信 AppSecret / 支付商户密钥
- 七牛 / 腾讯云 OSS 密钥
- 短信平台密钥

### 密钥轮换流程

如果发现泄露 / 离职 / 定期(每季度):

1. 生成新密钥
2. 双写期(老密钥还能用,新密钥已配):
   - 更新所有客户端配置
   - 更新所有 server 配置
3. 删除老密钥
4. 留审计记录

### 应急

如果 GitHub 上误传了 `.env`:

```bash
# 1. 立即 rotate 所有泄露的密钥
# 2. git 历史也要清(BFG Repo-Cleaner)
git filter-repo --invert-paths --path backend/.env.production
git push --force origin main
# 3. 在 GitHub 通知合作者强制重新 clone
```

---

## 七、密码 / 哈希

### 用户密码(管理后台)

```ts
import bcrypt from 'bcrypt';

const hash = await bcrypt.hash(password, 12);
const isMatch = await bcrypt.compare(plain, hash);
```

- cost factor 12(2026 标准)
- 永远不用 MD5 / SHA1

### 身份证

```ts
// 只存 hash,不存原文
const id_card_hash = crypto.createHash('sha256').update(id_card).digest('hex');
```

---

## 八、文件上传安全

### 校验三件套

```ts
const UPLOAD_RULES = {
  image: {
    maxSize: 5 * 1024 * 1024,   // 5MB
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    exts: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  video: {
    maxSize: 50 * 1024 * 1024,
    mimes: ['video/mp4'],
    exts: ['.mp4'],
  },
};
```

校验逻辑:
1. 文件大小
2. MIME 类型(浏览器声明 + 后端 file-type 库二次验证)
3. 后缀名
4. **去掉 EXIF**(用 sharp 处理一遍)
5. 重命名为 `<ulid>.<ext>`,不保留用户原名

### 存储位置

- **不在 webroot**(防止上传 `.php` 被执行)
- 用独立子域 / 独立路径(便于配置)

---

## 九、微信支付回调签名

支付回调是最容易被伪造的入口:

```ts
@Public()  // 微信调,不带 token
@Post('pay/wx-notify')
async wxPayNotify(@Body() body: any, @Headers() headers: any) {
  // 1. 验证签名
  const valid = await this.wxPay.verifyNotifySign(body, headers);
  if (!valid) {
    this.logger.error({ msg: '微信支付回调签名失败', body, headers });
    return { code: 'FAIL', message: 'INVALID_SIGN' };
  }

  // 2. 幂等:看 out_trade_no 是否已处理
  // 3. 处理订单
  // 4. 返回 SUCCESS
}
```

**关键**:
- 签名校验失败 → 报警 + 拒绝
- 同 `out_trade_no` 重复推送 → 直接返回 SUCCESS,不重复处理订单

---

## 十、CORS

```ts
app.enableCors({
  origin: [
    'https://www.rockingwei.online',
    'https://rockingwei.online',
    /^https:\/\/.*\.rockingwei\.online$/,
    // dev:
    'http://localhost:5173',
    'http://localhost:8080',
  ],
  credentials: true,
});
```

**不要 `origin: '*'`** —— 即使没有 cookie 也不要。

---

## 十一、Headers 安全

用 helmet 包加默认安全头:

```ts
app.use(helmet({
  contentSecurityPolicy: false,  // CSP 单独配
}));
```

输出:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=63072000`
- `X-XSS-Protection: 1; mode=block`

---

## 十二、依赖安全

### 定期扫描

```bash
npm audit                    # 看高危
npm audit fix                # 自动修
```

CI 里加:

```yaml
- run: npm audit --audit-level=high
```

### 锁版本

- `package-lock.json` **必须入库**
- 升级用 `npm update <pkg>` 谨慎进行,看 changelog

---

## 十三、日志安全

详见 [`logging.md#敏感数据脱敏`](./logging.md)

**关键**:错误堆栈不能返回给前端(可能泄露代码路径):

```ts
@Catch()
export class AllExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();

    if (process.env.NODE_ENV === 'production') {
      // 生产:只返回业务码 + 友好消息
      res.json({ code: 90099, message: '服务器内部错误' });
    } else {
      // 开发:堆栈可见
      res.json({ code: 90099, message: exception.message, stack: exception.stack });
    }
  }
}
```

---

## 十四、安全 Checklist(PR 必过)

- [ ] 是否所有路由都有鉴权(`@Public()` 必须明示)
- [ ] DTO 是否每个字段都校验
- [ ] 是否有 SQL 字符串拼接
- [ ] 是否在日志里打了敏感字段
- [ ] 是否暴露了内部错误(stack / SQL)给前端
- [ ] 是否新增了密钥(必须配 `.env.example` 占位)
- [ ] 是否新增了第三方依赖(看 license + 维护状态)
- [ ] 是否改了支付 / 钱包相关代码(双人 review!)

---

## 十五、安全事件应急

发现安全问题(漏洞 / 泄露 / 被攻击):

1. **立即** 通知 Owner
2. 评估影响范围
3. 临时止血(下线接口 / rotate 密钥 / 封 IP)
4. 修复
5. 复盘 + 写 ADR
6. 必要时通知用户(数据脱裤等)
