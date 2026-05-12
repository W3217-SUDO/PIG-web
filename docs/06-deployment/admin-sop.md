# 🛠 运营 SOP(Standard Operating Procedure)

> v1.0.0 没有 GUI 管理后台;**运营所有操作走 Navicat 直连数据库**。
> 本文是「跟随我操作」级别的步骤手册,新运营按这个走应该能独立发猪 / 处理订单。

> 上游 → [`../ROADMAP.md`](../ROADMAP.md) 第 1.3 节(运营妥协目标)
> 服务器现状 → [`../snapshot/server.md`](../snapshot/server.md)
> 仓库管理 SQL 脚本 → `scripts/admin/*.sql.template`

---

## 0. 出问题找谁?

- **生产服务器挂了** → 后端 / 部署负责人
- **小程序审核问题** → Owner(只有 Owner 能动微信公众平台后台)
- **支付 / 财务异常** → Owner + 后端 双人确认
- **客户投诉某头猪** → 先查猪 / 订单 / 农户,实在不清楚找产品

---

## 1. 连接数据库(每次操作前必做)

### 1.1 准备工具

- **Navicat Premium**(推荐;国内常用)
- 或 **DBeaver Community**(免费替代)
- 或 命令行 `mysql -h ... -u pig_app -p` (高手用)

### 1.2 通过 SSH 隧道连(安全的唯一方式)

服务器 MySQL **只监听 127.0.0.1**,从外网连不到。必须**通过 SSH 隧道**:

#### Navicat 配置

```
新建 MySQL 连接:
  常规标签:
    连接名: pig-prod
    主机: 127.0.0.1
    端口: 3306
    用户名: pig_app
    密码: <从 ssh pig 'cat ~/.pig-secrets' 取 MYSQL_APP_PASS>
    数据库: pig

  SSH 标签 (勾选"使用 SSH 隧道"):
    主机: 175.24.175.123
    端口: 22
    用户名: ubuntu
    身份验证方法: 公钥
    私钥: C:\Users\<你>\.ssh\pig (或拷贝过来的)
```

测试连接 → 成功 → 保存。

#### 命令行隧道(替代)

```bash
# 本地另开一个终端,建隧道(不要关)
ssh -L 13306:127.0.0.1:3306 pig

# 然后连本机 :13306
mysql -h 127.0.0.1 -P 13306 -u pig_app -p pig
```

---

## 2. 发布一头新猪(最常做的操作)

### 2.1 准备素材

- 猪的封面图(竖屏 4:5 或方图,< 1MB)→ 上传到图床(腾讯云 COS / 阿里云 OSS / 七牛),拿到 URL
- 视频(可选,30 秒预录)→ 同上,拿到 URL
- 描述文案(品种 / 农户 / 山区 / 餐食 / 月龄)
- 给哪个农户(取 `farmer.id`)

### 2.2 SQL 模板

