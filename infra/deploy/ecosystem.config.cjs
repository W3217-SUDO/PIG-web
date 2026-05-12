// PM2 ecosystem 配置(固化部署参数)
// 用法(在 release 目录里):
//   cd /opt/pig/current/backend
//   pm2 startOrReload /opt/pig/current/infra/deploy/ecosystem.config.cjs
//
// 说明:
// - fork 模式(NestJS ConfigModule 在 cluster mode 下 cwd 不可靠,踩过坑)
// - .env.production 由 deploy 脚本复制到 backend/ (不软链)
// - logs 走 /opt/pig/logs/ 共享目录,跨 release 持久

module.exports = {
  apps: [
    {
      name: 'pig-backend',
      script: 'dist/main.js',
      // /opt/pig/current 是软链 → 最新 release
      cwd: '/opt/pig/current/backend',

      // 进程模式
      exec_mode: 'fork',
      instances: 1,

      // 运行环境
      env: {
        NODE_ENV: 'production',
      },

      // 日志
      out_file: '/opt/pig/logs/pig-backend.out.log',
      error_file: '/opt/pig/logs/pig-backend.err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      merge_logs: true,

      // 自动重启(挂掉的话)
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 4000,

      // 内存超 800MB 自动重启(3.6G 机器留给 nginx/mysql/redis)
      max_memory_restart: '800M',

      // 不 watch(部署时显式重启)
      watch: false,

      // 收 SIGTERM 时给 8s 优雅关闭
      kill_timeout: 8000,
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
};
