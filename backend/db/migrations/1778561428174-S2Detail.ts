import { MigrationInterface, QueryRunner } from "typeorm";

export class S2Detail1778561428174 implements MigrationInterface {
    name = 'S2Detail1778561428174'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`health_record\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`pig_id\` char(26) NOT NULL, \`record_type\` enum ('checkup', 'vaccine', 'vet', 'event', 'weight') NOT NULL, \`detail\` varchar(512) NOT NULL, \`image_url\` varchar(512) NOT NULL DEFAULT '', \`recorded_at\` datetime(3) NOT NULL, INDEX \`IDX_ec044c7ddc13a1728370dd7a0f\` (\`recorded_at\`), INDEX \`IDX_c96695dfc50cb90872fc6e101e\` (\`pig_id\`, \`recorded_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`feeding_record\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`pig_id\` char(26) NOT NULL, \`meal_type\` enum ('breakfast', 'lunch', 'dinner', 'snack') NOT NULL, \`food_desc\` varchar(256) NOT NULL DEFAULT '', \`image_url\` varchar(512) NOT NULL DEFAULT '', \`checked_at\` datetime(3) NOT NULL, INDEX \`IDX_df72bc659c92038c7e70169c0e\` (\`checked_at\`), INDEX \`IDX_48dcbf11a8ac8a59689777a1bf\` (\`pig_id\`, \`checked_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_48dcbf11a8ac8a59689777a1bf\` ON \`feeding_record\``);
        await queryRunner.query(`DROP INDEX \`IDX_df72bc659c92038c7e70169c0e\` ON \`feeding_record\``);
        await queryRunner.query(`DROP TABLE \`feeding_record\``);
        await queryRunner.query(`DROP INDEX \`IDX_c96695dfc50cb90872fc6e101e\` ON \`health_record\``);
        await queryRunner.query(`DROP INDEX \`IDX_ec044c7ddc13a1728370dd7a0f\` ON \`health_record\``);
        await queryRunner.query(`DROP TABLE \`health_record\``);
    }

}