> 用 `scripts/admin/new-pig.sql.template`,复制后改值。**注意 ULID 必须 26 位,可以用在线生成器**:[ulidtools.com](https://ulidtools.com)

```sql
-- 1. 查可用农户
SELECT id, name, region, years FROM farmer ORDER BY created_at DESC;

-- 2. 插入新猪(ULID 主键, listed_at 用当前时间)
INSERT INTO pig (
  id, merchant_id, title, description, breed,
  farmer_id, region,
  weight_kg, expected_weight_kg, price_per_share,
  total_shares, sold_shares,
  cover_image, mock_video_url,
  status, listed_at
) VALUES (
  '01J5XXXXXXXXXXXXXXXXXXXXXX',  -- ULID(在线生成)
  '01J5MERCHANTPLACEHOLDER000',   -- 占位 merchant_id(v2 接真实商户)
  '黑土豚 · 老李三号',             -- title
  '川北黑猪 · 老李农户散养,海拔 1200 米。粗粮 + 山泉,12 个月慢养。',
  '黑土猪',                       -- breed
  '01KRD8CTXSNAV6FZPWT0MHR3DQ',  -- 农户 id (从上面查)
  '广元',                         -- region (跟农户对齐)
  35.50,                          -- 当前体重 kg
  170.00,                         -- 预期出栏 kg
  830.00,                         -- 每份价格
  10,                             -- 总份数
  0,                              -- sold_shares(必须 0)
  'https://your-cdn/pig-3.jpg',  -- 封面 URL
  'https://your-cdn/pig-3.mp4',  -- 视频 URL(可空字符串)
  'listed',                       -- 上架
  NOW(3)
);

-- 3. 验证
SELECT id, title, status FROM pig ORDER BY created_at DESC LIMIT 5;
```

### 2.3 验证

- 小程序首页 / H5 首页 → 下拉刷新 → 看到新猪卡片 ✓
- 点进详情 → 封面 / 农户 / 视频 都正常 ✓

---

## 3. 改订单状态(只有特殊情况手动)

> ⚠️ **正常订单流程全自动**(下单 → 支付 → 状态自动转)。**只有以下场景需要手动改**。

### 3.1 状态枚举

| status | 含义 | 何时手动改 |
|---|---|---|
| `pending` | 待支付 | 不该手动 |
| `paid` | 已支付 | 不该手动 |
| `cancelled` | 已取消 | 用户求助说"我取消不了"时(应该是 bug) |
| `refunded` | 已退款 | 财务确认退款打回去后 |

### 3.2 退款流程(常见)

```sql
-- 1. 先看订单完整情况
SELECT o.id, o.status, o.total_price, o.user_id, p.title
FROM `order` o
LEFT JOIN pig p ON p.id = o.pig_id
WHERE o.id = '<订单 id>';

-- 2. 走商户号后台真实退款(不在本 SOP 范围,Owner 操作)

-- 3. 退款打回后,改状态
UPDATE `order`
SET status = 'refunded'
WHERE id = '<订单 id>' AND status = 'paid';

-- 4. 给 pig 释放份额(让其他人可以认领)
UPDATE pig p
INNER JOIN `order` o ON o.pig_id = p.id
SET p.sold_shares = p.sold_shares - o.shares_count,
    p.status = IF(p.sold_shares < p.total_shares, 'listed', p.status)
WHERE o.id = '<订单 id>';

-- 5. 写一条钱包流水(记账)
INSERT INTO wallet_transaction (id, wallet_id, user_id, direction, type, amount, balance_after, related_id, note)
SELECT
  '01J5XXX...',           -- ULID
  w.id,
  w.user_id,
  'in',
  'refund',
  o.total_price,
  w.balance + o.total_price,
  o.id,
  CONCAT('订单 ', SUBSTRING(o.id, 1, 12), ' 退款')
FROM `order` o
INNER JOIN wallet w ON w.user_id = o.user_id
WHERE o.id = '<订单 id>';

-- 6. 给用户发一条消息
INSERT INTO message (id, user_id, type, title, content, related_id, is_read)
SELECT '01J5XXX...', user_id, 'order_cancelled',
  '退款已到账',
  CONCAT('订单 ', SUBSTRING(id, 1, 12), '… 已退款 ¥', total_price),
  id, 0
FROM `order` WHERE id = '<订单 id>';
```

⚠️ 退款是**最容易出错的操作**——上面 SQL 必须**全部成功才算完**,任一失败要 rollback。建议用事务:

```sql
START TRANSACTION;
-- ... 上面所有 UPDATE/INSERT ...
-- 检查结果,如果都对:
COMMIT;
-- 如果有任何错:
-- ROLLBACK;
```

---

## 4. 给用户手动充值(用于补偿)

**只在客服处理客诉、Owner 批准后才能做**。

```sql
-- 假设要给用户充 ¥100
SET @user_id = '<用户 id>';
SET @amount = 100.00;

START TRANSACTION;

-- 1. 取或建钱包
INSERT IGNORE INTO wallet (id, user_id, balance, frozen)
VALUES ('01J5XXX...', @user_id, 0.00, 0.00);

-- 2. 加余额
UPDATE wallet SET balance = balance + @amount WHERE user_id = @user_id;

-- 3. 写流水
INSERT INTO wallet_transaction (id, wallet_id, user_id, direction, type, amount, balance_after, related_id, note)
SELECT '01J5XXX...', id, user_id, 'in', 'adjust', @amount, balance, '', '运营补偿'
FROM wallet WHERE user_id = @user_id;

-- 4. 发消息
INSERT INTO message (id, user_id, type, title, content, is_read)
VALUES ('01J5XXX...', @user_id, 'system',
  '收到 ¥100 补偿', '感谢你的反馈,补偿已到账。', 0);

COMMIT;
```

---

## 5. 常用查询(SQL 速查)

### 5.1 看今日新增订单

```sql
SELECT o.id, o.status, p.title, u.nickname, o.total_price, o.created_at
FROM `order` o
LEFT JOIN pig p ON p.id = o.pig_id
LEFT JOIN user u ON u.id = o.user_id
WHERE o.created_at >= CURDATE()
ORDER BY o.created_at DESC;
```

### 5.2 看某用户的完整画像

```sql
SET @uid = '<用户 id>';
SELECT 'user' as kind, JSON_OBJECT('nickname', nickname, 'role', role) as data FROM user WHERE id = @uid
UNION ALL
SELECT 'wallet', JSON_OBJECT('balance', balance, 'frozen', frozen) FROM wallet WHERE user_id = @uid
UNION ALL
SELECT 'orders', JSON_OBJECT('total', COUNT(*), 'paid', SUM(status='paid')) FROM `order` WHERE user_id = @uid
UNION ALL
SELECT 'addresses', JSON_OBJECT('total', COUNT(*)) FROM address WHERE user_id = @uid;
```

### 5.3 看猪销售情况

```sql
SELECT
  status,
  COUNT(*) as pigs,
  SUM(sold_shares) as total_sold,
  SUM(total_shares) as total_inventory,
  ROUND(SUM(sold_shares) / SUM(total_shares) * 100, 1) as sell_through_pct
FROM pig
GROUP BY status;
```

### 5.4 找滞销的猪

```sql
SELECT id, title, region, sold_shares, total_shares, created_at,
  DATEDIFF(NOW(), created_at) as days_listed
FROM pig
WHERE status = 'listed'
  AND sold_shares = 0
  AND created_at < DATE_SUB(NOW(), INTERVAL 14 DAY)
ORDER BY created_at;
```

---

## 6. 应急流程

### 6.1 误操作怎么办

- **如果改错状态**:`mysql` 默认 autocommit,**改完不能撤**。教训:**复杂操作必须在 BEGIN ... COMMIT 块里**。
- **如果删错记录**:Navicat 有"二进制日志"恢复,但要 30 分钟内联系 DBA。**建议养成 SELECT 先看的习惯**。
- **如果误把测试数据上线**:走 [§7] 恢复 seed。

### 6.2 服务器突然挂了

1. `ssh pig` 看是否能连上
2. `systemctl status mysql redis-server nginx` 三个服务
3. `pm2 list` 看后端进程
4. 通知后端 / 部署负责人

### 6.3 怎么找谁在 SSH

```bash
ssh pig
who -a
last -10
```

---

## 7. 数据快照与恢复

### 7.1 每日自动备份(等 W3 接入)

服务器有 cron 每天凌晨 3 点 mysqldump → `/opt/pig/shared/backups/<date>.sql.gz`。

### 7.2 手动备份

```bash
ssh pig
mysqldump -u root -p$(grep MYSQL_ROOT_PASS ~/.pig-secrets | cut -d= -f2) \
  --single-transaction --routines pig > /tmp/pig-$(date +%F).sql
```

### 7.3 恢复

```bash
ssh pig
mysql -u root -p$(grep MYSQL_ROOT_PASS ~/.pig-secrets | cut -d= -f2) pig < /tmp/pig-2026-05-12.sql
```

⚠️ **恢复会覆盖现有数据**,操作前必须双人确认。

---

## 8. 跟开发的协作

- **发现 bug** → 在 GitHub Issues 提单(`bug` label)+ 截图 + 复现步骤 + 影响的订单/用户 ID
- **需求改动** → 在 Issues 提单(`feat` label)+ 用户场景
- **数据异常** → 直接 IM 找后端,**附 SQL 查询结果**

---

## 9. 安全约定 ⚠️

- **不要把 SQL 查询结果(含用户手机号 / 地址)截图发到外部群**
- **不要把 ~/.pig-secrets 复制到本机长期保存**
- **不要在公共 WiFi 操作 Navicat**
- **离职前必须撤销 SSH key 访问权限**
- **每次操作前先 `SELECT` 看,确认范围**

---

## 链接

- ROADMAP → [`../ROADMAP.md`](../ROADMAP.md)
- 服务器现状 → [`../snapshot/server.md`](../snapshot/server.md)
- 详细服务器手册 → [`../01-getting-started/server-setup.md`](../01-getting-started/server-setup.md)
- 数据库 schema → [`../03-backend/database.md`](../03-backend/database.md)
