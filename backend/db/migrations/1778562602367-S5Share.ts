import { MigrationInterface, QueryRunner } from "typeorm";

export class S5Share1778562602367 implements MigrationInterface {
    name = 'S5Share1778562602367'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`share_invite\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`code\` char(8) NOT NULL, \`order_id\` char(26) NOT NULL, \`user_id\` char(26) NOT NULL, \`expires_at\` datetime(3) NOT NULL, UNIQUE INDEX \`IDX_c3846130fec3d11b8ade780310\` (\`code\`), INDEX \`IDX_56911884f1157d05ebe29f3728\` (\`order_id\`), INDEX \`IDX_d37aed1a4a6662fadec137f0e6\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_d37aed1a4a6662fadec137f0e6\` ON \`share_invite\``);
        await queryRunner.query(`DROP INDEX \`IDX_56911884f1157d05ebe29f3728\` ON \`share_invite\``);
        await queryRunner.query(`DROP INDEX \`IDX_c3846130fec3d11b8ade780310\` ON \`share_invite\``);
        await queryRunner.query(`DROP TABLE \`share_invite\``);
    }

}
