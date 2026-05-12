import { MigrationInterface, QueryRunner } from "typeorm";

export class S4Order1778562171737 implements MigrationInterface {
    name = 'S4Order1778562171737'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`wallet_transaction\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`wallet_id\` char(26) NOT NULL, \`user_id\` char(26) NOT NULL, \`direction\` enum ('in', 'out') NOT NULL, \`type\` enum ('topup', 'order_pay', 'daily_charge', 'refund', 'adjust') NOT NULL, \`amount\` decimal(12,2) NOT NULL, \`related_id\` char(26) NOT NULL DEFAULT '', \`balance_after\` decimal(12,2) NOT NULL DEFAULT '0.00', \`note\` varchar(256) NOT NULL DEFAULT '', INDEX \`IDX_1b321310b8544083f5811cd228\` (\`user_id\`), INDEX \`IDX_476d92a00baabab8c77aae4694\` (\`wallet_id\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`order_payment\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`order_id\` char(26) NOT NULL, \`channel\` enum ('wxpay', 'mock', 'wallet') NOT NULL DEFAULT 'wxpay', \`prepay_id\` varchar(64) NOT NULL DEFAULT '', \`transaction_id\` varchar(64) NULL, \`amount\` decimal(12,2) NOT NULL, \`status\` enum ('pending', 'success', 'failed', 'closed') NOT NULL DEFAULT 'pending', \`raw_payload\` json NULL, \`succeeded_at\` datetime(3) NULL, INDEX \`IDX_fb74ab8e4ee3d2c6e73c261d8e\` (\`order_id\`), UNIQUE INDEX \`IDX_5597828ca4f8c4f7bf4fd51425\` (\`transaction_id\`), INDEX \`IDX_f003c55a1c609824b81e361d0e\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_f003c55a1c609824b81e361d0e\` ON \`order_payment\``);
        await queryRunner.query(`DROP INDEX \`IDX_5597828ca4f8c4f7bf4fd51425\` ON \`order_payment\``);
        await queryRunner.query(`DROP INDEX \`IDX_fb74ab8e4ee3d2c6e73c261d8e\` ON \`order_payment\``);
        await queryRunner.query(`DROP TABLE \`order_payment\``);
        await queryRunner.query(`DROP INDEX \`IDX_476d92a00baabab8c77aae4694\` ON \`wallet_transaction\``);
        await queryRunner.query(`DROP INDEX \`IDX_1b321310b8544083f5811cd228\` ON \`wallet_transaction\``);
        await queryRunner.query(`DROP TABLE \`wallet_transaction\``);
    }

}
