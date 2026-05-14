# 协作流程

> 分支策略、Commit 规范、PR 模板。**所有人统一遵守**。

---

## 一、分支模型(2026-05-14 起)

```
main                       稳定发布分支,只接受来自 dev 的合并 + 打 tag
 │
dev                        日常开发集成分支,所有 feature 完工后合并到这里
 │
 ├─ feature/xxx            新功能开发
 ├─ fix/xxx                bug 修复
 ├─ hotfix/xxx             紧急修复(线上,可直接合 main + 回灌 dev)
 ├─ chore/xxx              杂项(依赖升级、配置)
 ├─ docs/xxx               纯文档
 └─ refactor/xxx           重构(行为不变)
```

**长期分支**:`main`、`dev` 两条,其他都是短期(完工就删)。

### 流程图

```
feature/xxx ──(完工合并)──> dev ──(发布合并 + tag)──> main
                              ↑                          │
                              └────(hotfix 回灌)──────────┘
```

- **不要**直接 push 到 `main`(发布以外的所有改动必须经过 dev)
- **不要**直接 push 到 `dev`(短改动也要走 feature 分支,虽然 trivial 改可口头放宽)
- `main` 上每次合并 dev 之后,**必须**打一个 `vX.Y.Z` tag

### 命名约定

```
<type>/<topic-kebab>
```

例:
- `feature/share-claim` — 拼猪功能
- `fix/wallet-balance-race` — 钱包余额竞态
- `hotfix/pay-callback-sign` — 支付回调签名应急修
- `chore/upgrade-nestjs-10.4`
- `docs/add-postman-collection`

> **Claude Code 的 `claude/<worktree-name>` 分支**:当作 feature 分支使用,合并目标为 **dev**,合完即删。

---

## 一·五、发布流程(tag 版本号管理)

**起点**:`v1.0.0`(MVP 5/31 上线那一刻)。

**版本号语义**(SemVer):`vMAJOR.MINOR.PATCH`

| 改动类型 | 版本变更 | 例 |
|---|---|---|
| 兼容性破坏 / 大版本迭代 | MAJOR +1 | v1.x.x → v2.0.0 |
| 新功能(向下兼容) | MINOR +1 | v1.0.x → v1.1.0 |
| bug 修复 / 小调整 | PATCH +1 | v1.0.0 → v1.0.1 |

**操作步骤**(发布人执行):

```bash
# 1. 确保 dev 已经稳定,所有 feature 已合并
git checkout dev && git pull origin dev

# 2. 合并到 main
git checkout main && git pull origin main
git merge --ff-only dev          # 必须 fast-forward,有冲突先回 dev 解决

# 3. 打 tag
git tag -a v1.0.0 -m "v1.0.0 · MVP 上线"

# 4. 推 main + tag
git push origin main --follow-tags

# 5. 把 main 的 tag 回灌 dev(可选,避免分歧)
git checkout dev && git merge --ff-only main
git push origin dev
```

**hotfix(线上 bug 应急)流程**:

```bash
# 1. 从 main 切 hotfix
git checkout main && git pull
git checkout -b hotfix/pay-callback-sign

# 2. 改完提交、合并 main + 打 tag(PATCH +1)
git checkout main && git merge --no-ff hotfix/pay-callback-sign
git tag -a v1.0.1 -m "v1.0.1 · hotfix: pay-callback 签名"
git push origin main --follow-tags

# 3. 回灌 dev,删 hotfix 分支
git checkout dev && git merge main && git push origin dev
git branch -d hotfix/pay-callback-sign
```

---

## 二、Commit Message 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[body 可选]

[footer 可选]
```

### type

| type | 含义 |
|---|---|
| `feat` | 新功能 |
| `fix` | bug 修复 |
| `refactor` | 重构(行为不变) |
| `perf` | 性能优化 |
| `docs` | 文档 |
| `style` | 代码格式(空格 / 分号),不影响逻辑 |
| `test` | 测试相关 |
| `chore` | 杂项(依赖升级 / 构建配置) |
| `ci` | CI/CD 改动 |
| `build` | 构建系统改动 |

### scope(可选,但推荐)

- 模块名:`feat(share): ...`, `fix(order): ...`
- 端:`feat(frontend): ...`, `fix(backend): ...`
- 文件类:`docs(api): ...`

### subject

- 50 字内
- 动词开头(中文不需要),不要句号
- 描述"做了什么",不是"为什么"(为什么写在 body)

### body(改大功能时必填)

- 解释**为什么**这么做
- 列出关键改动
- 不要复读 subject

### footer

- 关联 Issue:`Closes #123`
- Breaking change:`BREAKING CHANGE: ...`
- Co-author:`Co-Authored-By: Name <email>`

### 例子

```
feat(share): 实现拼猪邀请流程

新增功能:
- 主认领人可生成 6 位分享码
- 受邀人凭码加入,加入后能看直播 / 喂养 / 健康
- 最多 3 家 / 1 个订单
- 主认领人可踢人 / 解散

约束:
- 平台不参与分肉分钱,产品 hard rule
- share_code TTL 30 天

Closes #42
```

```
fix(wallet): 修复并发扣款导致余额错乱

并发场景:
- 用户同时下单 + 充值
- 旧实现:两个 UPDATE 用 BALANCE = BALANCE - X,没锁,导致重叠

修复:
- 加 SELECT ... FOR UPDATE,在同一事务内
- 加 version 列做乐观锁双保险

测试:
- 加并发测试用例(100 个并发请求)
```

---

## 三、Pull Request

### PR 标题

跟 commit message 一样格式:

```
feat(share): 实现拼猪邀请流程
```

### PR 描述模板

仓库已配 [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md),发 PR 时自动加载。

