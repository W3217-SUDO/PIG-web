# 📖 PIG 项目文档总索引

> 这里是所有开发者必读的入口。**新人 30 分钟内能跑起来本地环境 + 看懂项目结构**——如果做不到,就是文档的锅,请提 Issue。

---

## 文档导航

### 🪧 0. 产品与项目背景

| 文档 | 看完知道 |
|---|---|
| [`00-overview/product.md`](./00-overview/product.md) | 我们做什么、为什么做、核心商业逻辑 |
| [`00-overview/glossary.md`](./00-overview/glossary.md) | 项目术语:认领人 / 主认领人 / 拼猪 / 年猪 / … |

### 🚀 1. 环境搭建与本地启动

| 文档 | 看完知道 |
|---|---|
| [`01-getting-started/prerequisites.md`](./01-getting-started/prerequisites.md) | 本地电脑要装哪些工具(Node/MySQL/Redis/微信开发者工具) |
| [`01-getting-started/local-setup.md`](./01-getting-started/local-setup.md) | 从 0 到本地跑通前后端 + 数据库 + 小程序预览 |
| [`01-getting-started/server-setup.md`](./01-getting-started/server-setup.md) | 服务器现状盘点(已装的服务、密码位置) |

### 🏛 2. 架构与目录约定

| 文档 | 看完知道 |
|---|---|
| [`02-architecture/overview.md`](./02-architecture/overview.md) | 整体架构图、数据流、三端职责 |
| [`02-architecture/tech-stack.md`](./02-architecture/tech-stack.md) | 技术栈选型与理由 |
| [`02-architecture/directory-structure.md`](./02-architecture/directory-structure.md) | 目录规范、命名约定 |

### 🛠 3. 后端开发(NestJS)

| 文档 | 看完知道 |
|---|---|
| [`03-backend/modules.md`](./03-backend/modules.md) | 后端模块划分(auth / user / pig / order / share / live …) |
| [`03-backend/api-spec.md`](./03-backend/api-spec.md) | REST API 规范、字段约定、错误码、分页 |
| [`03-backend/database.md`](./03-backend/database.md) | ER 图、全表 schema、索引策略、迁移流程 |
| [`03-backend/auth.md`](./03-backend/auth.md) | 微信登录流程、JWT、角色权限、拼猪权限 |
| [`03-backend/logging.md`](./03-backend/logging.md) | 日志分级、落盘、切割、检索 |
| [`03-backend/security.md`](./03-backend/security.md) | 鉴权、限流、防注入、敏感字段、密钥轮换 |
| [`03-backend/config.md`](./03-backend/config.md) | 环境变量、配置中心、多环境差异 |

### 📱 4. 前端开发(uni-app)

| 文档 | 看完知道 |
|---|---|
| [`04-frontend/miniapp.md`](./04-frontend/miniapp.md) | 微信小程序开发流程、域名校验、真机调试 |
| [`04-frontend/app.md`](./04-frontend/app.md) | iOS / Android APP 打包、原生模块、上架 |
| [`04-frontend/h5.md`](./04-frontend/h5.md) | H5 营销页 / 分享落地页 |

### 🔬 5. 调试与排错

| 文档 | 看完知道 |
|---|---|
| [`05-debugging/debug-endpoints.md`](./05-debugging/debug-endpoints.md) | 后端内置调试接口(开发环境专用) |
| [`05-debugging/postman-collection.md`](./05-debugging/postman-collection.md) | Postman 集合 / API 文档地址 |
| [`05-debugging/troubleshooting.md`](./05-debugging/troubleshooting.md) | 常见报错与解决方案 |

### 🚢 6. 部署与运维

| 文档 | 看完知道 |
|---|---|
| [`06-deployment/ci-cd.md`](./06-deployment/ci-cd.md) | GitHub Actions 流水线 |
| [`06-deployment/release.md`](./06-deployment/release.md) | 发版流程、蓝绿、回滚 |
| [`06-deployment/monitoring.md`](./06-deployment/monitoring.md) | 监控、告警、日志检索 |

### 🤝 7. 协作规范

| 文档 | 看完知道 |
|---|---|
| [`07-contribution/workflow.md`](./07-contribution/workflow.md) | 分支策略、Commit 规范、PR 模板 |
| [`07-contribution/code-style.md`](./07-contribution/code-style.md) | ESLint / Prettier / 命名规则 |

### 🖼 历史原型

- [`prototype/index.html`](./prototype/index.html) — 静态 HTML 原型(三端整合,设计参考用)
- 线上访问:[https://www.rockingwei.online/](https://www.rockingwei.online/)

---

## 推荐阅读顺序

**第 1 天 · 新人入职** → 读完能跑起本地

1. [`00-overview/product.md`](./00-overview/product.md) — 知道项目是什么 (15 min)
2. [`01-getting-started/prerequisites.md`](./01-getting-started/prerequisites.md) — 准备工具 (30 min)
3. [`01-getting-started/local-setup.md`](./01-getting-started/local-setup.md) — 跑通本地 (60 min)
4. [`02-architecture/overview.md`](./02-architecture/overview.md) — 知道全貌 (20 min)

**第 2-3 天 · 上手开发** → 读完能写一个完整功能

5. [`02-architecture/directory-structure.md`](./02-architecture/directory-structure.md)
6. [`03-backend/modules.md`](./03-backend/modules.md) / [`04-frontend/miniapp.md`](./04-frontend/miniapp.md)(按角色二选一)
7. [`03-backend/api-spec.md`](./03-backend/api-spec.md) — 知道 API 怎么定
8. [`07-contribution/workflow.md`](./07-contribution/workflow.md) — 知道怎么 push

**第 1 周内 · 完整掌握**

- 通读 `03-backend/` 全部
- 通读 `05-debugging/` + `06-deployment/`
- 浏览 `07-contribution/code-style.md`

---

## 文档维护原则

1. **谁动代码,谁更新文档**——这是 PR review 的硬要求
2. **文档优先于代码注释**——能在 `docs/` 写清楚的事,别藏在代码注释里
3. **过时的文档比没有文档更坏**——发现过时就改,改不了就删
4. **每个文档开头一句话说明它解决什么问题**——不能漂着
