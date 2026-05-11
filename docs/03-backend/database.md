# 数据库设计

> MySQL 8.0,字符集 `utf8mb4`,排序规则 `utf8mb4_unicode_ci`,引擎 InnoDB。

---

## 一、ER 图(简化)

```
┌─────────┐         ┌──────────┐         ┌──────────┐
│  User   │1───────*│  Order   │*───────1│   Pig    │
└────┬────┘         └────┬─────┘         └────┬─────┘
     │                   │                    │
     │1                  │1                   │1
     │                   │                    │
     │*                  │*                   │*
┌────▼─────┐       ┌─────▼──────┐      ┌──────▼──────┐
│  Wallet  │       │   Share    │      │ FeedingRec  │
└──────────┘       └─────┬──────┘      └─────────────┘
                         │1
                         │
┌────────────┐           │*       ┌────────────┐
│  Farmer    │1*─────────│        │ HealthRec  │
└─────┬──────┘    ┌──────▼──────┐ └────────────┘
      │           │ ShareMember │
      │*          └─────────────┘
      │1
┌─────▼──────┐
│   Pig      │
└────────────┘
```

主关系:
- `User 1 — * Order`
- `Pig 1 — * Order`(一头猪同时只能有一个 active 订单)
- `Farmer 1 — * Pig`
- `Order 0..1 — 1 Share`(订单可选开启拼猪)
- `Share 1 — * ShareMember`(最多 3 个成员含主认领人)
- `Pig 1 — * FeedingRecord`
- `Pig 1 — * HealthRecord`
- `User 1 — 1 Wallet`

---

## 二、通用字段约定(所有表必有)

| 列名 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `id` | `CHAR(27)` | — | ULID,前缀按表(`usr_`/`ord_` 等),**主键** |
| `created_at` | `DATETIME(3)` | `CURRENT_TIMESTAMP(3)` | 创建时间(毫秒) |
| `updated_at` | `DATETIME(3)` | `CURRENT_TIMESTAMP(3) ON UPDATE` | 更新时间 |
| `deleted_at` | `DATETIME(3)` | `NULL` | 软删除时间(NULL=未删) |

**软删除原则**:用户产生的数据(订单 / 喂养 / 健康)**永不物理删除**——只置 `deleted_at`。配置类数据(无用户痕迹)可以物理删。

---

## 三、核心表 Schema

### users · 用户

