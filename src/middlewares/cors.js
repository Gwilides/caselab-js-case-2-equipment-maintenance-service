import cors from 'cors';
import env from '../config/env.js';

/**
 * Middleware для политики Cross-Origin Resource Sharing (CORS).
 * Использует белый список разрешенных источников из переменной окружения CORS_ORIGINS.
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без Origin (например, curl, Postman, SSR-клиенты)
    if (!origin) {
      return callback(null, true);
    }

    if (env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) {
      return callback(null, true);
    }

    // При несоответствии Origin возвращаем false без падения сервера
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
  credentials: true,
  maxAge: 86400
});

export default corsMiddleware;
