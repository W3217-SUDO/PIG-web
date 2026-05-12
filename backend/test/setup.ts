/**
 * Jest globalSetup:在所有 e2e 测试前跑一次
 * - 强制 NODE_ENV=test (复用 .env.development 的 DB 连接, 本地 docker)
 * - 留给将来:可在此处自动跑 migration / seed
 */
import * as dotenv from 'dotenv';

export default async function () {
  // e2e 用本地 docker 的 MySQL/Redis (跟 dev 同库)
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
  dotenv.config({ path: '.env' });

  // eslint-disable-next-line no-console
  console.log(
    `\n  [e2e setup] NODE_ENV=${process.env.NODE_ENV} DB=${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  );
}
