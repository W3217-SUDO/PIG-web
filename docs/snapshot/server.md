# 🖥 服务器现状快照

> **5 分钟知道生产服务器跑着啥。** 最后更新:2026-05-11
>
> 详细操作指引(凭据格式、SSH 配置、SOP 等)→ [`../01-getting-started/server-setup.md`](../01-getting-started/server-setup.md)(权威源)
> 本文只做**速读概览**。

---

## 1. 服务器一句话

腾讯云 CVM `175.24.175.123`(Ubuntu 24.04),已装 Node 20 / MySQL 8 / Redis 7 / nginx 1.24 / PM2 + HTTPS,域名 `www.rockingwei.online` 已 ICP 备案。

---

## 2. SSH 接入

```bash
ssh pig                    # 本地 ~/.ssh/config 配过别名后,一键登录
```

| 项 | 值 |
|---|---|
| IP | `175.24.175.123` |
| 端口 | 22 |
| 用户 | `ubuntu`(免密 sudo) |
| 别名 | `pig` |
| 私钥 | 本地 `~/.ssh/pig` |

> ⚠️ Ubuntu 镜像默认 `PermitRootLogin no`,用 `root` 登录会握手早期被关。**只能用 `ubuntu`**。

---

## 3. 已装服务速览

| 服务 | 版本 | 监听 | systemd unit |
|---|---|---|---|
| nginx | 1.24.0 | `0.0.0.0:80 / 443` | `nginx` |
| Node.js | 20.20.2 | — | — |
| MySQL | 8.0.45 | `127.0.0.1:3306` | `mysql` |
| Redis | 7.0.15 | `127.0.0.1:6379` | `redis-server` |
| PM2 | 7.0.1 | — | `pm2-ubuntu`(开机自启) |
| certbot | latest | — | `certbot.timer`(自动续期) |

> 业务接口走 HTTPS,MySQL / Redis **只监听 127.0.0.1**,外网无法访问。

---

## 4. 关键路径速览

| 路径 | 内容 |
|---|---|
| `/opt/pig/releases/<ts>/` | 每次发版的时间戳子目录 |
| `/opt/pig/shared/` | 跨版本共享(`.env.production` / `uploads/`) |
| `/opt/pig/logs/` | PM2 应用日志 |
| `/var/www/html/pig/` | 静态原型(`www.rockingwei.online` 根) |
| `/etc/nginx/sites-enabled/rockingwei.online` | nginx 站点配置 |
| `/etc/letsencrypt/live/www.rockingwei.online/` | SSL 证书 |
| `~/.pig-secrets` | **密钥唯一来源(永不入库)** |

---

## 5. 数据库

| 项 | 值 |
|---|---|
| MySQL 库 | `pig`(utf8mb4 / utf8mb4_unicode_ci) |
| 应用账户 | `pig_app@localhost`(仅 `pig.*` 全权限) |
| root | `root@localhost`(强密码,见 `~/.pig-secrets`) |
| Redis | 已设 `requirepass`,bind 127.0.0.1 |

---

## 6. 凭据获取

```bash
ssh pig "cat ~/.pig-secrets"
```

包含:`MYSQL_*` / `REDIS_*`(+ 后续 `WX_*` / `SENTRY_*` 等)。
**绝不复制到聊天 / 邮件 / 文档**;后端项目从此文件派生 `.env.production`,不写死代码。

---

## 7. 防火墙

| 层 | 状态 |
|---|---|
| UFW | **inactive**(避免双层防火墙混淆) |
| 腾讯云安全组 | 入向控制完全在此 — 22 / 80 / 443 开放 |

---

## 8. 不要碰的腾讯云组件

- `tat_agent.service` — 腾讯云自动化助手(控制台批量命令依赖) - `openclaw-gateway` + `/root/.openclaw/` — 腾讯云主机安全(云镜) - 删除 / 停用 → 控制台告警 + 主机安全失效

---

## 9. 容量与成本

| 项 | 当前 | 升级触发 |
|---|---|---|
| CPU | 4 vCPU Xeon 8255C | 持续 > 70% / 5 分钟 |
| 内存 | 3.6 GB(已用 ~1.5 GB) | 持续 > 85% |
| 磁盘 | 40 GB(已用 ~10 GB) | > 80% |
| swap | 4 GB(`/swapfile`) | — |

升级方案:腾讯云控制台升 8G 内存 + 独立 RDS。详见 [`../ROADMAP.md`](../ROADMAP.md) §8。

---

## 10. 已知坑

| 坑 | 后果 | 解 |
|---|---|---|
| 用 `root` SSH 登录 | 握手早期被关 | 必须用 `ubuntu` |
| Claude Code 沙箱出口 IP `129.146.23.189`(Oracle Cloud) | 安全组限源时连不上 | 用户加白,或全开 22(已是) |
| 双 swap 文件 | 占 10GB(已修) | 保留 `/swapfile` 4GB |

---

## 维护

- 本文档**只做概览**——具体操作步骤、SOP、应急流程在 `01-getting-started/server-setup.md`
- 改这里的 PR 必须同步改权威文档(或反之)
- 装新服务 / 改部署结构 → 更新本文档 §3

---

## 链接

- 详细服务器手册 → [`../01-getting-started/server-setup.md`](../01-getting-started/server-setup.md)
- 部署运维 → [`../06-deployment/`](../06-deployment/)
- 监控与告警 → [`../06-deployment/monitoring.md`](../06-deployment/monitoring.md)
- 项目状态 → [`./project.md`](./project.md)
