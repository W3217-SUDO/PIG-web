import { MigrationInterface, QueryRunner } from "typeorm";

export class S3Address1778561768936 implements MigrationInterface {
    name = 'S3Address1778561768936'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`address\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`user_id\` char(26) NOT NULL, \`name\` varchar(32) NOT NULL, \`phone\` varchar(20) NOT NULL, \`province\` varchar(32) NOT NULL, \`city\` varchar(32) NOT NULL, \`district\` varchar(32) NOT NULL DEFAULT '', \`detail\` varchar(256) NOT NULL, \`is_default\` tinyint NOT NULL DEFAULT 0, INDEX \`IDX_7d10e1e5322026cd29f13121b5\` (\`user_id\`, \`is_default\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_7d10e1e5322026cd29f13121b5\` ON \`address\``);
        await queryRunner.query(`DROP TABLE \`address\``);
    }

}
