import { MigrationInterface, QueryRunner } from "typeorm";

export class S1Pig1778558785952 implements MigrationInterface {
    name = 'S1Pig1778558785952'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`farmer\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`name\` varchar(64) NOT NULL, \`region\` varchar(64) NOT NULL, \`years\` int NOT NULL DEFAULT '0', \`avatar_url\` varchar(512) NOT NULL DEFAULT '', \`story\` text NULL, \`video_url\` varchar(512) NOT NULL DEFAULT '', INDEX \`IDX_2a9321ac5940ab31799b064037\` (\`region\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`pig\` ADD \`farmer_id\` char(26) NULL`);
        await queryRunner.query(`ALTER TABLE \`pig\` ADD \`region\` varchar(64) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE \`pig\` ADD \`expected_weight_kg\` decimal(8,2) NOT NULL DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE \`pig\` ADD \`mock_video_url\` varchar(512) NOT NULL DEFAULT ''`);
        await queryRunner.query(`CREATE INDEX \`IDX_fdf07187316d5ce96983b321c9\` ON \`pig\` (\`farmer_id\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_d6c2f93236689832b0a8968297\` ON \`pig\` (\`region\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_d6c2f93236689832b0a8968297\` ON \`pig\``);
        await queryRunner.query(`DROP INDEX \`IDX_fdf07187316d5ce96983b321c9\` ON \`pig\``);
        await queryRunner.query(`ALTER TABLE \`pig\` DROP COLUMN \`mock_video_url\``);
        await queryRunner.query(`ALTER TABLE \`pig\` DROP COLUMN \`expected_weight_kg\``);
        await queryRunner.query(`ALTER TABLE \`pig\` DROP COLUMN \`region\``);
        await queryRunner.query(`ALTER TABLE \`pig\` DROP COLUMN \`farmer_id\``);
        await queryRunner.query(`DROP INDEX \`IDX_2a9321ac5940ab31799b064037\` ON \`farmer\``);
        await queryRunner.query(`DROP TABLE \`farmer\``);
    }

}
