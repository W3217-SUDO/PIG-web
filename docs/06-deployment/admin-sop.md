# 运营 SOP

版本：2026-06-05

适用范围：v1.0 上线前后没有完整 GUI 管理后台时，运营通过 SSH 隧道 + 数据库模板完成发猪、订单状态调整、钱包补偿和日常巡检。

关联文件：

- SQL 模板：`scripts/admin/*.sql.template`
- 部署手册：[`deploy-runbook.md`](./deploy-runbook.md)
- 小程序提审清单：[`miniapp-submit-checklist.md`](./miniapp-submit-checklist.md)
- 服务器快照：[`../snapshot/server.md`](../snapshot/server.md)

## 1. 操作原则

1. 生产数据只允许用模板操作，不直接手写临时 SQL。
2. 每次操作先建工单或记录，写清楚原因、操作者、审批人、影响用户/订单/猪只 ID。
3. 先跑模板里的预览 `SELECT`，确认目标只有预期记录。
4. 复杂写操作必须在 `START TRANSACTION` 后执行，验证结果正确再手动 `COMMIT`。
5. 支付、退款、钱包、库存相关操作必须双人确认。
6. 不截图外发用户手机号、地址、openid、session_key、JWT、微信支付信息。

## 2. 连接生产数据库

推荐使用 Navicat 或 DBeaver，通过 SSH 隧道连接，数据库不要暴露公网。

连接参数：

```text
SSH Host: 175.24.175.123
SSH User: ubuntu
SSH Auth: 私钥

MySQL Host: 127.0.0.1
MySQL Port: 3306
Database: pig
User: pig_app
Password: 从服务器 ~/.pig-secrets 中读取 MYSQL_APP_PASS
```

命令行隧道替代方案：

```bash
ssh -L 13306:127.0.0.1:3306 pig
mysql -h 127.0.0.1 -P 13306 -u pig_app -p pig
```

读取密钥时只在服务器本机查看，不复制到聊天工具：

```bash
ssh pig 'grep -E "^(MYSQL_APP_PASS|MYSQL_DATABASE)=" ~/.pig-secrets'
```

## 3. 每次操作前检查

服务器健康：

```bash
ssh pig 'curl -fsS http://127.0.0.1:3000/api/health'
ssh pig 'pm2 list'
ssh pig 'tail -n 20 /opt/pig/logs/pig-health-alert.log'
```

数据库备份状态：

```bash
ssh pig 'tail -n 30 /opt/pig/logs/mysql-backup.log'
ssh pig 'ls -lh /opt/pig/shared/backups | tail'
```

如果健康检查、备份或 PM2 异常，先停止运营写操作，联系后端/部署负责人。

## 4. 发布一头新猪

使用模板：`scripts/admin/new-pig.sql.template`

适用场景：

- 新增真实可认养猪只。
- 运营补录农户已有猪只。
- 拼猪模式下，一头猪可被 2-3 家共同认养，库存用 `total_shares` 表示可认养份数。

准备材料：

- 猪只标题，例如 `青川黑土猪 · 老李家 1 号`
- 描述，重点写清楚月龄、农户、喂养方式、家乡年味、可溯源信息
- 农户 `farmer.id`
- 商户/运营账号 `user.id`，填入 `merchant_id`
- 封面图 URL、相册 URL、视频 URL
- 当前体重、预期出栏体重、每份价格、总份数

步骤：

1. 复制模板到本地私有工作文件，例如 `new-pig-2026-06-05.sql`。
2. 替换所有 `TODO_...`。
3. 先执行模板前半段预览 `SELECT`，确认农户和商户账号存在。
4. 执行 `START TRANSACTION` 到验证 `SELECT`。
5. 检查新猪字段：`title`、`farmer_id`、`region`、`price_per_share`、`total_shares`、`status=listed`。
6. 确认无误后取消模板末尾 `-- COMMIT;` 的注释并执行。
7. H5 或小程序首页刷新，确认列表和详情页显示正常。

验收查询：

```sql
SELECT id, title, farmer_id, region, price_per_share, total_shares, sold_shares, status, listed_at
FROM pig
WHERE id = '<PIG_ULID>';
```

## 5. 手动调整订单状态

使用模板：`scripts/admin/order-status-adjust.sql.template`

只允许用于异常处理，不用于替代正常支付/发货流程。

常见场景：

- 客服确认取消未支付订单。
- Owner 确认线下退款后，补记 `refund_pending` 或 `refunded`。
- 发货后补填物流单号。
- 支付回调异常时，后端确认真实支付成功后补状态。

订单状态：

```text
pending         待支付
paid            已支付/认养中
shipped         已发货
delivered       已收货
cancelled       已取消
refund_pending  退款处理中
refunded        已退款
```

操作要求：

1. 先用订单 ID 查询完整上下文，包括用户、猪只、支付流水、份数、当前状态。
2. 支付成功、退款、库存释放必须双人确认。
3. 如果要释放份额，模板里的库存释放 SQL 默认是注释状态，必须确认原状态和份额后再打开。
4. 修改后检查订单状态、猪只 `sold_shares`、消息和支付流水是否一致。

验收查询：

