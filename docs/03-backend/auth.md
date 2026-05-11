# 认证与权限

> 微信登录 + JWT + 角色权限。所有受保护接口必须经过守卫。

---

## 一、登录方式

| 方式 | 用途 | 端 |
|---|---|---|
| **微信小程序登录** | 主要方式,无密码 | 小程序 |
| **微信开放平台登录** | APP 用 | APP |
| **短信验证码登录** | 兜底 / 农户 | 全端 |
| **用户名密码登录** | **只用于管理后台** | 桌面 Web |

---

## 二、小程序登录流程

```
┌──────────┐                  ┌────────┐                ┌──────────┐
│ 小程序   │                  │ 后端    │                │ 微信API   │
└────┬─────┘                  └───┬────┘                └────┬─────┘
     │  1. wx.login()             │                          │
     │                            │                          │
     │  2. POST /auth/wx-login    │                          │
     │  { code: 'xxx' }           │                          │
     │ ───────────────────────────►                          │
     │                            │  3. jscode2session       │
     │                            │ ─────────────────────────►
     │                            │                          │
     │                            │  4. { openid, session_key│
     │                            │ ◄─────────────────────────
     │                            │                          │
     │                            │  5. 查/建 User,签 JWT    │
     │                            │                          │
     │  6. { access_token, refresh_token, user }             │
     │ ◄──────────────────────────                           │
     │                                                       │
     │  7. 后续请求带 Authorization: Bearer <access_token>   │
     │ ───────────────────────────►                          │
```

### 代码示例

#### 控制器

```ts
@Public()
@Post('wx-login')
@ApiOperation({ summary: '微信小程序登录' })
async wxLogin(@Body() dto: WxLoginDto) {
  return this.authService.wxLogin(dto.code);
}
```

#### Service

```ts
async wxLogin(code: string) {
  // 1. 用 code 换 openid + session_key
  const wxRes = await this.wxClient.code2Session(code);
  if (wxRes.errcode) {
    throw new BusinessException(10101, '微信 code 无效');
  }

  // 2. 查/建用户
  let user = await this.userRepo.findOne({ where: { wx_openid: wxRes.openid } });
  if (!user) {
    user = await this.userRepo.save({
      id: ulid('usr_'),
      wx_openid: wxRes.openid,
      wx_unionid: wxRes.unionid,
      nickname: '微信用户',
      avatar_url: '',
      role: 'customer',
    });
    // 同时创建 wallet
    await this.walletRepo.save({
      id: ulid('wlt_'),
      user_id: user.id,
      balance: 0,
    });
  }

  // 3. 缓存 session_key(用于解密用户敏感字段)
  await this.redis.setex(`wx:session_key:${user.id}`, 7 * 86400, wxRes.session_key);

  // 4. 签发 JWT
  const tokens = this.signTokens(user);

  return {
    user: this.toUserDto(user),
    ...tokens,
  };
}
```

---

## 三、JWT 签发

### 双 token 模型

| Token | 用途 | TTL |
|---|---|---|
| `access_token` | API 请求 Authorization 头 | **2 小时** |
| `refresh_token` | 换新的 access_token | **7 天** |

### Payload

```json
{
  "sub": "usr_01H...",
  "role": "customer",
  "iat": 1620000000,
  "exp": 1620007200,
  "type": "access"
}
```

- `sub` —— 用户 ID
- `role` —— 角色,用于细粒度守卫
- `type` —— `access` / `refresh`

### 签发代码

```ts
private signTokens(user: User) {
  const access_token = this.jwtService.sign(
    { sub: user.id, role: user.role, type: 'access' },
    { expiresIn: '2h' },
  );
  const refresh_token = this.jwtService.sign(
    { sub: user.id, type: 'refresh' },
    { expiresIn: '7d' },
  );
  return { access_token, refresh_token, expires_in: 7200 };
}
```

### 刷新

```ts
@Public()
@Post('refresh')
async refresh(@Body() dto: RefreshDto) {
  const payload = this.jwtService.verify(dto.refresh_token);
  if (payload.type !== 'refresh') {
    throw new UnauthorizedException();
  }
  // 检查吊销名单
  if (await this.redis.sismember('jwt:revoked', dto.refresh_token)) {
    throw new UnauthorizedException();
  }
  const user = await this.userRepo.findOneByOrFail({ id: payload.sub });
  return this.signTokens(user);
}
```

### 吊销

主动 logout 时,把 token 加入 Redis 黑名单(TTL = 剩余有效期):

```ts
async logout(accessToken: string, userId: string) {
  const payload = this.jwtService.decode(accessToken);
  const ttl = payload.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    await this.redis.setex(`jwt:revoked:${accessToken}`, ttl, '1');
  }
}
```

---

## 四、守卫(Guards)

### 全局默认守卫

`AuthGuard` 是全局守卫,所有路由默认需要 token。

```ts
// main.ts
app.useGlobalGuards(app.get(JwtAuthGuard), app.get(RolesGuard));
```

### `@Public()` 装饰器

公开路由打这个装饰器跳过认证:

```ts
@Public()
@Get('pigs')
async listPigs() { ... }
```

### `@Roles()` 装饰器

需要特定角色:

