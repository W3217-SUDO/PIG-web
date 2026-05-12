# 🚀 部署 Runbook(实战手册)

> 本文 = **跟随我操作**级别的部署指南。第一次部署 2026-05-12 已成功跑通,本文沉淀经验。
>
> 上游 → [`../ROADMAP.md`](../ROADMAP.md) · 服务器现状 → [`../snapshot/server.md`](../snapshot/server.md)

---

## 0. 一句话部署流程

```bash
# 后端 (服务器侧)
ssh pig 'bash -s' < infra/deploy/backend.sh

# H5 (本地侧)
bash infra/deploy/h5.sh
```

---

## 1. 前置一次性配置

### 1.1 服务器侧已就绪(W0 + 2026-05-12 部署日确认)

- ✅ `ssh pig` 连得上(`ubuntu` 用户 + 免密 sudo)
- ✅ MySQL 8 + Redis 7 + Node 20 + PM2 + nginx + certbot 装好
- ✅ 域名 `www.rockingwei.online` ICP 备案 + HTTPS 证书自动续期
- ✅ `/opt/pig/{releases,shared,logs,backups}` 目录就位
- ✅ `/opt/pig/shared/.env.production` 已存在,关键字段填充(DB / Redis / JWT / WX_MP_APPID)
- ✅ nginx `/api/` 反代到 `127.0.0.1:3000`(已修 `proxy_pass` 末尾的 `/`)

### 1.2 GitHub Deploy key(推荐但**可选**)

服务器 `~/.ssh/github-deploy(.pub)` 已生成,**但还没加到 GitHub**。
HTTPS clone 在国内有 GFW 干扰,deploy script 已加 3 次重试兜底。但建议:

```bash
# 看公钥
ssh pig 'cat ~/.ssh/github-deploy.pub'
# 复制 → GitHub → Settings → Deploy keys → Add deploy key
# 填:Title: pig-prod-deploy / Key: 粘贴 / 不勾允许写
```

之后部署改 SSH clone(脚本已优先尝试 SSH,失败回退 HTTPS)。

---

## 2. 后端部署详解

### 2.1 跑脚本

```bash
ssh pig 'bash -s' < infra/deploy/backend.sh
```

### 2.2 脚本做了什么

| 步 | 内容 |
|---|---|
| 1 | clone 代码到 `/opt/pig/releases/<时间戳>/`(SSH 优先,HTTPS 兜底重试 3 次) |
| 2 | 复制 `/opt/pig/shared/.env.production` 到 release/backend/(**复制不软链**,cluster mode 兼容) |
| 3 | `npm install`(workspaces 一次装根 + backend + frontend 全部) |
| 4 | `NODE_ENV=production npm run build`(NestJS 编译 → dist/) |
| 5 | `npm run migration:run`(增量,只跑新 migration) |
| 6 | PM2 **fork 模式** 启动(`-i 1` cluster 模式与 NestJS ConfigModule 有 cwd 兼容问题) |

### 2.3 验证

```bash
# 本机 :3000
ssh pig 'curl -s http://127.0.0.1:3000/api/health'

# 公网
curl -s https://www.rockingwei.online/api/health
```

期望:`{"code":0,"data":{"status":"ok","db":"ok","redis":"ok","env":"production"}}`

### 2.4 回滚到上一个 release

```bash
ssh pig 'bash -s' << 'EOF'
PREV=$(ls -dt /opt/pig/releases/*/ | sed -n '2p' | sed 's|/$||')
echo "回滚到: $PREV"
ln -sfn "$PREV" /opt/pig/current
pm2 delete pig-backend
NODE_ENV=production pm2 start "$PREV/backend/dist/main.js" \
  --name pig-backend --cwd "$PREV/backend" \
  --log /opt/pig/logs/pig-backend.log --time
pm2 save
EOF
```

回滚 < 10 秒就绪。**migration 没法自动回滚**(`migration:revert` 一次只回一条,且要看是否兼容)。

---

## 3. H5 部署详解

### 3.1 跑脚本(本地)

```bash
bash infra/deploy/h5.sh
```

### 3.2 脚本做了什么

| 步 | 内容 |
|---|---|
| 1 | 本地 `npm run build:client:h5`(uni-app build,读 `frontend/.env.production` 注入 API base) |
| 2 | scp 产物到服务器 `/tmp/pig-h5-new/` |
| 3 | 服务器侧备份 `/var/www/html/pig/` → `pig-h5-bak-<时间戳>` |
| 4 | 替换 `/var/www/html/pig/` 为新 build |
| 5 | 修复 `www-data` 所有权 |
| 6 | 清理 7 天前的旧备份(保留最近 7 份) |

### 3.3 验证

