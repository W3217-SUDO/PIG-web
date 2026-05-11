# CI/CD 流水线

> 用 **GitHub Actions** 自动化 CI(检查代码)和 CD(部署到服务器)。

---

## 一、流水线概览

```
PR / push 到任意分支
         ▼
   ┌──────────┐
   │   CI     │  · ESLint
   │          │  · TypeScript 类型检查
   │          │  · 单元测试
   │          │  · npm audit
   │          │  · 构建产物 dry-run
   └──────────┘
         ▼
     合并到 main
         ▼
   ┌──────────┐
   │   CD     │  · ssh 到服务器
   │          │  · git pull / 拉新代码
   │          │  · npm ci + build
   │          │  · 迁移数据库(谨慎)
   │          │  · PM2 reload
   │          │  · 健康检查
   │          │  · 失败回滚到上一 release
   └──────────┘
```

---

## 二、GitHub Actions 文件

### `.github/workflows/ci.yml`

每次 PR / push 触发,做检查:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: ci_pass
          MYSQL_DATABASE: pig_test
        ports: [3306:3306]
        options: >-
          --health-cmd="mysqladmin ping" --health-interval=10s
          --health-timeout=5s --health-retries=10
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
        options: >-
          --health-cmd="redis-cli ping" --health-interval=10s
          --health-timeout=5s --health-retries=10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm -w backend run build
      - run: npm -w frontend run type-check
      - name: backend tests
        env:
          NODE_ENV: test
          DB_HOST: 127.0.0.1
          DB_PASS: ci_pass
          DB_NAME: pig_test
          REDIS_HOST: 127.0.0.1
          JWT_SECRET: ci_secret_with_at_least_32_characters_xxxx
          WX_MP_APPID: wx_ci
          WX_MP_SECRET: ci
        run: npm -w backend run test
      - run: npm audit --audit-level=high --workspaces=false || true
```

### `.github/workflows/deploy-backend.yml`

main 分支变更后部署后端到服务器:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/deploy-backend.yml'
  workflow_dispatch:    # 手动触发

concurrency:
  group: deploy-backend
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm -w backend run build
      - name: archive
        run: |
          tar czf release.tar.gz \
            backend/dist \
            backend/package.json \
            backend/package-lock.json \
            backend/db
      - name: ssh + deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_KEY }}
          port: 22
          script: |
            set -e
            cd /opt/pig
            TS=$(date +%Y%m%d_%H%M%S)
            mkdir -p releases/$TS
      - name: upload artifact
        uses: appleboy/scp-action@v0.1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_KEY }}
          source: release.tar.gz
          target: /tmp/
      - name: extract + reload
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_KEY }}
          script: |
            set -e
            cd /opt/pig
            TS=$(ls -1t releases/ | head -1)
            tar xzf /tmp/release.tar.gz -C releases/$TS
            cd releases/$TS/backend
            npm ci --omit=dev
            ln -sfn /opt/pig/shared/.env.production .env.production
            cd /opt/pig
            ln -sfn releases/$TS current
            cd current/backend
            npm run migration:run
            pm2 reload pig-backend --update-env
            # 健康检查
            sleep 3
            curl -fsS http://127.0.0.1:3000/api/health || { pm2 logs pig-backend --lines 100; exit 1; }
            # 清理老 release(保留最近 5 个)
            cd /opt/pig/releases
            ls -1t | tail -n +6 | xargs -r rm -rf
```

---

## 三、GitHub Secrets 配置

仓库 → Settings → Secrets and variables → Actions:

| Secret Name | 值 |
|---|---|
| `SSH_HOST` | `175.24.175.123` |
| `SSH_KEY` | SSH 私钥(`cat ~/.ssh/pig`)|

**注意**:SSH 私钥要单独生成一个**部署用**密钥,**不要用** owner 的个人密钥。

生成步骤(在服务器上):
```bash
ssh-keygen -t ed25519 -f ~/.ssh/pig-deploy -N ''
cat ~/.ssh/pig-deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/pig-deploy   # 把这个内容贴进 SSH_KEY secret
```

---

## 四、前端部署(uni-app)

H5 部署:

