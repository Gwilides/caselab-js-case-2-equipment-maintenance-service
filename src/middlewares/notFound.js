import { NotFoundError } from '../errors/index.js';

/**
 * Обработчик несуществующих маршрутов (404).
 * Передаёт NotFoundError в централизованный обработчик ошибок.
 */
export function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Маршрут ${req.method} ${req.originalUrl || req.url}`));
}

export default notFoundHandler;
