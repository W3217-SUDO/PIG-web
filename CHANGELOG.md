# Changelog

> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### Planning
- 制定 5/31 上线总路线图 `docs/ROADMAP.md`
- MVP v1.0.0 范围矩阵 `docs/00-overview/mvp-scope.md`
- W1 / W2 / W3 自动执行任务清单(`docs/AUTO-RUN-2026-05-12.md` / `-19.md` / `-26.md`)
- **总任务清单 `docs/TASKS.md`(单一真相源,按模块组织,123 任务追踪,每日站会用)**
- 文档总索引更新,顶部增加"当前进行中"区块 + 新人入职引导

## [0.2.0] - 2026-05-11

### Added
- 完整 Monorepo 仓库骨架(根 README / package.json workspaces / EditorConfig / nvmrc)
- 完整开发文档体系(`docs/` 8 章 26 篇)
  - 00-overview · 产品定位 / 术语表
  - 01-getting-started · 环境准备 / 本地启动 / 服务器现状
  - 02-architecture · 架构总览 / 技术栈 / 目录规范
  - 03-backend · 模块 / API 规范 / 数据库 / 认证 / 日志 / 安全 / 配置
  - 04-frontend · 小程序 / APP / H5
  - 05-debugging · 调试接口 / Postman / FAQ
  - 06-deployment · CI/CD / 发版 / 监控
  - 07-contribution · 协作流程 / 代码规范
- GitHub 模板(PR / Issue × 3)+ Actions 工作流(CI / Deploy Backend)
- 客户端 / 后端 子项目 README 占位

### Changed
- 原型(`docs/prototype/index.html`)首页重做:沉浸式 Hero / 三大主张 / 拼猪 / 4 步流程
- 养殖周期统一 9-10 个月 → **10-12 个月 / 约一年的年猪**
- 配色由冷绿改为中国年色(暗红 / 暖黄 / 米白 / 土褐)

### Infrastructure
- 域名 `www.rockingwei.online` + Let's Encrypt HTTPS + 80→443 跳转配置
- nginx 站点配置 `/etc/nginx/sites-enabled/rockingwei.online`(根 → 原型,`/api/` → :3000,`/ws/` → WebSocket)

## [0.1.0] - 2026-05-09

### Added
- 初始化项目结构(`backend/` / `frontend/` / `docs/`)
- 静态 HTML 原型(三端整合)
- 服务器基础设施就绪(Node20 / MySQL8 / Redis7 / nginx / PM2)

---

## 版本号规则

- **MAJOR**:不向下兼容的变更(API 大改 / DB 大改)
- **MINOR**:新功能,向下兼容
- **PATCH**:bug 修复 / 文档

[Unreleased]: https://github.com/W3217-SUDO/PIG-web/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/W3217-SUDO/PIG-web/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/W3217-SUDO/PIG-web/releases/tag/v0.1.0