```yaml
# .github/workflows/deploy-h5.yml
name: Deploy H5
on:
  push:
    branches: [main]
    paths: ['frontend/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm -w frontend run build:h5
      - uses: appleboy/scp-action@v0.1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_KEY }}
          source: "frontend/dist/build/h5/*"
          target: "/var/www/html/pig-h5/"
          strip_components: 4
```

小程序部署:
- 用 [miniprogram-ci](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)
- 需要小程序代码上传密钥
- 后续配置

APP 部署:
- 通过 HBuilderX 云打包,手动操作
- 不进 CI

---

## 五、本地一键部署(应急)

如果 GitHub Actions 挂了,手动部署脚本 `scripts/deploy/backend.sh`:

```bash
#!/usr/bin/env bash
set -e

echo "🐷 部署 pig-backend..."

# 1. 本地构建
npm ci
npm -w backend run build

# 2. 打包
tar czf /tmp/pig-release.tar.gz \
  backend/dist \
  backend/package.json \
  backend/package-lock.json \
  backend/db

# 3. 上传
scp /tmp/pig-release.tar.gz pig:/tmp/

# 4. 远程解压 + 重启
ssh pig <<'SSH_EOF'
set -e
cd /opt/pig
TS=$(date +%Y%m%d_%H%M%S)
mkdir -p releases/$TS
tar xzf /tmp/pig-release.tar.gz -C releases/$TS
cd releases/$TS/backend
npm ci --omit=dev
ln -sfn /opt/pig/shared/.env.production .env.production
cd /opt/pig
ln -sfn releases/$TS current
cd current/backend
npm run migration:run
pm2 reload pig-backend --update-env
sleep 3
curl -fsS http://127.0.0.1:3000/api/health
SSH_EOF

echo "✅ 部署完成"
```

---

## 六、PR / 分支保护

仓库 → Settings → Branches → Branch protection rules:

| 项 | 设置 |
|---|---|
| 保护分支 | `main` |
| 要求 PR review | ✅ 至少 1 人 |
| 要求 CI 通过 | ✅ `lint-test` 必须 green |
| 禁止 force push | ✅ |
| 禁止删除 | ✅ |
| 自动合并(squash) | 推荐 |

---

## 七、版本号管理

```
v0.1.0  · 第一个跑通本地的 commit
v0.2.0  · 后端骨架
v0.3.0  · 前端骨架
v1.0.0  · MVP 上线(第一波认领人)
```

每次发版打 tag:
```bash
git tag -a v0.2.0 -m "后端骨架 + 基础认证"
git push origin v0.2.0
```

GitHub Release 自动产出:
```yaml
# .github/workflows/release.yml
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

---

## 八、回滚流程

### 场景:刚部署的版本有 bug

```bash
ssh pig <<'EOF'
cd /opt/pig/releases
ls -1t      # 看 release 列表
# 假如要回 20260510_120000
ln -sfn /opt/pig/releases/20260510_120000 /opt/pig/current
cd /opt/pig/current/backend
pm2 reload pig-backend --update-env
EOF
```

回滚是**秒级**的(只是切个软链 + reload),不需要重新部署。

如果数据库迁移已经跑了:
- 看迁移是不是破坏性的(增列 / 加表 → 兼容,删列 / 改类型 → 不兼容)
- 必要时跑 `npm run migration:revert`

---

## 九、CI 性能

### 当前耗时(参考)

- checkout + setup-node:30s
- npm ci(根 + 3 个 workspace):2 min(cache 命中后 30s)
- lint:30s
- backend build:1 min
- tests:1 min
- 总计:4-5 分钟

### 优化点

- npm cache 命中(`actions/setup-node` 自动)
- backend / frontend / admin 并行 job
- 大依赖(sharp / canvas)单独 cache

---

## 十、特殊场景:不部署的提交

如果你只想 push 但不触发部署,在 commit message 加 `[skip ci]`:

```bash
git commit -m "docs: 改个错别字 [skip ci]"
```

---

## 十一、监控部署

每次部署完后:
1. 看 GitHub Actions 那条工作流 → 绿就好
2. 服务器健康检查:`curl https://www.rockingwei.online/api/health`
3. 看 PM2:`ssh pig pm2 list`
4. 看应用日志:`ssh pig 'tail -50 /opt/pig/logs/app.log'`

监控告警见 [`monitoring.md`](./monitoring.md)
