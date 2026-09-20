import { ValidationError } from '../errors/index.js';

/**
 * Фабрика middleware валидации входных данных через Zod.
 * Валидирует body, query и params, отбрасывает неизвестные поля
 * и сохраняет очищенные данные в req.valid.
 *
 * @param {object} schemas
 * @param {import('zod').ZodTypeAny} [schemas.body]
 * @param {import('zod').ZodTypeAny} [schemas.query]
 * @param {import('zod').ZodTypeAny} [schemas.params]
 * @returns {import('express').RequestHandler}
 */
export function validate(schemas = {}) {
  return (req, res, next) => {
    req.valid = req.valid || {};

    const parts = ['params', 'query', 'body'];

    for (const part of parts) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);

      if (!result.success) {
        // Формируем детальный список некорректных полей с сообщениями
        const details = result.error.issues.map((issue) => ({
          field: issue.path.length > 0 ? issue.path.join('.') : `(${part})`,
          message: issue.message
        }));

        return next(new ValidationError(details, 'Некорректные данные запроса'));
      }

      req.valid[part] = result.data;
    }

    next();
  };
}

export default validate;
