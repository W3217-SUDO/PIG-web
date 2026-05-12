import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S7 订单生命周期补全:
 * - order.status 枚举追加 shipped/delivered/refund_pending
 * - 新增字段:pay_method / slaughter_date / shipped_at / delivered_at /
 *   refunded_at / refund_reason / tracking_no / address_snapshot / remark
 * - message.type 枚举追加 4 个订单状态消息类型
 */
export class S7OrderLifecycle1779000000000 implements MigrationInterface {
  name = 'S7OrderLifecycle1779000000000';

  public async up(q: QueryRunner): Promise<void> {
    // 1) order 表 status 扩枚举
    await q.query(
      "ALTER TABLE `order` MODIFY COLUMN `status` ENUM('pending','paid','shipped','delivered','cancelled','refund_pending','refunded') NOT NULL DEFAULT 'pending'",
    );

    // 2) order 新字段
    await q.query(
      "ALTER TABLE `order` ADD COLUMN `pay_method` ENUM('wxpay','wallet','mock') NULL",
    );
    await q.query(
      'ALTER TABLE `order` ADD COLUMN `slaughter_date` datetime(3) NULL',
    );
    await q.query(
      'ALTER TABLE `order` ADD COLUMN `shipped_at` datetime(3) NULL',
    );
    await q.query(
      'ALTER TABLE `order` ADD COLUMN `delivered_at` datetime(3) NULL',
    );
    await q.query(
      'ALTER TABLE `order` ADD COLUMN `refunded_at` datetime(3) NULL',
    );
    await q.query(
      "ALTER TABLE `order` ADD COLUMN `refund_reason` varchar(256) NOT NULL DEFAULT ''",
    );
    await q.query(
      "ALTER TABLE `order` ADD COLUMN `tracking_no` varchar(64) NOT NULL DEFAULT ''",
    );
    await q.query(
      'ALTER TABLE `order` ADD COLUMN `address_snapshot` json NULL',
    );
    await q.query(
      "ALTER TABLE `order` ADD COLUMN `remark` varchar(256) NOT NULL DEFAULT ''",
    );

    // 3) message.type 枚举扩
    await q.query(
      "ALTER TABLE `message` MODIFY COLUMN `type` ENUM('order_paid','order_cancelled','order_shipped','order_delivered','order_refund_pending','order_refunded','pig_update','share','system') NOT NULL",
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    // 反向(若回滚,需确保数据兼容)
    await q.query(
      "ALTER TABLE `message` MODIFY COLUMN `type` ENUM('order_paid','order_cancelled','pig_update','share','system') NOT NULL",
    );

    await q.query('ALTER TABLE `order` DROP COLUMN `remark`');
    await q.query('ALTER TABLE `order` DROP COLUMN `address_snapshot`');
    await q.query('ALTER TABLE `order` DROP COLUMN `tracking_no`');
    await q.query('ALTER TABLE `order` DROP COLUMN `refund_reason`');
    await q.query('ALTER TABLE `order` DROP COLUMN `refunded_at`');
    await q.query('ALTER TABLE `order` DROP COLUMN `delivered_at`');
    await q.query('ALTER TABLE `order` DROP COLUMN `shipped_at`');
    await q.query('ALTER TABLE `order` DROP COLUMN `slaughter_date`');
    await q.query('ALTER TABLE `order` DROP COLUMN `pay_method`');

    await q.query(
      "ALTER TABLE `order` MODIFY COLUMN `status` ENUM('pending','paid','cancelled','refunded') NOT NULL DEFAULT 'pending'",
    );
  }
}