### 改动量

- 一个 PR **聚焦一件事**
- 改动 ≤ 500 行(超出考虑拆 PR)
- 不要把"格式化代码"和"业务改动"混在一个 PR

### Review

- 至少 **1 人** review
- 涉及**钱**(支付 / 钱包) → **2 人** review
- 涉及**安全**(密钥 / 鉴权) → **2 人** review + owner
- 涉及**数据库迁移** → owner review

### Squash & Merge

GitHub 上点 **"Squash and merge"**,一个 PR → 一个干净的 commit 进 main。

不要用 "Merge commit"(history 乱) / "Rebase and merge"(没有 squash 干净)。

---

## 四、Issue

### Bug 报告

用 [`.github/ISSUE_TEMPLATE/bug.md`](../../.github/ISSUE_TEMPLATE/bug.md) 模板,必填:
- 复现步骤
- 期望 vs 实际
- 环境(dev / staging / prod)
- 日志 / 截图

### Feature 请求

用 [`.github/ISSUE_TEMPLATE/feature.md`](../../.github/ISSUE_TEMPLATE/feature.md) 模板,必填:
- 用户故事("作为 X 我想 Y 以便 Z")
- 验收标准
- 优先级建议

### Issue 标签

| Label | 用途 |
|---|---|
| `bug` | 缺陷 |
| `feat` | 新功能 |
| `chore` | 杂事 |
| `docs` | 文档 |
| `urgent` | 紧急(线上影响) |
| `discussion` | 需要讨论 |
| `blocked` | 等外部依赖 |
| `good-first-issue` | 适合新人 |
| `wontfix` | 不做 |
| `duplicate` | 重复 |
| `P0` / `P1` / `P2` / `P3` | 优先级 |

---

## 五、Code Review 准则

### Reviewer 视角

- ✅ **变量命名 / 边界处理 / 错误处理**(最常出问题)
- ✅ 是否符合本仓的规范(模块 / 命名 / 日志 / DTO 校验)
- ✅ 有没有性能 / 安全坑
- ✅ 测试覆盖关键路径
- ❌ 不纠结风格细节(ESLint / Prettier 解决了)

### 评论口吻

- ✅ 提建议:"这里能不能用 X 替代,理由是 ..."
- ✅ 提问:"我没看懂这里,能解释下吗?"
- ❌ 命令式:"改成 X"
- ❌ 人身:"这写得太烂了"

### 标注

- `nit:` 鸡毛蒜皮(可忽略)
- `suggestion:` 建议(可参考)
- `blocking:` 必须改才能 merge
- `question:` 求解释

### 作者视角

- 收到 review 24 小时内回复(忙就说"明天处理")
- 不接受的建议要说明理由
- 改完一条 → 单独回复"已改 / 见 commit xxx"

---

## 六、合作者的日常

### 早上

```bash
# 1. 拉最新 main
git checkout main
git pull origin main

# 2. 看新 PR / Issue
gh pr list
gh issue list --label P0

# 3. 看 CI 状态(有挂的先修)
```

### 开发一个新功能

```bash
# 1. 切分支
git checkout -b feat/some-feature

# 2. 看相关文档
# - docs/03-backend/modules.md(模块定义)
# - docs/03-backend/api-spec.md(API 规范)
# - docs/03-backend/database.md(数据模型)

# 3. 写代码 + 测试
# 4. 本地跑 lint + test
npm run lint
npm -w backend run test

# 5. 提交
git add .
git commit -m "feat(xxx): ..."

# 6. push
git push origin feat/some-feature

# 7. GitHub 发 PR + 指定 reviewer
gh pr create --title "feat(xxx): ..." --body "..."

# 8. 等 review + CI

# 9. merge 后,本地清理
git checkout main
git pull
git branch -d feat/some-feature
```

---

## 七、冲突解决

### 跟 main 有冲突

```bash
git checkout feat/xxx
git fetch origin
git rebase origin/main
# 解决冲突
git add .
git rebase --continue
git push --force-with-lease    # 注意 with-lease 不是 force
```

### 跟队友的分支有冲突(都基于同一文件)

- 沟通!先 merge 谁,谁先发 PR
- 后发的人 rebase 前发的人

---

## 八、紧急修复(Hotfix)

```bash
# 1. main → hotfix
git checkout -b hotfix/wallet-bug main

# 2. 修
git commit -m "fix: ..."

# 3. PR + 紧急 review(同事 / owner)
# 4. CI 通过即 merge
# 5. 自动部署 main → 生产
```

如果**确实**紧急到不能等 PR(用户在掉钱):
- SSH 改服务器代码先止血
- 同时把改动补回 PR
- 事后写 ADR

---

## 九、回滚一个 PR

发现刚 merge 的 PR 有问题:

```bash
# 找到 commit
git log --oneline

# 用 revert(保留历史,推荐)
git revert <bad-commit-sha>
git push origin main
```

不要直接 `git reset --hard + force push`,主分支历史不能重写。

---

## 十、忌做的事 ❌

- ❌ **force push main**
- ❌ **直接 push main**(必须走 PR)
- ❌ commit 进 `.env` / 密钥
- ❌ commit 进生成产物(dist / node_modules)
- ❌ commit 进个人 IDE 配置(`.vscode/`)
- ❌ 在 main 上写"WIP"
- ❌ Squash 几十个 commit 进一个,信息量丢失(应该开多个 PR)
- ❌ "我先合了,下次再补 review"——除非真正紧急,事后必须补 review

---

## 十一、约定时间

- PR 24 小时内有人 review
- 不 block 急事:有"FAST-TRACK" 标的 PR 任何人立即 review
- 周末不要求 review(除非紧急)
