# 常见问题 FAQ

> 踩坑指南。新人遇到的问题 80% 在这里。**遇到没收录的问题,解决后请 PR 加进来**。

---

## 一、环境 / 启动

### Q: `npm install` 卡在 sharp / node-gyp

A: 国内网络问题,加镜像:
```bash
npm config set sharp_binary_host_mirror https://npmmirror.com/mirrors/sharp
npm config set sharp_libvips_binary_host_mirror https://npmmirror.com/mirrors/sharp-libvips
npm install
```

### Q: 启动后端报 `Error: connect ECONNREFUSED 127.0.0.1:3306`

A: MySQL 没启动。
```bash
docker ps
docker start pig-mysql
```

### Q: 启动后端报 `JWT_SECRET must be at least 32 characters`

A: `.env.development` 里的 `JWT_SECRET` 太短,改长:
```env
JWT_SECRET=local_dev_secret_at_least_32_characters_xxxxxx
```

### Q: 启动后端报 `Cannot find module '...'`

A: 装错地方了。在仓库根目录:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Q: 启动小程序 `pages.json:5 路径不存在`

A: `pages.json` 引用的页面文件还没创建,或路径写错了。删掉 `pages.json` 里那条配置,或者建文件。

---

## 二、数据库

### Q: 跑迁移报 `Cannot read property 'driver' of undefined`

A: TypeORM 配置没读到 `.env`。检查启动时是否传了正确的 `NODE_ENV`,或 `.env.development` 是否存在。

### Q: `Table 'pig.users' doesn't exist`

A: 还没跑迁移。
```bash
cd backend
npm run migration:run
```

### Q: 改了 entity 文件后,如何更新表结构?

A: 生成迁移文件 + 跑:
```bash
npm run migration:generate -- src/database/migrations/YourChangeName
npm run migration:run
```

**不要**直接在生产改表结构;不要在生产开 `DB_SYNCHRONIZE=true`(会自动 alter,可能毁数据)。

### Q: 想重置本地数据库

A:
```bash
docker exec pig-mysql mysql -uroot -plocal_dev_pass -e 'DROP DATABASE pig; CREATE DATABASE pig CHARACTER SET utf8mb4'
cd backend && npm run migration:run && npm run seed:dev
```

或者一键脚本:
```bash
npm run db:reset    # 已封装上述步骤
```

### Q: 锁等待 / 死锁

A: 看 InnoDB 状态:
```sql
SHOW ENGINE INNODB STATUS\G
```

如果有死锁,看 `LATEST DETECTED DEADLOCK` 段,找触发的两个事务。

---

## 三、Redis

### Q: Pub/Sub 收不到消息

A: Redis 6+ Pub/Sub 用 listener 模式,确认 client 库版本。或用 BullMQ 替代(基于 list,可持久化)。

### Q: `Connection lost`

A: Redis 容器挂了:
```bash
docker logs pig-redis --tail 50
docker restart pig-redis
```

或网络问题。线上要配重连:
```ts
redis.on('error', err => logger.error({ msg: 'redis err', err }));
```

---

## 四、认证 / JWT

### Q: 接口返回 401(token 无效)

A: 排查顺序:
1. Header 是否带了 `Authorization: Bearer xxx`(注意 `Bearer ` 后面有空格)
2. token 是否过期(JWT 默认 2 小时),试 `/auth/refresh`
3. JWT_SECRET 是否变了(本地改 .env 之后,老 token 失效)
4. token 是否在黑名单(logout 过)

### Q: 前端拿到 token 但接口还是 401

A: 八成是 token 没存对。看 `uni.getStorageSync('access_token')` 是不是空的。

### Q: 微信 wx.login 报 `code is invalid`

A: code 只能用一次,且 5 分钟过期。前端如果重复调,会失败。每次重新 `wx.login()`。

---

## 五、微信小程序

### Q: 控制台报 `request:fail url not in domain list`

A: 微信开发者工具 → 详情 → 本地设置 → 勾「不校验合法域名」。

### Q: 真机预览 / 体验版 接口报错

A: 体验版受微信限制,**必须**用 https + 已备案域名。本地 `http://127.0.0.1` 在手机上访问不到。
方案:
- 用 staging 环境域名
- 或开 ngrok 临时穿透

### Q: tabBar 图标不显示

A:
- 路径必须以 `static/` 开头(不带 `/`)
- 图标尺寸 81x81 px 推荐
- 必须是 `png`(不能 svg)

### Q: 编译产物体积超限(超 2MB 主包)

A: 分包:
```json
{
  "subPackages": [
    { "root": "pages/order", "pages": [...] }
  ]
}
```

或图片改用 CDN(static/ 里的图都进主包)。

---

## 六、APP

