# 发版流程

> 从「写完代码」到「线上跑起来」的完整 SOP。

---

## 一、发版节奏

| 类型 | 频率 | 触发 |
|---|---|---|
| **热修复** | 随时 | bug 影响用户 → 立即修 → 立即发 |
| **功能小版本** | 1-2 次/周 | feature 分支合并即发 |
| **大版本(里程碑)** | 月度 | MVP / 拼猪 / 直播等 |
| **数据库迁移** | 跟随版本 | 加表 / 加字段 |

---

## 二、发版前 Checklist

每次发版前(代码 push 前)自检:

- [ ] `npm run lint` 通过
- [ ] `npm -w backend run test` 通过
- [ ] 改了 entity 是否生成迁移?
- [ ] 改了 .env 字段是否更新 `.env.example`?
- [ ] 改了 API 是否更新 `docs/03-backend/api-spec.md`?
- [ ] 改了功能是否更新 changelog?
- [ ] 改了高危逻辑(支付 / 钱包)是否有 review?
- [ ] commit message 是否清晰可读?

---

## 三、标准流程

### 1. 开发分支

```bash
git checkout -b feat/some-feature main
# 写代码...
git commit -m "feat(xxx): 描述"
git push origin feat/some-feature
```

### 2. 发 PR

GitHub 上发 Pull Request:
- Title:与 commit 一致的格式
- 描述:用 PR 模板填(自动加载)
- 关联 Issue:`Closes #123`
- Reviewer:指定另一位
- Labels:`feat` / `fix` / `chore` / `docs`

### 3. CI 通过 + 1 人 review

### 4. Squash & Merge

在 GitHub 上用 **Squash and Merge**:
- 主分支历史保持线性
- 一次 PR = 一个 commit

### 5. 自动部署

合并到 main 后:
- `.github/workflows/deploy-backend.yml` 自动跑(如改了后端代码)
- 看 GitHub Actions tab 实时状态

### 6. 验证

```bash
# 健康检查
curl https://www.rockingwei.online/api/health

# 看 PM2
ssh pig 'pm2 list'

# 看实时日志
ssh pig 'tail -f /opt/pig/logs/app.log'

# 真机测一下关键流程(下单 / 看猪 / 拼猪)
```

### 7. 通知

如果是大版本或有 breaking change:
- 群里发个通知 + commit hash + 主要变化
- 必要时通知用户(站内消息)

---

## 四、版本号