```sql
SELECT
  o.id, o.status, o.pay_method, o.total_price, o.shares_count,
  o.paid_at, o.shipped_at, o.delivered_at, o.refunded_at,
  p.id AS pig_id, p.title, p.sold_shares, p.total_shares, p.status AS pig_status
FROM `order` o
LEFT JOIN pig p ON p.id = o.pig_id
WHERE o.id = '<ORDER_ULID>';
```

## 6. 手动钱包补偿或扣减

使用模板：`scripts/admin/manual-wallet-adjust.sql.template`

适用场景：

- 客服补偿。
- 运营纠错。
- Owner 明确批准的余额调整。

禁止场景：

- 替代真实微信支付充值。
- 无审批给内部测试账号加余额。
- 扣减导致用户余额为负。

操作要求：

1. `@amount` 为正数表示增加余额，负数表示扣减余额。
2. `@reason` 必须写清楚原因。
3. `@operator` 写真实操作者。
4. 模板会写入 `wallet_transaction` 和 `message`，两者都必须验证。
5. `wallet_rows_updated` 必须为 `1`，否则 `ROLLBACK`。

验收查询：

```sql
SELECT id, user_id, balance, frozen, updated_at
FROM wallet
WHERE user_id = '<USER_ULID>';

SELECT id, direction, type, amount, balance_after, note, created_at
FROM wallet_transaction
WHERE user_id = '<USER_ULID>'
ORDER BY created_at DESC
LIMIT 5;
```

## 7. 日常运营查询

今日订单：

```sql
SELECT o.id, o.status, p.title, u.nickname, o.total_price, o.created_at
FROM `order` o
LEFT JOIN pig p ON p.id = o.pig_id
LEFT JOIN user u ON u.id = o.user_id
WHERE o.created_at >= CURDATE()
ORDER BY o.created_at DESC;
```

在售猪只库存：

```sql
SELECT id, title, region, price_per_share, total_shares, sold_shares,
  total_shares - sold_shares AS remaining_shares,
  status, listed_at
FROM pig
WHERE status = 'listed'
ORDER BY listed_at DESC;
```

用户画像：

```sql
SET @uid = '<USER_ULID>';

SELECT id, nickname, phone, role, status, created_at FROM user WHERE id = @uid;
SELECT id, balance, frozen, created_at, updated_at FROM wallet WHERE user_id = @uid;
SELECT id, status, pig_id, shares_count, total_price, created_at FROM `order` WHERE user_id = @uid ORDER BY created_at DESC;
SELECT id, type, title, is_read, created_at FROM message WHERE user_id = @uid ORDER BY created_at DESC LIMIT 20;
```

滞销猪只：

```sql
SELECT id, title, region, sold_shares, total_shares, listed_at,
  DATEDIFF(NOW(), listed_at) AS days_listed
FROM pig
WHERE status = 'listed'
  AND sold_shares = 0
  AND listed_at < DATE_SUB(NOW(), INTERVAL 14 DAY)
ORDER BY listed_at;
```

## 8. 小程序提审前运营检查

1. 至少准备 5 头真实猪只，`status=listed`。
2. 每头猪必须有封面、农户、地区、价格、总份数。
3. 首页能看到猪只卡片。
4. 详情页能看到农户、喂养/健康时间线、可溯源信息。
5. 正式环境不出现 mock 支付入口。
6. 登录、下单、分享拼猪入口在真机上走通。

推荐查询：

```sql
SELECT status, COUNT(*) AS count FROM pig GROUP BY status;

SELECT id, title, cover_image, farmer_id, total_shares, sold_shares, status
FROM pig
ORDER BY created_at DESC
LIMIT 10;
```

## 9. 事故处理

误操作还未 `COMMIT`：

```sql
ROLLBACK;
```

误操作已 `COMMIT`：

1. 立即停止继续操作。
2. 记录时间、操作者、执行过的 SQL、影响 ID。
3. 联系后端/部署负责人。
4. 优先使用反向修正 SQL；只有严重事故才考虑备份恢复。

服务不可用：

```bash
ssh pig 'systemctl status nginx --no-pager'
ssh pig 'systemctl status mysql --no-pager'
ssh pig 'systemctl status redis-server --no-pager'
ssh pig 'pm2 list'
ssh pig 'curl -fsS http://127.0.0.1:3000/api/health'
```

生产 smoke：

```bash
ssh pig 'cd /tmp/pig-smoke-scripts && bash smoke-prod.sh'
```

## 10. 操作记录模板

每次生产操作至少记录以下内容：

```text
时间：
操作者：
审批人：
操作类型：发猪 / 改单 / 钱包调整 / 查询
影响 ID：
原因：
执行模板：
执行前截图或 SELECT 摘要：
执行后 SELECT 摘要：
是否 COMMIT：
是否需要用户通知：
```

## 11. 新运营跟随演练

上线前至少做一次演练：

1. 用模板新增 1 头测试猪，先 `ROLLBACK`。
2. 再新增 1 头真实猪并 `COMMIT`。
3. H5/小程序首页确认展示。
4. 用查询 SQL 找到这头猪。
5. 用订单查询 SQL 查今日订单。
6. 模拟钱包补偿流程，只执行到验证查询，不 `COMMIT`。

演练完成后，把不清楚的步骤补回本文档。
