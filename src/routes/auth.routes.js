import { Router } from 'express';
import env from '../config/env.js';
import { UnauthorizedError } from '../errors/index.js';

const router = Router();

/**
 * POST /api/auth/login
 * Аутентификация и установка защищённой cookie сессии.
 * Флаги cookie:
 * - httpOnly: true (предотвращает кражу cookie через XSS в document.cookie)
 * - secure: true в production (передача только по зашифрованному протоколу HTTPS)
 * - sameSite: 'strict' (максимальная защита от CSRF-атак: cookie не отправляется при межсайтовых переходах)
 */
router.post('/login', (req, res, next) => {
  const { apiKey } = req.body || {};

  const expectedKey = env.apiKey || 'caselab-secret-key';
  const providedKey = apiKey || req.headers['x-api-key'];

  if (!providedKey || providedKey !== expectedKey) {
    return next(new UnauthorizedError('Неверный ключ доступа (apiKey)'));
  }

  res.cookie('auth_token', providedKey, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 часа
  });

  res.status(200).json({
    data: {
      message: 'Аутентификация успешна, установлена защищённая cookie auth_token',
      token: providedKey
    }
  });
});

/**
 * POST /api/auth/logout
 * Завершение сессии и очистка cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict'
  });

  res.status(200).json({
    data: {
      message: 'Сессия успешно завершена'
    }
  });
});

export default router;
