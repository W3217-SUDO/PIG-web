# 服务器现状盘点

> 这台服务器**不是新装的**——基础设施都装好了。本文档让新开发者快速了解服务器上有什么、密码在哪、出问题找哪里。

---

## 服务器基础

| 项 | 值 |
|---|---|
| **IP** | `175.24.175.123` |
| **云厂商** | 腾讯云 |
| **系统** | Ubuntu 24.04 LTS |
| **SSH 用户** | `ubuntu`(免密 sudo) |
| **SSH 别名** | `pig`(本地 `~/.ssh/config` 配过即可 `ssh pig`) |
| **配置规格** | 2C4G(轻量应用服务器,具体看腾讯云控制台) |
| **域名** | `www.rockingwei.online` / `rockingwei.online`(都已 DNS 解析 + ICP 备案 + HTTPS) |

---

## 已安装的服务

| 服务 | 版本 | 状态 | 用途 |
|---|---|---|---|
| nginx | 1.24.0 | `systemctl status nginx` | 反代 + 静态托管 + HTTPS |
| Node.js | 20.20.2 | `node -v` | 后端运行时 |
| MySQL | 8.0 | `systemctl status mysql` | 主数据库 |
| Redis | 7.x | `systemctl status redis-server` | 缓存 + 会话 + 任务队列 |
| PM2 | 最新 | `pm2 list`(ubuntu 用户下) | Node 进程守护 |
| certbot | 最新 | `which certbot` | Let's Encrypt 证书 + 自动续期 |

---

## 关键路径

| 路径 | 内容 |
|---|---|
| `/opt/pig/` | 后端部署根目录(所有 release 进这里) |
| `/opt/pig/releases/` | 历史版本(每次发版一个时间戳子目录) |
| `/opt/pig/shared/` | 跨版本共享:uploads/ logs/ .env.production |
| `/opt/pig/logs/` | 应用日志(PM2 写) |
| `/var/www/html/pig/` | 静态原型(www.rockingwei.online 根目录) |
| `/etc/nginx/sites-enabled/rockingwei.online` | nginx 站点配置(已 HTTPS) |
| `/etc/letsencrypt/live/www.rockingwei.online/` | SSL 证书 |
| `~/.pig-secrets` | 数据库 / Redis / 第三方密钥(**只放在服务器,不入仓**) |

---

## 凭据(`~/.pig-secrets`)

`ssh pig` 后:`cat ~/.pig-secrets`

包含:
```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_ROOT_USER=root
MYSQL_ROOT_PASS=...
MYSQL_DATABASE=pig
MYSQL_APP_USER=pig_app
MYSQL_APP_PASS=...

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASS=...

# 后续会加:
# JWT_SECRET
# WX_MP_APPID / WX_MP_SECRET
# 七牛/腾讯云 OSS 密钥
# 微信支付密钥
```

> ⚠️ **密钥泄露应急流程** → [`../03-backend/security.md#密钥轮换`](../03-backend/security.md)

---

## 防火墙 / 安全组

腾讯云控制台 → 安全组,当前已开:

| 端口 | 协议 | 来源 | 用途 |
|---|---|---|---|
| 22 | TCP | 0.0.0.0/0 | SSH(建议加 IP 白名单) |
| 80 | TCP | 0.0.0.0/0 | HTTP(自动跳 HTTPS) |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 3306 | TCP | **只允许本机** | MySQL(不对外) |
| 6379 | TCP | **只允许本机** | Redis(不对外) |
| 3000 | TCP | **只允许本机** | NestJS(经 nginx 反代,不对外) |

> ⚠️ 任何把数据库 / Redis / 应用端口对公网开放的操作,**严格禁止**

---

## 域名 / HTTPS

| 域名 | 用途 | 证书 |
|---|---|---|
| `www.rockingwei.online` | 主站(用户访问) | Let's Encrypt(自动续期 90 天) |
| `rockingwei.online` | 裸域,同上 | 同 |

nginx 路由规则:
- `/` → 静态原型 `/var/www/html/pig/`
- `/api/` → 反代到 `127.0.0.1:3000`(NestJS)
- `/ws/` → WebSocket 反代

证书续期检查:
```bash
ssh pig 'sudo certbot certificates'
ssh pig 'sudo systemctl status certbot.timer'  # 自动续期任务
```

---

## PM2 进程管理

```bash
# 查看所有 Node 进程
ssh pig 'pm2 list'

# 看后端日志
ssh pig 'pm2 logs pig-backend --lines 100'

# 重启
ssh pig 'pm2 restart pig-backend'

# 监控面板(本机访问)
ssh pig 'pm2 monit'
```

**进程命名规范**:
- `pig-backend` — 主 API
- `pig-worker` — 后台任务(后续添加)

---

## 常见运维操作

### 看实时日志

```bash
ssh pig 'tail -f /opt/pig/logs/app.log'
```

### 看 nginx 错误日志

```bash
ssh pig 'sudo tail -f /var/log/nginx/rockingwei.error.log'
```

### 数据库备份(每日定时,后续配置)

```bash
ssh pig 'mysqldump -uroot -p$(grep MYSQL_ROOT_PASS ~/.pig-secrets | cut -d= -f2) pig > /opt/pig/backups/pig-$(date +%Y%m%d).sql'
```

### 重启所有服务

```bash
ssh pig 'sudo systemctl restart nginx mysql redis-server && pm2 restart all'
```

---

## 监控(待补充)

- 当前只有 PM2 自带的进程监控
- 后续要加:
  - 应用监控(后续补充,Prometheus/Sentry)
  - 数据库慢查询日志
  - nginx access_log 解析

详见 → [`../06-deployment/monitoring.md`](../06-deployment/monitoring.md)

---

## 出问题找谁

| 问题类型 | 怎么处理 |
|---|---|
| API 报 500 | 看 `/opt/pig/logs/app.log` |
| 网站打不开 | 看 nginx `error.log` + 检查 `pm2 list` |
| 证书过期 | `sudo certbot renew --force-renewal` |
| 磁盘满 | `df -h` → 清 `/opt/pig/logs/` 旧日志 + 老 release |
| MySQL 连接被拒 | 查 `~/.pig-secrets` 密码 + `systemctl status mysql` |
| 服务器被入侵嫌疑 | **立即** `sudo last`、`sudo netstat -anp` 看异常 + 联系 owner |
