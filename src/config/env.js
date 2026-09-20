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

  // Storage
  dataDir: process.env.DATA_DIR || 'data',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Optional API Key for mutating operations (bonus)
  apiKey: process.env.API_KEY || ''
};

export default Object.freeze(env);
