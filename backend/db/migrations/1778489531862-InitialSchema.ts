import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1778489531862 implements MigrationInterface {
    name = 'InitialSchema1778489531862'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`wallet\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`user_id\` char(26) NOT NULL, \`balance\` decimal(12,2) NOT NULL DEFAULT '0.00', \`frozen\` decimal(12,2) NOT NULL DEFAULT '0.00', UNIQUE INDEX \`IDX_72548a47ac4a996cd254b08252\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`openid\` varchar(64) NOT NULL, \`unionid\` varchar(64) NULL, \`phone\` varchar(20) NULL, \`nickname\` varchar(64) NOT NULL DEFAULT '', \`avatar_url\` varchar(512) NOT NULL DEFAULT '', \`role\` enum ('user', 'merchant', 'admin') NOT NULL DEFAULT 'user', \`status\` enum ('active', 'banned') NOT NULL DEFAULT 'active', \`last_login_at\` datetime(3) NULL, UNIQUE INDEX \`IDX_0fda9260b0aaff9a5b8f38ac16\` (\`openid\`), UNIQUE INDEX \`IDX_d97e2d09635d4a904163ede845\` (\`unionid\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`order\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`user_id\` char(26) NOT NULL, \`pig_id\` char(26) NOT NULL, \`shares_count\` int NOT NULL, \`unit_price\` decimal(10,2) NOT NULL, \`total_price\` decimal(12,2) NOT NULL, \`status\` enum ('pending', 'paid', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending', \`wx_pay_transaction_id\` varchar(64) NULL, \`paid_at\` datetime(3) NULL, INDEX \`IDX_199e32a02ddc0f47cd93181d8f\` (\`user_id\`), INDEX \`IDX_69dd4fc51236ccc71707bcbe77\` (\`pig_id\`), INDEX \`IDX_7a9573d6a1fb982772a9123320\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`pig\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`merchant_id\` char(26) NOT NULL, \`title\` varchar(128) NOT NULL, \`description\` text NULL, \`breed\` varchar(64) NOT NULL DEFAULT '', \`weight_kg\` decimal(8,2) NOT NULL DEFAULT '0.00', \`price_per_share\` decimal(10,2) NOT NULL, \`total_shares\` int NOT NULL, \`sold_shares\` int NOT NULL DEFAULT '0', \`cover_image\` varchar(512) NOT NULL DEFAULT '', \`photos\` json NULL, \`status\` enum ('draft', 'listed', 'sold_out', 'closed') NOT NULL DEFAULT 'draft', \`listed_at\` datetime(3) NULL, INDEX \`IDX_689dd387ecc86e36958f2d00a6\` (\`merchant_id\`), INDEX \`IDX_bdfb4f31e6b69ed197379ea5e4\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`share\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`order_id\` char(26) NOT NULL, \`user_id\` char(26) NOT NULL, \`pig_id\` char(26) NOT NULL, \`shares_count\` int NOT NULL, INDEX \`IDX_bc431389061bc3d11f85f5ac61\` (\`order_id\`), INDEX \`IDX_cb0f2a718c34d96af2fc0e3177\` (\`user_id\`), INDEX \`IDX_3e742f0ca3eff63aade276baf1\` (\`pig_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_3e742f0ca3eff63aade276baf1\` ON \`share\``);
        await queryRunner.query(`DROP INDEX \`IDX_cb0f2a718c34d96af2fc0e3177\` ON \`share\``);
        await queryRunner.query(`DROP INDEX \`IDX_bc431389061bc3d11f85f5ac61\` ON \`share\``);
        await queryRunner.query(`DROP TABLE \`share\``);
        await queryRunner.query(`DROP INDEX \`IDX_bdfb4f31e6b69ed197379ea5e4\` ON \`pig\``);
        await queryRunner.query(`DROP INDEX \`IDX_689dd387ecc86e36958f2d00a6\` ON \`pig\``);
        await queryRunner.query(`DROP TABLE \`pig\``);
        await queryRunner.query(`DROP INDEX \`IDX_7a9573d6a1fb982772a9123320\` ON \`order\``);
        await queryRunner.query(`DROP INDEX \`IDX_69dd4fc51236ccc71707bcbe77\` ON \`order\``);
        await queryRunner.query(`DROP INDEX \`IDX_199e32a02ddc0f47cd93181d8f\` ON \`order\``);
        await queryRunner.query(`DROP TABLE \`order\``);
        await queryRunner.query(`DROP INDEX \`IDX_d97e2d09635d4a904163ede845\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`IDX_0fda9260b0aaff9a5b8f38ac16\` ON \`user\``);
        await queryRunner.query(`DROP TABLE \`user\``);
        await queryRunner.query(`DROP INDEX \`IDX_72548a47ac4a996cd254b08252\` ON \`wallet\``);
        await queryRunner.query(`DROP TABLE \`wallet\``);
    }

}
