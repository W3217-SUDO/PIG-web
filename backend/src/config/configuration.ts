export const configuration = () => ({
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
  },
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    pass: process.env.DB_PASS || '',
    name: process.env.DB_NAME || 'pig',
    logging: process.env.DB_LOGGING === 'true',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    pass: process.env.REDIS_PASS || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '2h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  wx: {
    mp: {
      appid: process.env.WX_MP_APPID || '',
      secret: process.env.WX_MP_SECRET || '',
    },
    open: {
      appid: process.env.WX_OPEN_APPID || '',
      secret: process.env.WX_OPEN_SECRET || '',
    },
    pay: {
      mchId: process.env.WX_PAY_MCH_ID || '',
      apiKey: process.env.WX_PAY_API_KEY || '',
      notifyUrl: process.env.WX_PAY_NOTIFY_URL || '',
    },
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'tencent',
    tencent: {
      secretId: process.env.SMS_TENCENT_SECRET_ID || '',
      secretKey: process.env.SMS_TENCENT_SECRET_KEY || '',
      appId: process.env.SMS_TENCENT_APP_ID || '',
    },
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    local: {
      dir: process.env.STORAGE_LOCAL_DIR || './uploads',
      baseUrl: process.env.STORAGE_LOCAL_BASE_URL || 'http://127.0.0.1:3000/uploads',
    },
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.LOG_PRETTY === 'true',
    fileDir: process.env.LOG_FILE_DIR || './logs',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  },
  alert: {
    sentryDsn: process.env.SENTRY_DSN || '',
    webhookUrl: process.env.ALERT_WEBHOOK_URL || '',
  },
});
