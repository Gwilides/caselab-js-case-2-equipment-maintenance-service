import env from '../config/env.js';

/**
 * Централизованный обработчик ошибок API.
 * Формирует унифицированный ответ формата:
 * {
 *   "error": {
 *     "code": "...",
 *     "message": "...",
 *     "details": [...],
 *     "requestId": "..."
 *   }
 * }
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Обработка синтаксических ошибок парсера JSON от Express
  if (err instanceof SyntaxError && 'body' in err && err.status === 400) {
    const response = {
      error: {
        code: 'BAD_REQUEST',
        message: 'Некорректный синтаксис JSON в теле запроса',
        requestId: req.id
      }
    };
    return res.status(400).json(response);
  }

  // Обработка ошибок превышения размера тела запроса (payload too large)
  if (err.type === 'entity.too.large' || err.status === 413) {
    const response = {
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Размер тела запроса превышает допустимый лимит (100kb)',
        requestId: req.id
      }
    };
    return res.status(413).json(response);
  }

  // Обработка ошибок Sequelize ORM
  if (err.name === 'SequelizeUniqueConstraintError') {
    const fields = err.errors ? err.errors.map((e) => e.path).join(', ') : 'поле';
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: `Запись с таким значением (${fields}) уже существует`,
        details: err.errors ? err.errors.map((e) => ({ field: e.path, message: e.message })) : [],
        requestId: req.id
      }
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Связанная сущность не найдена (${err.table || 'foreign key constraint'})`,
        requestId: req.id
      }
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации модели базы данных',
        details: err.errors ? err.errors.map((e) => ({ field: e.path, message: e.message })) : [],
        requestId: req.id
      }
    });
  }

  const status =
    Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;

  const isOperational = err.isOperational === true || status < 500;

  // Логирование: если подключен pino-http (req.log), используем его
  if (req.log) {
    req.log[status >= 500 ? 'error' : 'warn']({ err, status, requestId: req.id }, 'Request failed');
  }

  // Для production скрываем детали и стек нештатных 500 ошибок
  const message = isOperational
    ? err.message
    : env.isProduction
      ? 'Внутренняя ошибка сервера'
      : err.message || 'Внутренняя ошибка сервера';

  const defaultCode =
    status === 404
      ? 'NOT_FOUND'
      : status === 409
        ? 'CONFLICT'
        : status === 400
          ? 'VALIDATION_ERROR'
          : status === 401
            ? 'UNAUTHORIZED'
            : status === 403
              ? 'FORBIDDEN'
              : 'INTERNAL_SERVER_ERROR';

  const errorBody = {
    code: err.code || defaultCode,
    message,
    requestId: req.id
  };

  if (err.details && Array.isArray(err.details) && err.details.length > 0) {
    errorBody.details = err.details;
  }

  // В среде разработки для отладки можно добавить стек для 500
  if (!env.isProduction && !isOperational && err.stack) {
    errorBody.stack = err.stack;
  }

  return res.status(status).json({ error: errorBody });
}

export default errorHandler;
