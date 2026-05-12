import { MigrationInterface, QueryRunner } from "typeorm";

export class S6Message1778562834916 implements MigrationInterface {
    name = 'S6Message1778562834916'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`message\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`user_id\` char(26) NOT NULL, \`type\` enum ('order_paid', 'order_cancelled', 'pig_update', 'share', 'system') NOT NULL, \`title\` varchar(128) NOT NULL, \`content\` varchar(512) NOT NULL DEFAULT '', \`related_id\` varchar(32) NOT NULL DEFAULT '', \`is_read\` tinyint NOT NULL DEFAULT 0, \`read_at\` datetime(3) NULL, INDEX \`IDX_54ce30caeb3f33d68398ea1037\` (\`user_id\`), INDEX \`IDX_4902b1d1b29285ade2fef44dd7\` (\`user_id\`, \`is_read\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_4902b1d1b29285ade2fef44dd7\` ON \`message\``);
        await queryRunner.query(`DROP INDEX \`IDX_54ce30caeb3f33d68398ea1037\` ON \`message\``);
        await queryRunner.query(`DROP TABLE \`message\``);
    }

}
