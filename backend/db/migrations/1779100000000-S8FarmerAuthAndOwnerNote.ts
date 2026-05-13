import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S8 - 代养人端微信认证字段 + 猪只主人备注
 *
 * farmer 表：新增 4 个微信绑定字段
 *   - openid     VARCHAR(64) UNIQUE NULL  — 微信 openid，绑定后唯一标识农户
 *   - phone      VARCHAR(20) NULL         — 微信绑定手机号
 *   - wx_nickname VARCHAR(64) NULL        — 微信昵称（首次授权时记录）
 *   - wx_avatar  VARCHAR(512) NULL        — 微信头像 URL
 *
 * pig 表：新增 1 个字段
 *   - owner_note VARCHAR(128) NOT NULL DEFAULT '' — 农户手填的主人备注
 */
export class S8FarmerAuthAndOwnerNote1779100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── farmer 表：微信认证字段 ──────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE \`farmer\`
        ADD COLUMN \`openid\`      VARCHAR(64)  NULL DEFAULT NULL COMMENT '微信 openid，唯一绑定农户身份',
        ADD COLUMN \`phone\`       VARCHAR(20)  NULL DEFAULT NULL COMMENT '微信绑定手机号',
        ADD COLUMN \`wx_nickname\` VARCHAR(64)  NULL DEFAULT NULL COMMENT '微信昵称（首次授权时记录）',
        ADD COLUMN \`wx_avatar\`   VARCHAR(512) NULL DEFAULT NULL COMMENT '微信头像 URL'
    `);

    // openid 唯一索引（允许多条 NULL，但非 NULL 值必须唯一）
    await queryRunner.query(`
      ALTER TABLE \`farmer\`
        ADD UNIQUE INDEX \`IDX_farmer_openid\` (\`openid\`)
    `);

    // ── pig 表：主人备注字段 ────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE \`pig\`
        ADD COLUMN \`owner_note\` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '农户手填的主人备注（如"张大爷的猪"）'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // pig 表回滚
    await queryRunner.query(`ALTER TABLE \`pig\` DROP COLUMN \`owner_note\``);

    // farmer 表回滚
    await queryRunner.query(`ALTER TABLE \`farmer\` DROP INDEX \`IDX_farmer_openid\``);
    await queryRunner.query(`
      ALTER TABLE \`farmer\`
        DROP COLUMN \`wx_avatar\`,
        DROP COLUMN \`wx_nickname\`,
        DROP COLUMN \`phone\`,
        DROP COLUMN \`openid\`
    `);
  }
}
