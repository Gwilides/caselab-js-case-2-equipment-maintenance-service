import env from '../config/env.js';
import { UnauthorizedError } from '../errors/index.js';

/**
 * Middleware аутентификации для изменяющих операций (POST, PATCH, DELETE).
 * Проверяет API-ключ в заголовках X-API-Key, Authorization или в защищенных cookies auth_token.
 * Если API_KEY не задан в конфигурации, операции считаются открытыми (для локальной разработки).
 */
export function requireAuth(req, res, next) {
  // Безопасные методы чтения не требуют обязательной авторизации
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Маршруты аутентификации открыты
  if (req.path.startsWith('/auth') || req.originalUrl?.includes('/api/auth')) {
    return next();
  }

  // Если API-ключ не настроен в .env, разрешаем вызовы
  if (!env.apiKey) {
    return next();
  }

  const apiKeyHeader = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;
  const cookieToken = req.cookies?.auth_token;

  const providedKey = apiKeyHeader || bearerToken || cookieToken;

  if (!providedKey || providedKey !== env.apiKey) {
    return next(
      new UnauthorizedError('Для изменяющих операций требуется корректный API-ключ или токен')
    );
  }

  next();
}

export default requireAuth;
