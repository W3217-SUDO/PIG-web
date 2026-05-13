# 🎭 三身份单小程序 · 架构与合并方案

> **状态**:草案 · 2026-05-13 · 待 @W3217-SUDO 评审
>
> **决策事项**:把现有的 `frontend/`(用户端)和 `foster-care-page/`(农户+Admin)合并为**单一 uni-app 项目**,通过启动期角色路由分流,实现"1 个小程序 = 1 个 AppID = 3 个身份各看各的页面树"。

---

## 1. 背景

### 1.1 现状(2026-05-13)

```
frontend/                         foster-care-page/
├── 19 个用户端页面                ├── 9 个页面(农户 5 + Admin 4)
├── AppID: wx4409bb388ab1a03e      ├── AppID: wx4409bb388ab1a03e  ← 同
├── 鉴权: Authorization Bearer JWT ├── 鉴权: X-Foster-Token  ← 不同!
├── token key: pig:access_token    ├── token key: pig:foster_token
├── API base: VITE_API_BASE 环境量 ├── API base: 硬编码 127.0.0.1:3000
├── 401 拦截 + 跳登录(刚修过)    ├── 无 401 拦截
└── 无 tabbar                      └── 4 项 tabbar(工作台/任务/猪只/收益)
```

### 1.2 问题

1. **同 AppID 但两个独立工程** → 微信小程序后台**只能上传一份产物**,等于两端互斥,无法同时部署
2. **鉴权机制割裂** → 后端有两套中间件,用户切身份要重新登录,体验混乱
3. **代码重复** → request 封装、UI 组件、API client 在两边各写一份,维护成本翻倍

### 1.3 目标

| 项 | 目标 |
|---|---|
| 用户视角 | 打开同一个小程序,首次选"我是谁",之后自动认人 |
| 开发视角 | 单一仓库 `frontend/`,所有页面、工具、组件统一 |
| 部署视角 | 1 份 mp-weixin 产物上传微信审核 |
| 后端视角 | 1 套 JWT 鉴权,token payload 里带 `role` 字段区分权限 |

---

