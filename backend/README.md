# backend · NestJS API

> 私人订猪后端服务,基于 **NestJS 10 + TypeScript + TypeORM + MySQL + Redis**。

🔗 完整后端文档:[`../docs/03-backend/`](../docs/03-backend/)

---

## 快速启动

```bash
# 在仓库根目录
npm install                    # 拉所有依赖(workspace 模式)

# 进入后端目录
cd backend
cp .env.example .env.development # 复制环境变量模板,填实际值
npm run start:dev              # 默认监听 :3000
```

更详细本地启动 → [`../docs/01-getting-started/local-setup.md`](../docs/01-getting-started/local-setup.md)

---

## 目录速览(本目录)

```
backend/
├── src/
│   ├── main.ts                  # 应用入口
│   ├── app.module.ts            # 根模块
│   ├── modules/                 # 业务模块
│   │   ├── auth/                #   微信登录 / JWT
│   │   ├── user/                #   用户
│   │   ├── farmer/              #   农户
│   │   ├── pig/                 #   猪只
│   │   ├── order/               #   订单 / 认领
│   │   ├── share/               #   拼猪 / 分享码
│   │   ├── live/                #   直播
│   │   ├── feeding/             #   喂养记录
│   │   ├── health/              #   健康档案
│   │   ├── insurance/           #   保险
│   │   ├── wallet/              #   钱包 / 余额
│   │   └── message/             #   消息通知
│   ├── common/                  # 横切关注点
│   │   ├── filters/             #   异常过滤器
│   │   ├── interceptors/        #   日志 / 响应包装
│   │   ├── guards/              #   鉴权
│   │   ├── decorators/          #   @CurrentUser() 等
│   │   └── pipes/               #   校验
│   ├── config/                  # 配置加载
│   ├── database/                # TypeORM 配置 + 实体
│   └── utils/                   # 工具函数
├── test/                        # E2E / 单元测试
├── db/
│   └── migrations/              # 数据库迁移脚本(版本化)
├── .env.example                 # 环境变量模板(必看!)
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## 关键命令

| 命令 | 用途 |
|---|---|
| `npm run start:dev` | 开发模式,热重载 |
| `npm run start:debug` | 开发 + 调试器 |
| `npm run build` | 编译到 `dist/` |
| `npm run start:prod` | 跑编译产物(生产) |
| `npm run lint` | ESLint 检查 |
| `npm run test` | 单元测试 |
| `npm run test:e2e` | 端到端测试 |
| `npm run migration:generate` | 根据实体变化生成迁移文件 |
| `npm run migration:run` | 执行迁移 |
| `npm run migration:revert` | 回滚一步迁移 |

---

## 环境变量约定

| 文件 | 用途 | 是否入库 |
|---|---|---|
| `.env.example` | 模板,所有变量带说明 | ✅ 入库 |
| `.env.development` | 本地开发 | ❌ |
| `.env.test` | 测试 | ❌ |
| `.env.production` | 生产(只放服务器上) | ❌ |

> ⚠️ 绝对不要 commit 任何 `.env.*` 文件(`.env.example` 除外),`.gitignore` 已配置但要保持警觉。

---

## 调试

- 本机调试:`npm run start:debug` 然后 VSCode 附加调试器(端口 9229)
- 接口调试:见 [`../docs/05-debugging/`](../docs/05-debugging/)
- 服务器日志:`ssh pig 'tail -f /opt/pig/logs/app.log'`