遵循 [Semantic Versioning](https://semver.org/):

```
v<MAJOR>.<MINOR>.<PATCH>
```

| 字段 | 何时 +1 |
|---|---|
| MAJOR | 不向下兼容的变更(API 大改 / DB 大改) |
| MINOR | 新功能,向下兼容 |
| PATCH | bug 修复 / 文档 |

打 tag:
```bash
git tag -a v0.2.0 -m "feat: 完成拼猪 MVP"
git push origin v0.2.0
```

---

## 五、Hotfix 流程

### 场景:线上严重 bug,要立刻修

```bash
# 1. 从 main 切 hotfix 分支
git checkout -b hotfix/wallet-balance-bug main

# 2. 修 bug,加单测
git commit -m "fix(wallet): 修复并发扣款竞态导致余额错乱"

# 3. push + PR + 紧急 review
# 4. CI 通过后立即合并
# 5. 部署
```

如果**真的非常紧急**(用户在掉单),允许:
- 直接 SSH 改服务器代码(应急,事后必须补回 git)
- 不走 PR(commit 后再补 review)

但这种情况一年不应该超过 2 次。

---

## 六、数据库迁移发版

### 兼容性原则

把每次 DB 变更分两类:

| 类型 | 例 | 影响 |
|---|---|---|
| **兼容**(老代码也能跑) | 加表 / 加可空字段 / 加索引 | 安全,先迁移再发应用 |
| **不兼容**(老代码会挂) | 删字段 / 改类型 / 加非空字段 | 危险,需要分两步 |

### 不兼容变更的分步骤发版

例:把 `users.phone` 从可空改成必填。

**两步走**:

```
第 1 次发版:
  - 新增数据库 trigger / 默认值,确保新数据有 phone
  - 后端 service 层兼容老数据(空时填 'unknown')
  - 上线

第 2 次发版(等老数据全清理后):
  - 删 trigger
  - ALTER 改为 NOT NULL
  - 后端 service 层去掉兼容代码
  - 上线
```

**绝对禁止**:把 `ALTER TABLE users MODIFY phone VARCHAR(20) NOT NULL` 直接放进迁移就发版——线上数据如果有 NULL,迁移直接失败。

### 备份

每次重大迁移**前**自动备份:

```bash
# 部署脚本里加
ssh pig 'mysqldump -uroot -p$(grep MYSQL_ROOT_PASS ~/.pig-secrets | cut -d= -f2) pig > /opt/pig/backups/pre-migration-$(date +%Y%m%d_%H%M%S).sql'
```

---

## 七、备份策略

### 自动备份

`/opt/pig/scripts/db-backup.sh`(cron 每天凌晨 3:00 执行):

```bash
#!/usr/bin/env bash
set -e

DATE=$(date +%Y%m%d)
BACKUP_DIR=/opt/pig/backups
mkdir -p $BACKUP_DIR

# MySQL 全库 dump + gzip
mysqldump -uroot -p$(grep MYSQL_ROOT_PASS ~/.pig-secrets | cut -d= -f2) \
  --single-transaction --quick --routines \
  pig | gzip > $BACKUP_DIR/pig-$DATE.sql.gz

# 上传到对象存储(腾讯云 COS / 阿里云 OSS,后续配置)
# coscli cp $BACKUP_DIR/pig-$DATE.sql.gz cos://pig-backup/

# 清理本地 30 天前
find $BACKUP_DIR -name "pig-*.sql.gz" -mtime +30 -delete
```

crontab:
```
0 3 * * * /opt/pig/scripts/db-backup.sh >> /opt/pig/logs/backup.log 2>&1
```

### 恢复

```bash
gunzip < /opt/pig/backups/pig-20260510.sql.gz | mysql -uroot -p pig
```

---

## 八、回滚

### 应用层

```bash
ssh pig << 'EOF'
cd /opt/pig
ls -1t releases/ | head -10            # 看 release 列表
ln -sfn /opt/pig/releases/<目标版本> current
pm2 reload pig-backend --update-env
EOF
```

回滚是**秒级**操作。

### 数据库层

```bash
ssh pig 'cd /opt/pig/current/backend && npm run migration:revert'
```

注意:**只回退一步**。如果发了多次迁移,要多次 revert。

### 极端情况

- 应用代码新版本依赖新表 → 不能只回退应用
- 必须**先回退应用 + 再回退迁移**
- 如果迁移已写入数据 → 不能简单回滚 → 用备份恢复(最后手段)

---

## 九、灰度发布(后续)

当前规模不需要灰度。等 DAU > 1k 后考虑:

- nginx upstream 按比例分流
- 5% → 50% → 100% 三阶段
- 看错误率监控决定是否继续

---

## 十、发版日志(Changelog)

写在 `CHANGELOG.md`(根目录):

```markdown
# Changelog

## [Unreleased]

## [0.2.0] - 2026-05-15
### Added
- 拼猪功能(主认领人 + 分享码 + 成员管理)
- 微信支付集成

### Changed
- 养殖周期 9–10 个月 → 10–12 个月

### Fixed
- 修复钱包扣款竞态

## [0.1.0] - 2026-05-09
### Added
- 项目初始化
- 静态原型
```

每次发版**先更新 Changelog 再打 tag**。

---

## 十一、紧急停服

如果出现严重事故必须停服:

```bash
# 立即返回维护页
ssh pig << 'EOF'
sudo tee /etc/nginx/snippets/maintenance.conf > /dev/null << NGINX
location / {
  return 503;
}
error_page 503 /maintenance.html;
NGINX
sudo cp /var/www/html/pig-maintenance/maintenance.html /var/www/html/
sudo systemctl reload nginx
EOF

# 恢复
ssh pig 'sudo rm /etc/nginx/snippets/maintenance.conf && sudo systemctl reload nginx'
```

> 这个维护页需要预先准备。后续做。

---

## 十二、上线第一头猪 SOP(里程碑)

第一个真实用户的真实认领:

1. owner 双人在线 review
2. 启动 Sentry / 监控
3. 备份数据库
4. 给用户开 VIP 标记(便于追溯)
5. 跟踪 24 小时
6. 复盘 + 写报告