```sql
CREATE TABLE users (
  id              CHAR(27)        PRIMARY KEY,
  -- 微信
  wx_openid       VARCHAR(64)     UNIQUE,
  wx_unionid      VARCHAR(64)     INDEX,
  wx_session_key  VARCHAR(64),
  -- 基本
  nickname        VARCHAR(50)     NOT NULL,
  avatar_url      VARCHAR(500),
  phone           VARCHAR(20)     INDEX,
  gender          TINYINT         DEFAULT 0,   -- 0未知 1男 2女
  -- 实名(可选)
  real_name       VARCHAR(50),
  id_card_hash    VARCHAR(64),                -- 身份证 sha256,不存原文
  -- 角色 / 状态
  role            VARCHAR(20)     NOT NULL DEFAULT 'customer',
                                              -- customer / farmer / admin / super_admin
  status          VARCHAR(20)     NOT NULL DEFAULT 'active',
                                              -- active / banned / deleted
  -- 关联(可选)
  farmer_id       CHAR(27),                   -- 如果是农户,关联 farmers.id
  -- 推送
  push_tokens     JSON,                       -- {wx_mp:..., app_xiaomi:..., ...}
  -- 元
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at      DATETIME(3),
  INDEX idx_role_status (role, status),
  INDEX idx_phone (phone),
  INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### farmers · 农户

```sql
CREATE TABLE farmers (
  id              CHAR(27)        PRIMARY KEY,
  name            VARCHAR(50)     NOT NULL,
  region          VARCHAR(100),               -- 四川广元
  region_code     VARCHAR(20),                -- 行政区划码
  years_farming   INT             DEFAULT 0,  -- 散养年限
  avatar_url      VARCHAR(500),
  story           TEXT,                       -- 故事介绍
  video_url       VARCHAR(500),               -- 自述视频
  rating          DECIMAL(2,1)    DEFAULT 5.0,
  rating_count    INT             DEFAULT 0,
  total_pigs      INT             DEFAULT 0,   -- 累计代养头数
  -- 状态
  status          VARCHAR(20)     NOT NULL DEFAULT 'active', -- active / paused / removed
  -- 元
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at      DATETIME(3),
  INDEX idx_region (region_code),
  INDEX idx_status (status),
  INDEX idx_rating (rating)
);
```

### pigs · 猪只

```sql
CREATE TABLE pigs (
  id                  CHAR(27)        PRIMARY KEY,
  serial_no           VARCHAR(20)     UNIQUE NOT NULL,   -- A001 这种短号
  breed               VARCHAR(20)     NOT NULL,           -- blackpig / changbai / huazhu
  name                VARCHAR(50),                        -- 小花 等(认领后用户可改)
  -- 农户
  farmer_id           CHAR(27)        NOT NULL,
  -- 体重 / 日期
  intake_weight_jin   DECIMAL(6,2)    NOT NULL,           -- 入栏体重(斤)
  intake_date         DATE            NOT NULL,           -- 入栏日期
  current_weight_jin  DECIMAL(6,2),                       -- 最新体重
  expected_mature_date DATE,                              -- 预计出栏日期
  mature_date         DATE,
  -- 状态
  status              VARCHAR(20)     NOT NULL DEFAULT 'available',
                                                          -- available / claimed / quarantine
                                                          -- / mature / slaughtered / dead
  health_status       VARCHAR(20)     DEFAULT 'healthy',  -- healthy / sick / dead
  -- 价格(认领时锁定)
  base_price          DECIMAL(8,2)    NOT NULL,           -- 猪仔基础费(入栏时市价 × 体重)
  -- 直播
  live_stream_id      VARCHAR(64),                        -- 直播服务返回的流 ID
  cover_url           VARCHAR(500),
  -- 元
  created_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at          DATETIME(3),
  INDEX idx_farmer (farmer_id),
  INDEX idx_status (status),
  INDEX idx_breed_status (breed, status),
  INDEX idx_serial (serial_no),
  FOREIGN KEY (farmer_id) REFERENCES farmers(id)
);
```

### orders · 订单

```sql
CREATE TABLE orders (
  id                  CHAR(27)        PRIMARY KEY,
  -- 关联
  user_id             CHAR(27)        NOT NULL,           -- 主认领人
  pig_id              CHAR(27)        NOT NULL,
  farmer_id           CHAR(27)        NOT NULL,           -- 冗余,便于查询
  -- 商品
  breed               VARCHAR(20)     NOT NULL,
  insurance_plan      VARCHAR(20),                        -- basic / full / none
  -- 金额
  base_price          DECIMAL(8,2)    NOT NULL,
  insurance_price     DECIMAL(8,2)    DEFAULT 0,
  initial_payment     DECIMAL(8,2)    NOT NULL,           -- 首次支付(基础费 + 保险)
  daily_fee           DECIMAL(6,2)    NOT NULL DEFAULT 20, -- 代养 10 + 餐食 10
  estimated_total     DECIMAL(8,2),                       -- 预计总成本
  actual_total        DECIMAL(8,2),                       -- 实际总扣款
  -- 状态
  status              VARCHAR(30)     NOT NULL DEFAULT 'pending_payment',
                                                          -- pending_payment / active / mature
                                                          -- / slaughtering / shipping
                                                          -- / delivered / cancelled / refunded
  -- 拼猪
  share_enabled       BOOLEAN         NOT NULL DEFAULT FALSE,
  -- 时间
  paid_at             DATETIME(3),
  mature_at           DATETIME(3),
  delivered_at        DATETIME(3),
  cancelled_at        DATETIME(3),
  -- 元
  idempotency_key     VARCHAR(64)     UNIQUE,
  created_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at          DATETIME(3),
  INDEX idx_user_status (user_id, status),
  INDEX idx_pig (pig_id),
  INDEX idx_farmer (farmer_id),
  INDEX idx_status_paid (status, paid_at),
  INDEX idx_idempotency (idempotency_key),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (pig_id) REFERENCES pigs(id),
  FOREIGN KEY (farmer_id) REFERENCES farmers(id)
);
```

### shares · 拼猪

```sql
CREATE TABLE shares (
  id              CHAR(27)        PRIMARY KEY,
  order_id        CHAR(27)        UNIQUE NOT NULL,   -- 一个订单最多 1 个 share
  pig_id          CHAR(27)        NOT NULL,           -- 冗余,便于直播鉴权
  host_user_id    CHAR(27)        NOT NULL,           -- 主认领人
  share_code      VARCHAR(10)     UNIQUE NOT NULL,    -- 6-8 位短码
  max_members     TINYINT         NOT NULL DEFAULT 3, -- 最多 3 家(含主)
  status          VARCHAR(20)     NOT NULL DEFAULT 'open',
                                                      -- open / closed / dismissed
  expires_at      DATETIME(3),                        -- 分享码过期(30 天)
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_order (order_id),
  INDEX idx_code (share_code),
  INDEX idx_host (host_user_id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (pig_id) REFERENCES pigs(id),
  FOREIGN KEY (host_user_id) REFERENCES users(id)
);
```

### share_members · 拼猪成员

```sql
CREATE TABLE share_members (
  id              CHAR(27)        PRIMARY KEY,
  share_id        CHAR(27)        NOT NULL,
  user_id         CHAR(27)        NOT NULL,
  is_host         BOOLEAN         NOT NULL DEFAULT FALSE,
  status          VARCHAR(20)     NOT NULL DEFAULT 'joined',
                                                      -- pending / joined / left / kicked
  joined_at       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
  left_at         DATETIME(3),
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_share_user (share_id, user_id),       -- 一个用户在同一拼猪中只有一行
  INDEX idx_user (user_id),
  INDEX idx_share_status (share_id, status),
  FOREIGN KEY (share_id) REFERENCES shares(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### wallets · 钱包

```sql
CREATE TABLE wallets (
  id              CHAR(27)        PRIMARY KEY,
  user_id         CHAR(27)        UNIQUE NOT NULL,
  balance         DECIMAL(10,2)   NOT NULL DEFAULT 0,
  frozen          DECIMAL(10,2)   NOT NULL DEFAULT 0,   -- 冻结金额(后续退款用)
  total_topup     DECIMAL(12,2)   NOT NULL DEFAULT 0,   -- 累计充值
  total_spent     DECIMAL(12,2)   NOT NULL DEFAULT 0,   -- 累计消费
  version         INT             NOT NULL DEFAULT 0,   -- 乐观锁版本号
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

> ⚠️ **任何改 balance 必须用乐观锁(version)或 SELECT FOR UPDATE**。

### wallet_transactions · 钱包流水

```sql
CREATE TABLE wallet_transactions (
  id              CHAR(27)        PRIMARY KEY,
  wallet_id       CHAR(27)        NOT NULL,
  user_id         CHAR(27)        NOT NULL,
  type            VARCHAR(20)     NOT NULL,
                                  -- topup / consume_feeding / consume_food
                                  -- / refund / withdraw
  amount          DECIMAL(10,2)   NOT NULL,    -- 正数,符号靠 type 区分
  balance_after   DECIMAL(10,2)   NOT NULL,    -- 此笔后余额(对账用)
  ref_type        VARCHAR(20),                 -- order / topup / refund
  ref_id          CHAR(27),                    -- 关联订单/充值/退款ID
  remark          VARCHAR(200),
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_wallet (wallet_id),
  INDEX idx_ref (ref_type, ref_id),
  FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### feeding_records · 喂养记录

```sql
CREATE TABLE feeding_records (
  id              CHAR(27)        PRIMARY KEY,
  pig_id          CHAR(27)        NOT NULL,
  farmer_id       CHAR(27)        NOT NULL,
  meal            VARCHAR(20)     NOT NULL,        -- breakfast / lunch / dinner
  meal_date       DATE            NOT NULL,        -- 该餐属于哪一天(避免凌晨夜餐归属错)
  foods           VARCHAR(200),                    -- 玉米面粥 / 红薯 / 青菜
  photo_urls      JSON,                            -- ["https://...", ...]
  remark          VARCHAR(500),
  fed_at          DATETIME(3)     NOT NULL,        -- 实际打卡时间
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_pig_meal_date (pig_id, meal_date, meal),  -- 同一头猪同一天同一餐只能 1 条
  INDEX idx_pig_date (pig_id, meal_date),
  INDEX idx_farmer_date (farmer_id, meal_date),
  FOREIGN KEY (pig_id) REFERENCES pigs(id),
  FOREIGN KEY (farmer_id) REFERENCES farmers(id)
);
```

### health_records · 健康档案

```sql
CREATE TABLE health_records (
  id              CHAR(27)        PRIMARY KEY,
  pig_id          CHAR(27)        NOT NULL,
  type            VARCHAR(20)     NOT NULL,        -- checkup / vaccine / treatment / injury / death
  title           VARCHAR(100)    NOT NULL,        -- 疫苗:猪瘟疫苗 第二针
  detail          TEXT,
  photo_urls      JSON,
  vet_name        VARCHAR(50),
  cost            DECIMAL(8,2)    DEFAULT 0,
  recorded_at     DATETIME(3)     NOT NULL,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_pig (pig_id),
  INDEX idx_pig_type (pig_id, type),
  FOREIGN KEY (pig_id) REFERENCES pigs(id)
);
```

### messages · 站内消息

```sql
CREATE TABLE messages (
  id              CHAR(27)        PRIMARY KEY,
  user_id         CHAR(27)        NOT NULL,
  type            VARCHAR(30)     NOT NULL,        -- order_paid / pig_mature / share_joined ...
  title           VARCHAR(100),
  content         TEXT,
  data            JSON,                            -- 额外数据(订单ID 等)
  is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
  read_at         DATETIME(3),
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_user_read (user_id, is_read, created_at DESC),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### addresses · 收货地址(简化)

```sql
CREATE TABLE addresses (
  id              CHAR(27)        PRIMARY KEY,
  user_id         CHAR(27)        NOT NULL,
  contact_name    VARCHAR(50)     NOT NULL,
  phone           VARCHAR(20)     NOT NULL,
  province        VARCHAR(50),
  city            VARCHAR(50),
  district        VARCHAR(50),
  detail          VARCHAR(200)    NOT NULL,
  is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at      DATETIME(3),
  INDEX idx_user (user_id, is_default DESC),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 四、索引策略

### 通用规则

1. **每个外键加索引**(MySQL 不会自动加)
2. **常用查询条件组合加复合索引**(注意最左前缀)
3. **范围条件放复合索引最后**(`WHERE status = ? AND created_at > ?` → `(status, created_at)`)
4. **避免过多索引**(写入开销),通常每表 ≤ 5 个

### 已规划的关键索引

- `users(role, status)` — 后台列表
- `pigs(breed, status)` — 用户筛选可认领
- `orders(user_id, status)` — 我的订单
- `orders(status, paid_at)` — 后台 / 定时任务
- `feeding_records(pig_id, meal_date)` — 猪只详情时间线
- `wallet_transactions(user_id, created_at)` — 用户流水
- `messages(user_id, is_read, created_at)` — 消息中心

---

## 五、迁移流程

### 创建迁移

```bash
cd backend
# 1. 修改 entity 文件
# 2. 自动生成迁移
npm run migration:generate -- src/database/migrations/AddPigBreedIndex
# 3. 检查生成的 SQL,必要时改
# 4. 提交进 git
git add db/migrations/
```

### 执行迁移

```bash
# 本地
npm run migration:run

# 生产(部署脚本自动执行)
```

### 回滚

```bash
npm run migration:revert  # 回退最近一次
```

### 迁移文件命名

```
<timestamp>-<description>.ts
1620000000000-Init.ts
1620100000000-AddPigBreedIndex.ts
1620200000000-AddShareTables.ts
```

---

## 六、约束与触发器

**项目原则:不使用 MySQL 触发器,所有业务逻辑在应用层。**

理由:
- 触发器隐式执行,debug 困难
- 不同环境一致性难保证
- 与 ORM 协作差

外键约束**保留**,作为最后一道防线。

---

## 七、数据治理

### 软删除清理

每周一凌晨清理 30 天前的软删除记录(管理员配置)。

### 流水归档

`wallet_transactions` 超过 1 年的归档到 `wallet_transactions_archive` 表(后续配置)。

### 备份

见 [`../06-deployment/release.md#备份`](../06-deployment/release.md)
