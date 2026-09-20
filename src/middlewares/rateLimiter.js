import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

/**
 * Middleware для ограничения частоты запросов (Rate Limiting).
 * Возвращает 429 Too Many Requests с заголовками стандарта RFC 6585.
 */
export const rateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMaxRequests,
  standardHeaders: 'draft-7', // Отправляет заголовки RateLimit-*
  legacyHeaders: false, // Отключает устаревшие заголовки X-RateLimit-*
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Превышен допустимый лимит запросов. Пожалуйста, повторите попытку позже.',
        requestId: req.id
      }
    });
  }
});

export default rateLimiter;
