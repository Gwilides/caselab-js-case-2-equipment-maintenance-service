import crypto from 'node:crypto';

/**
 * Middleware для сквозной идентификации запросов.
 * Присваивает каждому запросу уникальный идентификатор req.id
 * и проставляет заголовок ответа X-Request-ID.
 */
export function requestId(req, res, next) {
  // ponytail: native crypto.randomUUID() without third-party uuid dependency
  const incomingId = req.headers['x-request-id'];
  const reqId = typeof incomingId === 'string' && incomingId.trim().length > 0
    ? incomingId.trim()
    : crypto.randomUUID();

  req.id = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
}

export default requestId;