## 2. 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│  ① pages/launch/index   ← 启动判断                          │
│     onLaunch → 读 storage 里的 role + token                 │
│     ├─ token 有效 → uni.reLaunch 到对应 role 的 home        │
│     └─ 没 token / 过期  → 跳 pages/login/index              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  ② pages/login/index   ← 共享登录页(3 选 1 入口)          │
│  ┌───────────────────┬───────────────────┬────────────────┐│
│  │   👤 我是用户      │  🧑‍🌾 我是农户      │  🛡 管理员入口  ││
│  │  微信一键登录       │  微信登录 + 选农户  │  手机号+密码    ││
│  └───────────────────┴───────────────────┴────────────────┘│
│  登录成功 → 后端返回 { token, role, profile }                │
│  → setStorage('pig:access_token', token)                    │
│  → setStorage('pig:user_role', role)                        │
│  → uni.reLaunch 到对应 home                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓ (按 role 分流)
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   customer       │  │   farmer         │  │   admin          │
│  pages/customer/ │  │  pages/farmer/   │  │  pages/admin/    │
│  ─────────────   │  │  ─────────────   │  │  ─────────────   │
│  home(订猪首页) │  │  workbench       │  │  数据看板         │
│  pig/detail     │  │  tasks (喂养)    │  │  用户管理        │
│  order/{c,r,d}  │  │  pigs(自己代养) │  │  农户管理        │
│  share/landing  │  │  earnings(收益) │  │  猪只管理         │
│  my/*           │  │  pigs/update     │  │  订单管理        │
│  wallet         │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
       主色 #2c1810         主色 #2d8a4e         主色 #1a6b35
```

---

## 3. 关键设计决策

### 3.1 鉴权统一为 JWT(放弃 X-Foster-Token)

**决策**:所有身份统一走 `Authorization: Bearer <JWT>`,JWT payload 里携带 `role`:

```json
{
  "sub": "user_uuid",
  "role": "customer" | "farmer" | "admin",
  "farmerId": "...",      // 仅 farmer 角色有
  "iat": ..., "exp": ...
}
```

**为什么**:
- 用户端已经在用 JWT,改动小
- 后端 auth guard 用同一份代码处理三种角色,通过 `@Roles('admin')` 装饰器做接口级权限
- token key 也统一为 `pig:access_token`,storage 里多一个 `pig:user_role` 缓存当前身份(避免每次都 decode JWT)

**后端要做的事**(留给 @W3217-SUDO):
1. `farmer/login` 接口签发 JWT(目前可能签的是 X-Foster-Token 风格的随机串)
2. 用户表里加 `role` 字段(或者新建 `roles` 表多对多)
3. 删除 `X-Foster-Token` 中间件,迁到 JWT guard

### 3.2 tabbar 用 `custom-tab-bar` 自定义组件

uni-app pages.json 的 `tabBar` 是**静态配置,不能按角色动态切换**。两种解法:

| 解法 | 选不选 | 理由 |
|---|---|---|
| `pages.json` 配静态 tabbar | ❌ | 三角色页面互不相干,静态 tabbar 只能放一套 |
| **`custom-tab-bar` 自定义组件** | ✅ | 根据 role 渲染不同 tab,uni-app + 微信小程序原生支持 |
| 不用 tabbar | 备选 | 简单但视觉糙,降级方案 |

**custom-tab-bar 实现**(`frontend/src/custom-tab-bar/index.vue`):
- 读 `pig:user_role` storage
- 按 role 渲染对应的 tab 列表
- 切换 tab 用 `uni.switchTab` 跳已注册的页面

### 3.3 目录结构

```
frontend/
├── src/
│   ├── pages/
│   │   ├── launch/index.vue           ← 启动分流(新增)
│   │   ├── login/index.vue            ← 共享登录页(改造)
│   │   ├── customer/                  ← 客户端(从原 frontend 搬整理)
│   │   │   ├── home/index.vue         (原 pages/index/index)
│   │   │   ├── pig/detail.vue
│   │   │   ├── order/{confirm,result,detail}.vue
│   │   │   ├── share/landing.vue
│   │   │   ├── my/{index,profile,addresses,orders,pigs,wallet}.vue
│   │   │   ├── messages/index.vue
│   │   │   └── farmer/detail.vue      (客户看农户介绍页)
│   │   ├── farmer/                    ← 代养人端(从 foster-care-page 迁)
│   │   │   ├── workbench/index.vue
│   │   │   ├── tasks/index.vue
│   │   │   ├── pigs/index.vue         (代养人自己的猪)
│   │   │   └── earnings/index.vue
│   │   ├── admin/                     ← 管理员端(从 foster-care-page/admin 迁)
│   │   │   ├── index.vue
│   │   │   ├── farmers.vue
│   │   │   ├── pigs.vue
│   │   │   └── tasks.vue
│   │   ├── live/index.vue             ← 公共(三角色都能看)
│   │   └── static/{about,terms,privacy}.vue
│   ├── custom-tab-bar/
│   │   └── index.vue                  ← 自定义 tabbar
│   ├── utils/
│   │   ├── request.ts                 ← 已有(保留 frontend 版,已修 401 并发)
│   │   └── auth.ts                    ← role/token storage 封装(新增)
│   └── ...
├── package.json
└── manifest.json                       AppID wx4409bb388ab1a03e(不变)
```

**foster-care-page/ 目录在合并完成后整体删除**,git history 仍保留。

### 3.4 API 命名空间

后端接口按角色前缀分组,避免冲突:

```
GET  /api/customer/me           客户身份信息
GET  /api/customer/orders        客户订单列表
GET  /api/farmer/me              农户身份信息
GET  /api/farmer/pigs            农户代养的猪
GET  /api/farmer/tasks           喂养任务
GET  /api/admin/users            管理:所有用户
GET  /api/admin/farmers          管理:农户审核
POST /api/auth/wx-login          微信登录(客户走这个)
POST /api/auth/farmer-login      农户登录(微信 openid + 选择农户绑定)
POST /api/auth/admin-login       管理员登录(手机号 + 密码)
```

> **现状偏差**:用户端目前调 `/api/users/me`、`/api/orders/me`、`/api/wallet/me`(无 `/customer/` 前缀)。合并时**保持现状不动,只对新加的农户/admin 接口加前缀**——避免动用户端就破环回归。

---

## 4. 分阶段执行计划

### Phase 1 · 准备(0.5 天)

- [ ] 本文档评审通过 + 仓库 PR 合并
- [ ] 跟 @W3217-SUDO 约定**合并窗口**(连续 2-3 个工作日他不改 `foster-care-page/`)
- [ ] 决策:**谁主导合并**——建议 @W3217-SUDO,因为他对农户端代码更熟、最近 7 个 commit 都是他改的

### Phase 2 · 基础设施(0.5 天)

- [ ] 后端:`AuthModule` 增加 `farmer-login` 和 `admin-login` 端点,统一签 JWT(payload 带 role)
- [ ] 后端:`JwtAuthGuard` + `RolesGuard` 二层守卫
- [ ] 后端:`User.role` 字段 + migration

### Phase 3 · 前端合并(1 天)

- [ ] 把 `foster-care-page/src/pages/*` 文件搬到 `frontend/src/pages/{farmer,admin}/`
- [ ] 合并 `pages.json`(注册所有页面,删 foster-care-page 的 static tabbar)
- [ ] 实现 `pages/launch/index.vue` 启动分流
- [ ] 改造 `pages/login/index.vue` 为 3 入口选择
- [ ] 删除 `foster-care-page/src/utils/request.ts`,所有页面改 import `@/utils/request`
- [ ] 删除 `foster-care-page/` 整个目录(git mv 保留历史)

### Phase 4 · custom-tab-bar(0.5 天)

- [ ] 实现 `custom-tab-bar/index.vue`,按 role 渲染
- [ ] 三角色各自的 tab 列表敲定(待和 @W3217-SUDO 讨论)

### Phase 5 · 端到端验证(0.5 天)

- [ ] 三个 role 各自走通登录闭环
- [ ] role 切换:同一手机号能否同时是客户和农户?(产品决策)
- [ ] 包体积:合并后主包是否 < 2MB?超了就拆 subpackages

### Phase 6 · 文档收尾(0.5 天)

- [ ] 更新 `docs/02-architecture/overview.md`(把"桌面端 Admin"删掉,统一为小程序内 Admin)
- [ ] 更新 `docs/01-getting-started/local-setup.md`(只剩一个 dev:mp-weixin 命令)
- [ ] 更新 `docs/03-backend/security.md`(JWT 角色区分)
- [ ] 关闭 `foster-care-page` 相关历史 task,新建合并 PR 关联本文档

---

## 5. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| **合并期间同事仍在 foster-care-page 改代码** | merge 冲突非常痛 | Phase 1 强制约定窗口期,期间他改用户端或后端 |
| **包体积超 2MB 主包限制** | 上传失败 | Phase 5 测量,超了用 uni-app subpackages 把 admin/farmer 拆分包 |
| **后端 JWT 改造影响存量农户登录** | 农户端短期不可用 | 后端旧 X-Foster-Token 路径**保留 1 周作为兼容**,前端切完再删 |
| **MVP 5/31 上线时间紧** | 这次合并要 3-4 天,挤压其他功能 | 不做完美合并,只合基础结构,UI 细节后续迭代 |
| **同事不接受这个方案** | 推不动 | 本文档先评审、留 ❓ 的点让他改,以他的修订为准 |

---

## 6. 待决问题(请 @W3217-SUDO 反馈)

1. **农户登录后,管理员能否一键切到 admin 视角调试?**(同一手机/openid 能否绑多个 role)
2. **客户能否同时是农户?**(用户表 role 是 enum 还是数组)
3. **admin 登录用什么?** 手机号+密码 / 微信扫码 / 内部系统跳转?
4. **三角色的 tabbar 各自配几个 item?各叫什么?**(列出来贴在本文档 §3.2 下面)
5. **合并窗口建议从什么时候开始?** 我这边随时可以配合

---

## 7. 评审记录

| 日期 | 评审人 | 意见 |
|---|---|---|
| 2026-05-13 | 陶威(草案) | 初稿 |
| _待补_ | W3217-SUDO | _待评审_ |

---

**审核通过后,本文档将被引用为合并 PR 的 spec。下一份相关文档:合并后回写 `docs/02-architecture/overview.md`。**