```ts
@Roles('admin')
@Get('admin/users')
async listAllUsers() { ... }
```

支持多角色:

```ts
@Roles('admin', 'super_admin')
```

### `@CurrentUser()` 装饰器

注入当前登录用户:

```ts
@Get('me')
async getMe(@CurrentUser() user: User) {
  return user;
}
```

底层实现:
```ts
export const CurrentUser = createParamDecorator(
  (data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
```

---

## 五、权限矩阵

### 角色

| Role | 来源 | 默认权限 |
|---|---|---|
| `customer` | 微信登录用户(默认) | 自己的猪 / 订单 / 钱包 |
| `farmer` | 用户绑定为农户 | 自己代养的猪 + 喂养打卡 |
| `admin` | 平台运营 | 看所有 C 端数据,部分操作 |
| `super_admin` | Owner | 全部 |

### 资源访问规则

| 资源 | customer | farmer | admin |
|---|---|---|---|
| 自己的订单 | R/W | — | R |
| 别人的订单 | — | — | R |
| 自己认领的猪 | R | — | R |
| 自己拼猪加入的猪 | R(只读) | — | R |
| 自己代养的猪 | — | R/W(喂养、健康) | R |
| 所有猪只 | R(列表) | — | R |
| 自己的钱包 | R | — | R |
| 别人的钱包 | — | — | R |
| 用户管理 | — | — | R/W |
| 农户管理 | — | — | R/W |

### 拼猪权限特殊规则

- 主认领人:R/W(可邀请、可踢人、可解散)
- 受邀人:R(可看猪 / 直播 / 喂养 / 健康,**不能操作订单**)
- 离开后:不能再看

实现在 service 层:

```ts
// pig.service.ts
async findOneForUser(pigId: string, userId: string) {
  const pig = await this.pigRepo.findOneOrFail({ where: { id: pigId } });

  // 检查认领或拼猪关系
  const isOwner = await this.orderRepo.exists({
    where: { pig_id: pigId, user_id: userId, status: In(['active', 'mature']) },
  });
  const isShareMember = await this.shareMemberRepo.exists({
    where: {
      user_id: userId,
      share: { pig_id: pigId },
      status: 'joined',
    },
  });

  if (!isOwner && !isShareMember) {
    throw new ForbiddenException('你未认领此猪,也未加入拼猪');
  }

  return pig;
}
```

---

## 六、短信验证码登录

### 流程

```
1. POST /auth/sms/send  { phone: '138xxx' }
   - 限流(IP + phone)
   - 生成 6 位码
   - 发短信(腾讯云短信 / 阿里云短信)
   - Redis 存 code:sms:138xxx → 'xxxxxx', TTL 5 分钟

2. POST /auth/sms-login { phone: '138xxx', code: 'xxxxxx' }
   - 校验 code,正确则:
     - 查用户(phone 唯一)
     - 没有就建
     - 签 JWT
```

### 限流

| 维度 | 限制 |
|---|---|
| 同手机号 | 60 秒 1 次,1 天 5 次 |
| 同 IP | 1 小时 20 次 |

---

## 七、管理后台登录(独立)

### 不走微信 / 短信

管理员账号在 `users` 表里,但走独立路径:

```
POST /api/admin/auth/login
{ username, password, totp_code }
```

- 密码 **bcrypt** + salt(`bcrypt.hash(password, 12)`)
- **必须 2FA**(TOTP,Google Authenticator)
- 登录 IP 白名单(超管设置)
- 登录全部留审计日志

---

## 八、敏感字段加密

某些字段绝不明文存储:

| 字段 | 处理 |
|---|---|
| 密码 | bcrypt(管理员账号) |
| 身份证号 | sha256 hash,**不存原文** |
| 手机号 | 明文存(业务需要),但日志 / 后台显示打码 `138****1234` |
| 微信 session_key | Redis 缓存,**不入库** |

---

## 九、登录态持久化(前端)

### 小程序

```ts
// frontend/src/store/user.ts
uni.setStorageSync('access_token', tokens.access_token);
uni.setStorageSync('refresh_token', tokens.refresh_token);
uni.setStorageSync('user', user);
```

### APP

同上,加上 `uni.getStorage` 启动恢复。

### H5

- localStorage 存 token,**httpOnly cookie 优先**(后续考虑)
- 注意 XSS 风险

---

## 十、常见问题

### Q: token 过期了用户体验怎样?
A: 前端 axios 拦截器统一处理:
1. 收到 401 → 自动调 refresh
2. refresh 也失败 → 跳到登录页 + 提示"登录已过期"

### Q: 用户卸载小程序后再装回来,数据还在?
A: 在,因为后端通过 `wx_openid` 识别用户。

### Q: 用户换手机怎么办?
A: 微信 unionid 跨设备不变(同主体小程序),自动识别。

### Q: 多设备同时登录?
A: 允许,不强制下线其他设备。需要"设备列表 + 一键下线"时再做。

---

## 十一、待办

- [ ] 实现 Wx 开放平台 APP 登录
- [ ] 接入腾讯云短信
- [ ] 管理后台 2FA
- [ ] 设备列表管理(后期)
- [ ] 风控:同 IP 多账号 / 异常登录提醒
