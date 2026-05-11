import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * 仅供 TypeORM CLI 用(migration:generate / migration:run / migration:revert)。
 * 应用运行时的 DataSource 在 AppModule 里通过 TypeOrmModule.forRootAsync 创建。
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'pig',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../db/migrations/*.{ts,js}'],
  charset: 'utf8mb4',
  timezone: '+08:00',
  synchronize: false,
});
