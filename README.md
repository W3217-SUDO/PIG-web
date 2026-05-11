# 私人订猪 PIG · 项目主仓

> 「认一头猪 · 过一个年」—— 城市家庭代养土猪平台,三端(小程序 / APP / H5)同源 + 管理后台 + 后端 API,**单仓 Monorepo** 协作开发。

🌐 **线上原型**:[https://www.rockingwei.online/](https://www.rockingwei.online/)
🐷 **GitHub**:[github.com/W3217-SUDO/PIG-web](https://github.com/W3217-SUDO/PIG-web)
🖥 **服务器**:腾讯云 `175.24.175.123`(Ubuntu 24.04,SSH 别名 `pig`)

---

## 一句话产品定位

> 用户在 App 上"认领"一头猪仔 → 川北山区农户代养 10–12 个月 → 腊月出栏送到家。**我们不是卖肉的,是替你养猪的**——所以没动机给你的猪用催肥饲料、抗生素。全程 24h 直播 + 每餐打卡 + 健康档案。**两三家可拼一头猪**,主认领人持分享码邀请,大家共看共养,分肉自家商量。

---

## 仓库目录结构

```
PIG-web/
├── backend/              # 后端 NestJS API(Node 20 + MySQL 8 + Redis 7)
├── frontend/             # uni-app 客户端(同源编译小程序 / APP / H5)
├── admin/                # 管理后台(Vue3 + Vite,桌面端) ── 后续添加
├── docs/                 # 项目文档(开发者必读)
│   ├── 00-overview/      #   产品定位 / 名词表
│   ├── 01-getting-started/ # 环境搭建 / 本地启动 / 服务器现状
│   ├── 02-architecture/  #   架构 / 技术栈 / 目录约定
│   ├── 03-backend/       #   后端模块 / API / DB / Auth / Logging / Security
│   ├── 04-frontend/      #   前端开发指南(小程序 / APP / H5)
│   ├── 05-debugging/     #   调试接口 / Postman / FAQ
│   ├── 06-deployment/    #   CI/CD / 发版 / 监控
│   ├── 07-contribution/  #   分支 / Commit / 代码规范
│   └── prototype/        #   静态 HTML 原型(设计参考)
├── .github/              # GitHub 模板 + Actions 工作流
├── .editorconfig         # 跨编辑器统一缩进/换行
├── .nvmrc                # Node 版本锁定
├── .gitignore
├── package.json          # 根 package(workspaces 入口)
└── README.md             # 本文件
```

> 📖 **新人请直接看 → [`docs/README.md`](./docs/README.md)**

---

## 30 秒上手

```bash
# 1. 克隆
git clone https://github.com/W3217-SUDO/PIG-web.git
cd PIG-web

# 2. 安装 Node 20(用 nvm)
nvm install
nvm use

# 3. 安装根依赖(workspace 会同时拉子项目)
npm install

# 4. 启动后端(默认 :3000)
npm run dev:backend

# 5. 另开窗口,启动前端小程序编译
npm run dev:client:mp

# 6. 用微信开发者工具打开 frontend/dist/dev/mp-weixin/
```

更详细的环境搭建步骤 → [`docs/01-getting-started/local-setup.md`](./docs/01-getting-started/local-setup.md)

---

## 技术栈速览

| 层 | 技术 | 备注 |
|---|---|---|
| 客户端 | **uni-app** + Vue3 + TS + Pinia | 一份代码编译成小程序 / APP / H5 |
| 后端 | **NestJS** + TypeORM + Pino | TypeScript,模块化结构 |
| 数据库 | **MySQL 8** + **Redis 7** | 已在服务器装好 |
| 部署 | nginx + PM2 + Let's Encrypt | 已就位 |
| CI/CD | GitHub Actions → SSH 部署 | 见 `docs/06-deployment` |

详细选型与理由 → [`docs/02-architecture/tech-stack.md`](./docs/02-architecture/tech-stack.md)

---

## 开发分工(2 人协作)

| 角色 | 主战场 | 跨界协作 |
|---|---|---|
| **后端 + 部署** | `backend/` + 服务器运维 | 数据模型 + API 契约 |
| **前端 + 设计** | `frontend/` + UI 调整 | 数据模型 + API 契约 |
| **共同维护** | `docs/` + `db/migrations/` + `docs/03-backend/api-spec.md` |

分支策略与 PR 规范 → [`docs/07-contribution/workflow.md`](./docs/07-contribution/workflow.md)

---

## 重要安全约定 ⚠️

- **永远不要 commit `.env`、密钥、凭据**(`.gitignore` 已配置,但要警觉)
- 服务器凭据(MySQL/Redis 密码)统一放在 `~/.pig-secrets`(服务器上)
- 生产环境密钥变更 → 双人确认 → 写入 `docs/06-deployment/secrets.md`(私有 wiki,不入仓)
- 任何人发现密钥泄露 → 立即 rotate,见 [`docs/03-backend/security.md`](./docs/03-backend/security.md)

---

## 联系

- **Owner**:W3217-SUDO
- **服务器问题** → 查 `~/.pig-secrets` 与 `/opt/pig/logs/`
- **GitHub Issues** 处理产品需求 + Bug

---

> 🏮 **「认一头猪 · 过一个年」** —— 让一头慢养土猪,把一桌乡情还给一家城里人。
