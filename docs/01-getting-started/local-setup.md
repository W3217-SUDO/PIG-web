# 本地启动 · 从 0 到能跑

> 前置:已完成 [`prerequisites.md`](./prerequisites.md) 所有工具的安装。预计耗时 30 分钟。

---

## 流程总览

```
1. Clone 仓库
2. 安装根依赖(workspace 一次拉所有子项目)
3. 起 MySQL + Redis(Docker)
4. 配置后端环境变量
5. 跑数据库迁移 + 种子数据
6. 启动后端
7. 配置前端环境变量
8. 启动小程序编译,微信开发者工具打开
9. 验证「我能下一个订单」端到端流程
```

---

## 1. Clone 仓库

```bash
git clone https://github.com/W3217-SUDO/PIG-web.git
cd PIG-web
```

如果用 SSH:
```bash
git clone git@github.com:W3217-SUDO/PIG-web.git
```

## 2. 安装根依赖

```bash
# 切换 Node 版本(用 .nvmrc 锁定的 20)
nvm use

# 安装所有 workspace 依赖
npm install
```

> 第一次安装会比较慢(~5 分钟)。如果卡住,换成 cnpm 或者用 `npm install --registry https://registry.npmmirror.com`。

## 3. 起本地 MySQL + Redis

```bash
# 如果已经跑过,直接 start
docker start pig-mysql pig-redis 2>/dev/null || \
docker run -d --name pig-mysql -e MYSQL_ROOT_PASSWORD=local_dev_pass \
  -e MYSQL_DATABASE=pig -p 3306:3306 mysql:8.0 && \
docker run -d --name pig-redis -p 6379:6379 redis:7-alpine

# 验证
docker exec pig-mysql mysql -uroot -plocal_dev_pass -e 'SELECT VERSION()'
docker exec pig-redis redis-cli ping
```

## 4. 后端环境变量

```bash
cd backend
cp .env.example .env.development
```

打开 `.env.development`,本地开发的最小配置:

```env
NODE_ENV=development
PORT=3000

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=local_dev_pass
DB_NAME=pig

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# JWT(本地随便填,生产环境必须严格保密)
JWT_SECRET=local_dev_jwt_secret_change_in_prod
JWT_EXPIRES_IN=7d

# 微信小程序(找团队要 dev appId/secret)
WX_MP_APPID=wx_test_appid_TBD
WX_MP_SECRET=wx_test_secret_TBD

# 文件存储(本地用本地目录)
UPLOAD_DIR=./uploads
PUBLIC_BASE_URL=http://127.0.0.1:3000

# 日志
LOG_LEVEL=debug
```

> 完整变量解释 → [`../03-backend/config.md`](../03-backend/config.md)

## 5. 数据库迁移 + 种子数据

```bash
# 在 backend/ 目录
npm run migration:run    # 执行所有未执行的迁移,建表
npm run seed:dev         # 灌入开发种子数据(3 个农户 / 5 头猪 / 1 个测试用户)
```

验证:
```bash
docker exec pig-mysql mysql -uroot -plocal_dev_pass pig -e 'SHOW TABLES'
# 应该能看到 users / farmers / pigs / orders / share_members 等表
```

## 6. 启动后端

```bash
# 在仓库根目录
npm run dev:backend

# 或者在 backend/ 目录
npm run start:dev
```

成功的话会看到:

```
[Nest] xxx - LOG [NestFactory] Starting Nest application...
[Nest] xxx - LOG [InstanceLoader] AppModule dependencies initialized
[Nest] xxx - LOG [RoutesResolver] AuthController {/api/auth}
[Nest] xxx - LOG [NestApplication] Nest application successfully started
🐷 Backend running on http://127.0.0.1:3000
```

健康检查:
```bash
curl http://127.0.0.1:3000/api/health
# {"status":"ok","db":"ok","redis":"ok"}
```

## 7. 前端环境变量

```bash
cd frontend
cp env/.env.example env/.env.development
```

`env/.env.development` 关键项:

```env
VITE_API_BASE=http://127.0.0.1:3000/api
VITE_WS_BASE=ws://127.0.0.1:3000/ws
VITE_WX_APPID=wx_test_appid_TBD
```

## 8. 启动小程序编译

```bash
# 在仓库根目录
npm run dev:client:mp

# 或者在 frontend/ 目录
npm run dev:mp-weixin
```

成功后会持续输出:
```
ready in 2.3s
build for development:mp-weixin
Output: dist/dev/mp-weixin/
```

### 用微信开发者工具打开

1. 打开微信开发者工具
2. 选「导入项目」
3. 项目目录:`<你本地路径>/PIG-web/frontend/dist/dev/mp-weixin/`
4. AppID:用 `.env.development` 里的 `VITE_WX_APPID`(没有就选「测试号」)
5. 进入后,**右上角 详情 → 本地设置 → 勾选「不校验合法域名、TLS 版本以及 HSTS」**
6. 应该能看到首页(认一头猪 · 过一个年)

## 9. 端到端验证

**测试场景**:用测试账号下一个订单

1. 微信开发者工具 → 点首页「立即认养」
2. 走完 4 步下单流程,模拟支付
3. 进入「我的猪圈」,应该能看到刚下单的那头猪
4. 检查后端日志:`tail -f backend/logs/app.log`,应该有 `POST /api/orders` 记录
5. 检查数据库:
   ```bash
   docker exec pig-mysql mysql -uroot -plocal_dev_pass pig -e 'SELECT id, user_id, pig_id, status FROM orders'
   ```

✅ 全部 OK → 你的环境就绪了。

---

## 常见报错

### `Error: connect ECONNREFUSED 127.0.0.1:3306`

→ MySQL Docker 没启动:`docker start pig-mysql`

### `[Vite] failed to resolve import "@/api/auth"`

→ 跑过 `npm install` 了吗?根目录还是 `frontend/` 目录都试一下

### 小程序提示 "url not in domain list"

→ 微信开发者工具右上角 → 详情 → 本地设置 → 勾「不校验合法域名」

### 后端启动报 `Cannot find module 'typeorm'`

→ `cd backend && npm install`

更多 → [`../05-debugging/troubleshooting.md`](../05-debugging/troubleshooting.md)

---

## 下一步

- 看架构:[`../02-architecture/overview.md`](../02-architecture/overview.md)
- 写第一个后端接口:[`../03-backend/modules.md`](../03-backend/modules.md)
- 写第一个前端页面:[`../04-frontend/miniapp.md`](../04-frontend/miniapp.md)
