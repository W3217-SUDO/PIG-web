# GitHub 一次性配置

> 第一次使用本仓库,GitHub 上需要做 4 件事(只做一次)。

---

## 1. 配置 Actions Secrets(部署用)

GitHub → 仓库 `PIG-web` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name | Value |
|---|---|
| `SSH_HOST` | `175.24.175.123` |
| `SSH_KEY` | (服务器上 `~/.ssh/github-deploy` 文件的**完整内容**,含 BEGIN/END 行) |

获取 SSH_KEY 内容:
```bash
ssh pig 'cat ~/.ssh/github-deploy'
```

> ⚠️ 这个私钥**只能**登录 `175.24.175.123` 的 ubuntu 用户(已配 authorized_keys),无法登录任何 GitHub 账号。即便如此也要保密。

## 2. 邀请合作者

GitHub → 仓库 → **Settings** → **Collaborators** → **Add people**

合作者收到邀请邮件,接受后即可 push 分支 / 发 PR。

加入后,**更新 `.github/CODEOWNERS`**,把对应路径加上 `@<合作者 GitHub username>`。

## 3. 开 main 分支保护

GitHub → 仓库 → **Settings** → **Branches** → **Add branch protection rule**

设置:
- **Branch name pattern**:`main`
- ✅ Require a pull request before merging
  - ✅ Require approvals: **1**
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners
- ✅ Require status checks to pass before merging
  - Status check: `lint-build` `backend-test`(从 CI workflow 自动检测出来)
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings
- ❌ Allow force pushes(关闭)
- ❌ Allow deletions(关闭)

保存。从此 main 分支只能通过 PR 合并 + CI 必须绿。

## 4. 开 GitHub Actions 权限(默认开,确认一下)

GitHub → 仓库 → **Settings** → **Actions** → **General**

- **Actions permissions**:`Allow all actions and reusable workflows`
- **Workflow permissions**:`Read and write permissions`(让 Actions 能 push tag 等)

---

## 验证清单

完成以上 4 步后,做一次验证:

```bash
# 在本地仓库
git checkout -b test/ci-trigger
echo "# test" > docs/_ci_test.md
git add . && git commit -m "test: trigger ci"
git push origin test/ci-trigger
# GitHub 发 PR
```

期望:
- ✅ GitHub Actions 自动跑 CI workflow(看仓库 Actions tab)
- ✅ CODEOWNERS 自动指派 Reviewer(你自己)
- ✅ 不通过 1 人 approve,Merge 按钮灰着

通过 → 删测试 PR + 测试分支。

---

## 后续:邀请合作者后

1. 让合作者 `git clone https://github.com/W3217-SUDO/PIG-web.git`
2. 让合作者跑 `docs/01-getting-started/local-setup.md`
3. 修改 `.github/CODEOWNERS`,补 username:
   ```diff
   - /frontend/    @W3217-SUDO
   + /frontend/    @W3217-SUDO @your-partner
   ```
