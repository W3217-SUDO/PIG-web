-- 容器首次启动时执行（仅在数据卷为空时）
-- MYSQL_DATABASE / MYSQL_USER / MYSQL_PASSWORD 环境变量已经把
--   1. 数据库 pig
--   2. 应用账户 pig_app@'%' + 对 pig.* 全部权限
-- 都建好了，这里只做几件 env 变量做不了的事：

-- 1. 确保 pig 库的 charset/collation 精确为 utf8mb4 / utf8mb4_unicode_ci
ALTER DATABASE `pig`
  CHARACTER SET utf8mb4
  COLLATE       utf8mb4_unicode_ci;

-- 2. 时区表（不强制，但 NOW() / CONVERT_TZ 会更准）
--    镜像启动时 --default-time-zone=+08:00 已经覆盖，所以下面这条可以留空

-- 3. 健康检查用的极简表（可选，确认 DDL 通畅）
-- CREATE TABLE IF NOT EXISTS `_pig_init_marker` (
--   id INT PRIMARY KEY,
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'pig init script applied' AS msg;
