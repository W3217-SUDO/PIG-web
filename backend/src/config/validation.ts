import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().default('127.0.0.1'),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().default('root'),
  DB_PASS: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().default('pig'),
  DB_LOGGING: Joi.boolean().default(false),
  DB_SYNCHRONIZE: Joi.boolean().default(false),

  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASS: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('2h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  WX_MP_APPID: Joi.string().allow('').default(''),
  WX_MP_SECRET: Joi.string().allow('').default(''),
  WX_OPEN_APPID: Joi.string().allow('').default(''),
  WX_OPEN_SECRET: Joi.string().allow('').default(''),
  WX_PAY_MCH_ID: Joi.string().allow('').default(''),
  WX_PAY_API_KEY: Joi.string().allow('').default(''),
  WX_PAY_NOTIFY_URL: Joi.string().allow('').default(''),

  SMS_PROVIDER: Joi.string().default('tencent'),
  SMS_TENCENT_SECRET_ID: Joi.string().allow('').default(''),
  SMS_TENCENT_SECRET_KEY: Joi.string().allow('').default(''),
  SMS_TENCENT_APP_ID: Joi.string().allow('').default(''),

  STORAGE_PROVIDER: Joi.string().valid('local', 'cos', 'oss').default('local'),
  STORAGE_LOCAL_DIR: Joi.string().default('./uploads'),
  STORAGE_LOCAL_BASE_URL: Joi.string().default('http://127.0.0.1:3000/uploads'),

  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
  LOG_PRETTY: Joi.boolean().default(false),
  LOG_FILE_DIR: Joi.string().default('./logs'),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(60),

  CORS_ORIGINS: Joi.string().allow('').default(''),

  SENTRY_DSN: Joi.string().allow('').default(''),
  ALERT_WEBHOOK_URL: Joi.string().allow('').default(''),
});
