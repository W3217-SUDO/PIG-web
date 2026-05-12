/**
 * Jest setupFiles:每个 worker 进程启动时加载 env(globalSetup 的 env 不传 worker)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// jest 默认 NODE_ENV=test,但我们没有 .env.test → 强制走 development(连本机 docker)
if (process.env.NODE_ENV === 'test' || !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
const cwd = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(cwd, `.env.${process.env.NODE_ENV}`) });
dotenv.config({ path: path.join(cwd, '.env') });
