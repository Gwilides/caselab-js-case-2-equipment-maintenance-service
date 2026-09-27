import dotenv from 'dotenv';

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // CORS: comma-separated list of origins
  corsOrigins: (
    process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // External Weather API (reused from Case 1)
  weatherApiUrl:
    process.env.WEATHER_API_URL ||
    process.env.WEATHER_API_BASE_URL ||
    'https://api.open-meteo.com/v1/forecast',
  weatherApiBaseUrl:
    process.env.WEATHER_API_URL ||
    process.env.WEATHER_API_BASE_URL ||
    'https://api.open-meteo.com/v1/forecast',
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '5000', 10),

  // Outdoor work suitability thresholds
  outdoorRules: {
    maxWindSpeed: parseFloat(process.env.OUTDOOR_MAX_WIND_SPEED || '12.0'),
    maxPrecipitation: parseFloat(process.env.OUTDOOR_MAX_PRECIPITATION || '1.0'),
    minTemp: parseFloat(process.env.OUTDOOR_MIN_TEMP || '-15.0'),
    maxTemp: parseFloat(process.env.OUTDOOR_MAX_TEMP || '35.0')
  },

  // Database (PostgreSQL / Sequelize)
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name:
      process.env.NODE_ENV === 'test'
        ? process.env.DB_NAME_TEST || 'caselab_db_test'
        : process.env.DB_NAME || 'caselab_db',
    user: process.env.DB_USER || 'caselab_user',
    password: process.env.DB_PASSWORD || 'caselab_secret',
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolAcquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
    poolIdle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
    logging: process.env.DB_LOGGING === 'true'
  },

  // Storage
  dataDir: process.env.DATA_DIR || 'data',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Optional API Key for mutating operations (bonus)
  apiKey: process.env.API_KEY || ''
};

export default Object.freeze(env);
