# 目录结构规范

> 进入仓库的所有文件都有"该放哪儿"的规则,不要凭感觉创建目录。

---

## 仓库根目录

```
PIG-web/
├── backend/             # NestJS API
├── frontend/            # uni-app 客户端
├── admin/               # Vue3 管理后台(后续)
├── docs/                # 项目文档
├── scripts/             # 运维 / 一次性脚本
├── .github/             # GitHub 模板 + Actions
├── .editorconfig
├── .gitignore
├── .nvmrc
├── package.json
└── README.md
```

**根目录原则**:
- ❌ 不放业务代码
- ❌ 不放图片 / 文档以外的资源
- ✅ 只放配置 + 文档入口 + 子项目目录

---

## backend/(NestJS)

```
backend/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── app.module.ts              # 根模块
│   │
│   ├── modules/                   # 业务模块(一个目录 = 一个模块)
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/               #   入参 / 出参
│   │   │   ├── guards/            #   守卫
│   │   │   └── strategies/        #   passport 策略
│   │   ├── user/
│   │   ├── farmer/
│   │   ├── pig/
│   │   ├── order/
│   │   ├── share/
│   │   ├── live/
│   │   ├── feeding/
│   │   ├── health/
│   │   ├── insurance/
│   │   ├── wallet/
│   │   └── message/
│   │
│   ├── common/                    # 横切关注点
│   │   ├── filters/               #   全局异常过滤器
│   │   ├── interceptors/          #   日志 / 响应包装
│   │   ├── guards/                #   公共守卫
│   │   ├── decorators/            #   @CurrentUser() @Public() 等
│   │   ├── pipes/                 #   自定义 Pipe
│   │   └── middleware/            #   中间件
│   │
│   ├── config/                    # 配置
│   │   ├── configuration.ts       #   加载 .env
│   │   └── validation.ts          #   Joi 校验
│   │
│   ├── database/                  # 数据访问
│   │   ├── data-source.ts         #   TypeORM 配置
│   │   └── entities/              #   全局共享的实体(如果模块内的不够)
│   │
│   └── utils/                     # 工具函数(纯函数,无副作用)
│       ├── crypto.util.ts
│       ├── date.util.ts
│       └── code-gen.util.ts
│
├── test/
│   ├── *.e2e-spec.ts              # E2E 测试
│   └── jest-e2e.json
│
├── db/
│   ├── migrations/                # 迁移文件(版本化)
│   │   └── 1620000000000-Init.ts
│   └── seeds/                     # 开发种子数据
│       └── dev.seed.ts
│
├── uploads/                       # 本地文件存储(.gitignore)
├── logs/                          # 应用日志(.gitignore)
│
├── .env.example                   # 环境变量模板 ✅ 入库
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

### 模块内部结构(以 order 模块为例)

```
modules/order/
├── order.module.ts                # 模块声明
├── order.controller.ts            # HTTP 入口(路由 + 校验)
├── order.service.ts               # 业务逻辑
├── order.repository.ts            # 数据访问(可选,简单的可省)
├── entities/
│   └── order.entity.ts            # TypeORM 实体
├── dto/
│   ├── create-order.dto.ts        # POST 入参
│   ├── update-order.dto.ts        # PATCH 入参
│   └── query-order.dto.ts         # GET 查询参数
├── enums/
│   └── order-status.enum.ts
└── order.service.spec.ts          # 单元测试(可选)
```

### 模块命名规则

- 文件夹**单数**(`order/` 不是 `orders/`)
- 类名 `OrderModule`、`OrderController`、`OrderService`
- 路由前缀 `/api/orders`(URL 复数)
- DTO 后缀必带 `.dto.ts`
- 实体后缀必带 `.entity.ts`

---

## frontend/(uni-app)

```
frontend/
├── src/
│   ├── pages/                     # 业务页面(每个文件夹 = 一个路由)
│   │   ├── home/
│   │   │   ├── index.vue          #   页面主文件
│   │   │   └── components/        #   该页面专属组件
│   │   ├── about/
│   │   ├── order/
│   │   │   ├── select-breed.vue   #   step1
│   │   │   ├── select-farmer.vue  #   step2
│   │   │   ├── select-insurance.vue
│   │   │   └── confirm.vue        #   step4
│   │   ├── pigs/                  #   我的猪圈列表
│   │   ├── pig-detail/
│   │   ├── share/
│   │   │   ├── invite.vue         #   分享码海报
│   │   │   └── join.vue           #   凭码加入
│   │   ├── live/
│   │   ├── farmer/
│   │   ├── profile/
│   │   └── message/
│   │
│   ├── components/                # 跨页面通用组件
│   │   ├── PigCard.vue
│   │   ├── FarmerAvatar.vue
│   │   ├── LivePlayer.vue
│   │   └── ShareCodeQr.vue
│   │
│   ├── api/                       # 后端 API 封装
│   │   ├── request.ts             #   通用请求(token / 拦截 / 错误)
│   │   ├── auth.ts                #   POST /auth/wx-login 等
│   │   ├── pig.ts
│   │   ├── order.ts
│   │   ├── share.ts
│   │   └── types.ts               #   全局接口类型(与后端 DTO 对齐)
│   │
│   ├── store/                     # Pinia
│   │   ├── index.ts
│   │   ├── user.ts                #   登录态 / userInfo
│   │   ├── pigs.ts                #   我的猪圈
│   │   └── share.ts               #   当前拼猪订单
│   │
│   ├── utils/                     # 工具
│   │   ├── platform.ts            #   #ifdef 封装
│   │   ├── format.ts              #   日期 / 金额格式化
│   │   ├── storage.ts             #   uni.setStorage 封装
│   │   └── share.ts               #   生成分享卡 / 二维码
│   │
│   ├── static/                    # 静态资源(图片 / 字体 / 音视频)
│   │   ├── tab-bar/
│   │   ├── home/
│   │   └── share/
│   │
│   ├── App.vue
│   ├── main.ts
│   ├── pages.json                 # 路由 + tabBar 配置
│   └── manifest.json              # 多端编译配置
│
├── env/
│   ├── .env.example
│   ├── .env.development
│   └── .env.production
│
├── dist/                          # 编译产物(.gitignore)
├── unpackage/                     # HBuilderX 产物(.gitignore)
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 命名规则(前端)

