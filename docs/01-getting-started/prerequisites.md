# 本地环境准备

> 在开始 clone 仓库之前,先把这些工具装好。预计耗时 30–60 分钟(看网速)。

---

## 一、必装

### 1. Node.js 20.x

我们用 Node 20 LTS。**不要用 18 或 22**,会有 NestJS / uni-app 兼容问题。

#### 推荐用 nvm 装(避免污染系统)

**macOS / Linux**:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# 重启终端
nvm install 20
nvm alias default 20
```

**Windows**:用 [nvm-windows](https://github.com/coreybutler/nvm-windows/releases),装完:
```powershell
nvm install 20.20.2
nvm use 20.20.2
```

验证:
```bash
node -v   # 应显示 v20.x.x
npm -v    # 应显示 10.x.x
```

### 2. Git

```bash
# macOS
brew install git

# Ubuntu
sudo apt-get install git

# Windows
# 下载 https://git-scm.com/download/win
```

**首次使用配置**:
```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
git config --global core.autocrlf input    # 强烈建议,避免 CRLF/LF 混乱
git config --global init.defaultBranch main
```

### 3. MySQL 8.x

#### 选项 A:本机装(推荐 Docker)

```bash
docker run -d \
  --name pig-mysql \
  -e MYSQL_ROOT_PASSWORD=local_dev_pass \
  -e MYSQL_DATABASE=pig \
  -p 3306:3306 \
  -v pig-mysql-data:/var/lib/mysql \
  mysql:8.0
```

#### 选项 B:远程连服务器的 MySQL

不推荐共用,会污染数据。除非你只读探索。

### 4. Redis 7.x

```bash
docker run -d --name pig-redis -p 6379:6379 redis:7-alpine
```

或:
```bash
# macOS
brew install redis && brew services start redis
# Ubuntu
sudo apt-get install redis-server
```

### 5. 微信开发者工具

下载:[https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

> 开发期记得勾选 **「不校验合法域名、TLS 版本以及 HSTS」**(右上角详情 → 本地设置)

### 6. HBuilderX(打 APP 必装,做小程序可暂不装)

下载:[https://www.dcloud.io/hbuilderx.html](https://www.dcloud.io/hbuilderx.html)
**下载"App开发版"**,带 uni-app 编译能力。

---

## 二、强烈推荐

| 工具 | 用途 |
|---|---|
| **VSCode** | IDE,装下面这些扩展 |
| **Cursor**(可选) | AI 编辑器(我们这套文档对它友好) |
| **Postman** 或 **Apifox** | 调 API |
| **DBeaver** 或 **TablePlus** | 看 MySQL |
| **Another Redis Desktop Manager** | 看 Redis |

### VSCode 扩展(必装)

```
ESLint              dbaeumer.vscode-eslint
Prettier            esbenp.prettier-vscode
Vue Language        Vue.volar
TypeScript Vue      Vue.vscode-typescript-vue-plugin
EditorConfig        EditorConfig.EditorConfig
GitLens             eamodio.gitlens
DotENV              mikestead.dotenv
```

一键安装:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension Vue.volar
code --install-extension Vue.vscode-typescript-vue-plugin
code --install-extension EditorConfig.EditorConfig
code --install-extension eamodio.gitlens
code --install-extension mikestead.dotenv
```

---

## 三、可选(角色相关)

### 后端开发者

- **TablePlus / DBeaver** — 看数据
- **MySQL Workbench** — 设计表 / 看 ER
- **Mongo Compass**(如果后续接 MongoDB)
- **JMeter** — 压测

### 前端开发者

- **Figma 桌面版** — 看设计稿
- **uView UI / uni-ui 文档收藏夹**

### 部署 / 运维

- **VSCode Remote SSH** 扩展
- **ssh-copy-id**(macOS / Linux 自带,Windows 用 git-bash)
- 在 `~/.ssh/config` 配好 `pig` 别名:
  ```
  Host pig
    HostName 175.24.175.123
    User ubuntu
    IdentityFile ~/.ssh/pig.pem    # 找老王要 key
  ```

---

## 四、网络环境

- **国内访问 npm**:`npm config set registry https://registry.npmmirror.com`
- **GitHub 慢**:用代理或镜像;实在不行用 [https://kgithub.com](https://kgithub.com)
- **微信开发者工具更新慢**:正常,稍等 5 分钟

---

## 五、验证清单

打开终端,依次执行,每行都要有正确输出:

```bash
node -v                          # v20.x.x
npm -v                           # 10.x.x
git --version                    # 任意版本
docker ps                        # 没报错即可(确认 docker 在跑)
docker exec pig-mysql mysql -uroot -plocal_dev_pass -e 'SELECT 1'    # 1
docker exec pig-redis redis-cli ping                                  # PONG
ssh pig 'whoami'                 # ubuntu(如果你被加为合作者)
```

✅ 全部通过 → 进入下一步:[`local-setup.md`](./local-setup.md)
