export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_SERVER_ERROR', details, cause } = {}) {
    super(message, { cause });
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Ресурс') {
    super(`${resource} не найден`, { status: 404, code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, { status: 409, code: 'CONFLICT' });
  }
}

export class ValidationError extends AppError {
  constructor(details = [], message = 'Некорректные данные запроса', status = 400) {
    super(message, {
      status,
      code: 'VALIDATION_ERROR',
      details
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Требуется аутентификация') {
    super(message, { status: 401, code: 'UNAUTHORIZED' });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Доступ запрещён') {
    super(message, { status: 403, code: 'FORBIDDEN' });
  }
}

export class BadGatewayError extends AppError {
  constructor(message = 'Ошибка внешнего сервиса', { cause, details } = {}) {
    super(message, { status: 502, code: 'BAD_GATEWAY', details, cause });
  }
}

export default {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  BadGatewayError
};
