// PM2 production process definition for PIG backend.
//
// The deploy scripts copy backend/.env.production into each release and then
// start this config from /opt/pig/current, so every worker resolves env files
// from /opt/pig/current/backend.

const instances = Number(process.env.PM2_INSTANCES || 2);

module.exports = {
  apps: [
    {
      name: 'pig-backend',
      script: 'dist/main.js',
      cwd: '/opt/pig/current/backend',

      exec_mode: instances > 1 ? 'cluster' : 'fork',
      instances,

      env: {
        NODE_ENV: 'production',
        GIT_COMMIT: process.env.GIT_COMMIT || 'unknown',
        PM2_INSTANCES: String(instances),
      },

      out_file: '/opt/pig/logs/pig-backend.out.log',
      error_file: '/opt/pig/logs/pig-backend.err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      merge_logs: true,

      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 4000,
      max_memory_restart: '800M',

      watch: false,
      kill_timeout: 8000,
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
};
