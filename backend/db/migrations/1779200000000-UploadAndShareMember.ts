import { MigrationInterface, QueryRunner } from 'typeorm';

export class UploadAndShareMember1779200000000 implements MigrationInterface {
  name = 'UploadAndShareMember1779200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`upload_asset\` (
        \`id\` char(26) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`user_id\` char(26) NULL,
        \`kind\` enum ('image') NOT NULL DEFAULT 'image',
        \`storage\` enum ('local') NOT NULL DEFAULT 'local',
        \`filename\` varchar(160) NOT NULL,
        \`original_name\` varchar(255) NOT NULL,
        \`mime_type\` varchar(80) NOT NULL,
        \`size\` int unsigned NOT NULL,
        \`path\` varchar(512) NOT NULL,
        \`url\` varchar(512) NOT NULL,
        INDEX \`IDX_upload_asset_user_id\` (\`user_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`share_member\` (
        \`id\` char(26) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`invite_id\` char(26) NOT NULL,
        \`user_id\` char(26) NOT NULL,
        \`role\` enum ('host','member') NOT NULL DEFAULT 'member',
        \`joined_at\` datetime(3) NOT NULL,
        INDEX \`IDX_share_member_invite_id\` (\`invite_id\`),
        INDEX \`IDX_share_member_user_id\` (\`user_id\`),
        UNIQUE INDEX \`UQ_share_member_invite_user\` (\`invite_id\`, \`user_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `share_member`');
    await queryRunner.query('DROP TABLE `upload_asset`');
  }
}