| 类型 | 规则 | 例 |
|---|---|---|
| 页面文件夹 | kebab-case | `pig-detail/` |
| 组件文件 | PascalCase | `PigCard.vue` |
| API 文件 | kebab-case | `share.ts` |
| Pinia store | camelCase | `user.ts` |
| TypeScript 接口 | PascalCase | `interface Pig {}` |
| 路由路径(pages.json) | kebab-case | `pages/pig-detail/index` |

---

## docs/

```
docs/
├── README.md                      # 总索引
├── 00-overview/
│   ├── product.md
│   └── glossary.md
├── 01-getting-started/
│   ├── prerequisites.md
│   ├── local-setup.md
│   └── server-setup.md
├── 02-architecture/
│   ├── overview.md
│   ├── tech-stack.md
│   └── directory-structure.md
├── 03-backend/
│   ├── modules.md
│   ├── api-spec.md
│   ├── database.md
│   ├── auth.md
│   ├── logging.md
│   ├── security.md
│   └── config.md
├── 04-frontend/
│   ├── miniapp.md
│   ├── app.md
│   └── h5.md
├── 05-debugging/
│   ├── debug-endpoints.md
│   ├── postman-collection.md
│   └── troubleshooting.md
├── 06-deployment/
│   ├── ci-cd.md
│   ├── release.md
│   └── monitoring.md
├── 07-contribution/
│   ├── workflow.md
│   └── code-style.md
├── adr/                           # 架构决策记录(Architecture Decision Records)
│   ├── 0001-monorepo.md
│   └── 0002-uniapp-vs-native.md
└── prototype/
    └── index.html
```

### 文档命名

- 用 **kebab-case**
- 数字前缀只在分类目录,文档自身不带数字
- 一个目录里**别放 README.md** 之外的索引文件(`docs/README.md` 总索引就够了)

### ADR(架构决策记录)

每次做重大技术决策(选 NestJS、选 uni-app、Monorepo、不要微服务……),写一份 ADR:

```markdown
# ADR-0001:采用 Monorepo

## 状态
已采纳(2026-05-11)

## 背景
…

## 决策
…

## 后果
…

## 替代方案
…
```

---

## scripts/

一次性 / 维护脚本,**不放业务代码**:

```
scripts/
├── deploy/
│   ├── backend.sh                 # 部署后端
│   └── nginx-reload.sh
├── db/
│   ├── backup.sh                  # 数据库备份
│   └── restore.sh
├── dev/
│   └── reset-local.sh             # 清干净本地数据库
└── README.md                      # 每个脚本说明
```

---

## .github/

```
.github/
├── workflows/
│   ├── ci.yml                     # PR / push 时跑 lint+test
│   └── deploy-backend.yml         # main 合并后部署
├── PULL_REQUEST_TEMPLATE.md
└── ISSUE_TEMPLATE/
    ├── bug.md
    ├── feature.md
    └── question.md
```

---

## 文件命名总规则

| 类型 | 规则 |
|---|---|
| 目录 | kebab-case(`pig-detail/`) |
| Vue 组件 | PascalCase(`PigCard.vue`) |
| NestJS 模块文件 | kebab-case + 类型后缀(`order.service.ts`) |
| 普通 TS 文件 | kebab-case(`crypto.util.ts`) |
| 配置文件 | kebab-case(`tsconfig.json`) |
| 文档 | kebab-case(`api-spec.md`) |

---

## 命名禁区 ❌

- `utils/index.ts` —— 万能桶,过段时间没人知道里面是什么
- `helpers/` —— 同上,改用具体职责命名(`crypto/` / `date/`)
- `common/components/` —— 太泛,改成 `shared/` 或者按职能拆
- `temp/` `new/` `old/` —— 临时/新/旧 永远没人清,**不允许 commit**
- 单文件叫 `data.ts` `config.ts` `service.ts`(没语义) —— 必须带前缀
- 中文文件名 —— 跨平台问题,**完全禁止**