浏览器开 [https://www.rockingwei.online/](https://www.rockingwei.online/),应该看到:
- Hero(暗红渐变,灯笼,大标题"认一头猪/过一个年")
- 三大主张横滑
- 直播 + 农户混排
- 4 步流程
- 拼猪长块
- **挑你的猪**(4 张真实猪卡,数据来自生产 API)
- 关于我们 / 信任带 / 红色 CTA / 底部假 Tabbar

### 3.4 回滚 H5

```bash
ssh pig 'sudo bash -s' << 'EOF'
LATEST_BAK=$(ls -dt /var/www/html/pig-h5-bak-*/ 2>/dev/null | head -1)
echo "回滚 H5 到: $LATEST_BAK"
rm -rf /var/www/html/pig/*
cp -r "$LATEST_BAK"/* /var/www/html/pig/
chown -R www-data:www-data /var/www/html/pig
EOF
```

---

## 4. 第一次部署踩过的坑(2026-05-12 当日实录)

### 坑 1:GitHub HTTPS clone GFW 干扰

`fatal: unable to access ...: GnuTLS recv error (-110)`

**解**:加 `http.postBuffer=524288000` + 重试 3 次。脚本已加。
长期方案:Deploy key 走 SSH,绕开 HTTPS。

### 坑 2:PM2 cluster mode + NestJS ConfigModule cwd 错位

报错:`Config validation error: "JWT_SECRET" is required`

实际上 `.env.production` 软链好好的,但 PM2 cluster mode 给 worker 进程的 `process.cwd()` 不是 `--cwd` 设的值,dotenv 找不到 `./env.production`。

**解**:
- 用 **fork** 模式(`pm2 start ... --time`,不加 `-i 1` 或加 `--exec-mode fork`)
- 用**复制**代替软链(防止某些情况下 cluster 解析软链失败)

### 坑 3:nginx `proxy_pass` 末尾 `/` 剥前缀

原配置:`proxy_pass http://127.0.0.1:3000/;` ← 末尾 `/`

请求 `/api/health` 会被剥 `/api/` 转发为 `/health` → NestJS 路由(globalPrefix 'api')找不到 → 404。

**解**:去掉末尾 `/`:`proxy_pass http://127.0.0.1:3000;`

### 坑 4:dev-login 在生产被强制禁用

`auth.controller.ts` 里有 `if NODE_ENV === 'production' throw`。

生产环境无法测登录态接口,直到:
- 拿到 AppSecret + 配 nginx 域名白名单
- 真实小程序 `wx-login` 走通

**预期行为,不是坑**——是安全设计。

### 坑 5:生产库初始空,前端不显示猪

新部署 MySQL pig 库只有 13 张表(migration 跑完),没数据。

**临时解**:服务器跑一次 seed(绕过 production guard,见下)。
**长期解**:运营按 [`admin-sop.md`](./admin-sop.md) 录真实猪数据。

```bash
ssh pig 'cd /opt/pig/current/backend && set -a; source .env.production; set +a; \
  NODE_ENV=development npx ts-node src/database/seeds/dev.seed.ts'
```

---

## 5. 监控(等 W3 Sentry 接入前的临时观察)

```bash
# 进程
ssh pig 'pm2 list'
ssh pig 'pm2 logs pig-backend --lines 50 --nostream'

# 系统
ssh pig 'df -h / ; free -h ; uptime'

# nginx
ssh pig 'sudo tail -50 /var/log/nginx/rockingwei.error.log'
ssh pig 'sudo tail -50 /var/log/nginx/rockingwei.access.log'

# MySQL 连接数
ssh pig 'mysql -uroot -p"$(grep MYSQL_ROOT_PASS ~/.pig-secrets | cut -d= -f2)" -e "SHOW STATUS LIKE \"Threads_connected\";"'
```

---

## 6. CI/CD(GitHub Actions,W2 实跑前)

仓库已有 `.github/workflows/deploy-backend.yml`(见 W0 commit `a02ff7a`)。

**未实跑验证**——push 到 main 后会触发,但当前未配 secrets:
- `SSH_PRIVATE_KEY`(`ubuntu@pig` 的部署私钥)
- `SSH_KNOWN_HOSTS`(已知主机指纹)

配齐后 push → Actions 自动跑 `infra/deploy/backend.sh`。W2 Phase S 必做。

---

## 7. 上线 checklist(W3 前补完)

- [ ] Sentry DSN 配 `.env.production`
- [ ] pm2 ecosystem.config.js(cluster × 2,但 NestJS 兼容性踩坑见 §4 坑 2)
- [ ] nginx 加访问日志 / 错误日志 logrotate
- [ ] MySQL 每日自动备份(cron 0 3 * * * mysqldump → `/opt/pig/shared/backups/`)
- [ ] Redis 数据 AOF 开启(已配,见 docker-compose.yml,但生产是裸装 Redis 7,要确认 conf)
- [ ] 设 fail2ban 防 SSH 爆破
- [ ] 服务器升级到 8G 内存(灰度流量 > 50 在线时)

---

## 链接

- 服务器现状 → [`../snapshot/server.md`](../snapshot/server.md)
- 服务器详细手册 → [`../01-getting-started/server-setup.md`](../01-getting-started/server-setup.md)
- 运营 SOP → [`./admin-sop.md`](./admin-sop.md)
- CI/CD workflows → `.github/workflows/`
