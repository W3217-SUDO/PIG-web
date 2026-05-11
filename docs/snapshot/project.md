# 🐷 项目状态快照

> **新人 5 分钟读完知道这个项目在哪里。** 最后更新:2026-05-11

---

## 1. 项目一句话

**私人订猪(PIG)** —— 城市家庭代养土猪平台,三端(小程序 / APP / H5)同源 + 管理后台 + 后端 API。

> 「认一头猪 · 过一个年」—— 详细产品定位见 [`../00-overview/product.md`](../00-overview/product.md)

---

## 2. 代码仓库

| 项 | 值 |
|---|---|
| 本地工作区 | `C:\Users\13533\Desktop\PIG\`(Owner 主开发机) |
| GitHub | [github.com/W3217-SUDO/PIG-web](https://github.com/W3217-SUDO/PIG-web)(public) |
| 默认分支 | `main` |
| 当前版本 | `v0.2.0` + `[Unreleased]` (路线图制定阶段) |
| 仓库类型 | **Monorepo**(npm workspaces) |

### 顶层目录

```
PIG-web/
├── backend/              NestJS API
├── frontend/             uni-app 三端
├── admin/                Vue3 + Vite 管理后台(待建,v1 砍)
├── infra/                docker-compose 等基础设施
├── docs/                 全部技术文档(本文夹也在这里)
├── .github/              PR/Issue 模板 + Actions
├── .editorconfig / .nvmrc / .gitignore / tsconfig*
├── package.json          根 workspaces 入口
├── package-lock.json
├── docker-compose.yml    本地 dev(MySQL + Redis)
├── CHANGELOG.md
└── README.md
```

---

## 3. 技术栈(已拍板)

| 层 | 选型 | 状态 |
|---|---|---|
| 客户端 | **uni-app** + Vue 3 + TS + Pinia + Vite | 骨架就绪 |
| 后端 | **NestJS** + TypeORM + Pino | 骨架就绪 |
| 数据库 | **MySQL 8.0** + **Redis 7** | 已装(本机) |
| 反向代理 | nginx 1.24 + Let's Encrypt | 已装 + 已 HTTPS |
| 进程管理 | PM2 cluster | 已装(单实例) |
| CI/CD | GitHub Actions → SSH 部署 | workflow 就绪,**实跑未验** |
| 监控 | Sentry + pino + 飞书机器人 | 计划接入(W3) |
| 包管理 | npm workspaces(根)→ 单仓共享 lockfile | 已就绪 |

详细选型理由 → [`../02-architecture/tech-stack.md`](../02-architecture/tech-stack.md)

---

## 4. 当前进度(节点)

### ✅ 已完成(v0.1.0 + v0.2.0)

- 本地 git + GitHub 远端 + 完整 Monorepo 骨架
- 文档体系 8 章 26 篇 + 总路线图 + W1/W2/W3 任务 + TASKS 总清单
- 服务器全套环境就位(Node20 / MySQL8 / Redis7 / nginx / PM2 / HTTPS)
- 后端 NestJS 骨架 + 5 张核心表 + JWT + dev-login
- uni-app 前端骨架 + H5 跑通 + 微信登录占位
- 域名 + Let's Encrypt + nginx 反代 + 80→443

### 🚧 进行中(2026-05-11 → 2026-05-31 · 21 天冲刺)

**目标**:5/31 微信小程序灰度上线 + APP 内测包就绪

里程碑:
- W1(5/12-5/18)· 后端业务核心(user/pig/order/wallet/share)+ 前端 6 页 H5 跑通
- W2(5/19-5/25)· 微信支付 + 完整 UI + 小程序提审
- W3(5/26-5/31)· 审核回归 + 灰度发布 + APP 打包

详细任务追踪 → [`../TASKS.md`](../TASKS.md)
战略与风险 → [`../ROADMAP.md`](../ROADMAP.md)

### ⏸️ v1 砍掉 / 推迟到 v1.5(6 月起点)

- 拼猪完整版(成员管理 / 权限隔离)
- 实时直播 (v1 用预录视频占位)
- 喂养 / 健康打卡(v1 用 mock seed)
- GUI 管理后台(v1 用 Navicat + SOP)
- iOS App Store 上架(v1 仅 TestFlight 内测)
- 短信登录
- 保险产品

完整 v1.5 储备清单 → [`../TASKS.md`](../TASKS.md) §7

---

## 5. 团队分工(2 人小团队)

| 角色 | 主战场 |
|---|---|
| **后端 + 部署** | `backend/` + 服务器运维 |
| **前端 + 设计** | `frontend/` + UI 调整 |
| **共同维护** | `docs/` + `db/migrations/` + API 契约 |
| **Owner(合规)** | 微信小程序帐号 + 商户号 + ICP + 资质 |

详细分支策略与 PR 规范 → [`../07-contribution/workflow.md`](../07-contribution/workflow.md)

---

## 6. 关键约定 / 注意事项

### 6.1 凭据

- **绝不入库**:`.env*`(除 `.env.example`)、`*.pem`、`*.key`、`config/secrets.*`
- 服务器密钥统一存 `/home/ubuntu/.pig-secrets`(mode 600,详见 [`server.md`](./server.md))
- 任何泄露 → 立即 rotate

### 6.2 部署目标

- 唯一生产环境:腾讯云 `175.24.175.123`(详见 [`server.md`](./server.md))
- 域名 `www.rockingwei.online`(已 ICP 备案 + HTTPS)
- 部署目录 `/opt/pig/`(release 时间戳子目录 + symlink)

### 6.3 不要做的事(产品克制清单)

详见 [`../00-overview/product.md`](../00-overview/product.md) §8。最重要的:
- 不做"拼猪账本中介"(分肉分钱用户自理)
- 不做现成猪肉销售
- 不接受未实名农户合作

---

## 7. 历史里程碑

| 版本 | 日期 | 关键事件 |
|---|---|---|
| `0.1.0` | 2026-05-09 | 项目初始化 + 服务器基础设施 + HTML 原型 |
| `0.2.0` | 2026-05-11 | Monorepo + 文档体系 + 后端骨架 + JWT + uni-app + nginx HTTPS |
| `1.0.0` 计划 | 2026-05-31 | 微信小程序灰度上线 + APP 内测 |

完整变更日志 → [`../../CHANGELOG.md`](../../CHANGELOG.md)

---

## 维护

- 本文档**重大节点更新**(发版 / 削范围 / 技术栈变更)
- 不写实施细节(那是各专题文档的事)
- 改这个文件的 PR 必须同步更新对应区段(例如发版要更新 §7)

---

> 📖 看完这页应该:**知道 PIG 是什么、技术栈选了什么、现在到哪步、5/31 要交付什么**。
> 想看下一步具体做什么 → [`../TASKS.md`](../TASKS.md)
