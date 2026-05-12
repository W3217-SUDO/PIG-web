import { MigrationInterface, QueryRunner } from 'typeorm';

export class FosterCare1778580000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`farmer_task\` (
        \`id\` char(26) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`farmer_id\` char(26) NOT NULL,
        \`pig_id\` char(26) NULL,
        \`meal_type\` enum('breakfast','lunch','dinner') NOT NULL,
        \`food_desc\` varchar(256) NOT NULL DEFAULT '',
        \`area\` varchar(64) NOT NULL DEFAULT '',
        \`time_slot\` varchar(32) NOT NULL DEFAULT '',
        \`scheduled_date\` date NOT NULL,
        \`checked_at\` datetime(3) NULL,
        \`image_url\` varchar(512) NOT NULL DEFAULT '',
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_farmer_task_farmer_date\` (\`farmer_id\`, \`scheduled_date\`),
        INDEX \`IDX_farmer_task_pig\` (\`pig_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`farmer_earning\` (
        \`id\` char(26) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`farmer_id\` char(26) NOT NULL,
        \`year\` int NOT NULL,
        \`month\` int NOT NULL,
        \`amount\` decimal(10,2) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_farmer_earning_unique\` (\`farmer_id\`, \`year\`, \`month\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `farmer_earning`');
    await queryRunner.query('DROP TABLE `farmer_task`');
  }
}