### Q: HBuilderX 真机调试连不上

A:
1. 手机和电脑在同一 WiFi
2. 关闭电脑防火墙
3. `.env.development` 里 `VITE_API_BASE` 改成电脑局域网 IP(`http://192.168.x.x:3000/api`)

### Q: APP 微信登录提示「该应用未配置」

A: `manifest.json` 里的 `weixin.appid` 必须是**开放平台**的 AppID(以 `wx` 开头但与小程序不同),且要在微信开放平台配置 UniversalLinks(iOS)+ 签名(Android)。

### Q: Android 真机有黑边

A: `manifest.json` → `app-plus` → 关闭 `splashscreen.alwaysShowBeforeRender` 或换 9 patch 图。

---

## 七、支付

### Q: 微信支付回调收不到

A:
1. 检查微信商户后台「商户中心 → 产品中心 → 开发配置 → 支付回调」是否填了 `https://www.rockingwei.online/api/pay/wx-notify`
2. 该 URL 必须 80/443 可访问
3. 看后端日志,有没有"签名失败"
4. 用 `/api/debug/wx-pay/notify` 手动模拟测

### Q: 验签老是失败

A: 99% 是 API 密钥配错了,或回调用的是新 v3 但代码按 v2 验。**统一用 v3**(`WechatPay-V3` 签名)。

---

## 八、文件上传

### Q: 上传 5MB 以上文件报 `Payload Too Large`

A: nginx 默认 1MB:
```nginx
client_max_body_size 20m;
```

NestJS 也要配:
```ts
app.use(json({ limit: '20mb' }));
```

### Q: 上传后图片访问 403

A: 文件权限问题:
```bash
chmod -R 755 backend/uploads
chown -R www-data:www-data /opt/pig/shared/uploads  # 生产
```

---

## 九、部署

### Q: 部署后 nginx 502

A:
- 后端没起来:`pm2 list` 看进程,`pm2 logs pig-backend --lines 200`
- 端口冲突:`ss -tlnp | grep 3000`
- nginx 配置错:`sudo nginx -t`

### Q: HTTPS 证书过期了

A: certbot 应该自动续期。手动续:
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Q: 部署后报 `Cannot find module 'xxx'`

A: 部署脚本里 `npm install` 跑了吗?检查 `package-lock.json` 是否最新。

---

## 十、性能 / 报错

### Q: 接口慢(> 1s)

A: 排查顺序:
1. 日志看 `duration_ms`
2. 是不是 N+1 查询(打开 `DB_LOGGING=true` 看 SQL)
3. Redis 是否在用
4. 索引是否生效(`EXPLAIN SELECT ...`)

### Q: 进程内存涨到 1GB+ 然后挂

A: 八成是没释放的资源(connection / stream)。`max_memory_restart` 兜底:
```js
// ecosystem.config.js
max_memory_restart: '512M'
```

但根因要找。

---

## 十一、Git / CI

### Q: push 报 `credential-manager-core is not a git command`

A: Windows Git 凭据管理器问题,**无害,push 实际成功了**。要清干净:
```bash
git config --global --unset credential.helper
```
然后重装 Git for Windows,选默认凭据管理器。

### Q: CI 失败 `ESLint error`

A: 本地跑一遍 `npm run lint`,大多数能自动 fix:`npm run lint -- --fix`

### Q: 合并冲突

A: 不要 force push 解决!:
```bash
git fetch origin
git rebase origin/main
# 解决冲突
git add .
git rebase --continue
git push --force-with-lease    # 用 with-lease 而不是 force,更安全
```

---

## 十二、特别坑(已知)

### 1. `class-validator` 0.14 → 0.15 改了 `@IsString` 行为

A: 已锁定 0.14,不要升。

### 2. uni-app + Vue 3 + Pinia 在小程序里需要特殊配置

A: 见 `frontend/src/main.ts` 已配置好,**别动**。

### 3. NestJS 10 + class-transformer 5

A: 加 `transform: true` 才会触发类型转换。已在 `main.ts` 全局 pipe 配好。

---

## 十三、给"完全卡住了"的人

按这个顺序问:

1. **你的报错是什么?**(完整堆栈,不要截图截一半)
2. **复现步骤?**(从打开终端开始,一行一行)
3. **trace_id 是什么?**(后端日志里能找到)
4. **本地 vs 服务器?**(很多问题是环境差异)

把这 4 个写到 GitHub Issue 里,人均 30 分钟内能帮到你。

---

## 十四、贡献本 FAQ

发现一个新问题 + 解决 → 提 PR 加到对应章节:

```markdown
### Q: 你的问题

A: 你的解决方案。
```

写在最相关的章节。不要新增章节(除非有 3 个以上同类)。
