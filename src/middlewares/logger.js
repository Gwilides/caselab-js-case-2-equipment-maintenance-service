import pino from 'pino';
import { pinoHttp } from 'pino-http';
import env from '../config/env.js';

export const logger = pino({
  level: env.isTest ? 'silent' : env.logLevel,
  base: { service: 'equipment-maintenance-service' },
  timestamp: pino.stdTimeFunctions.isoTime
});

/**
 * Middleware структурированного HTTP-логирования.
 * Логирует: метод, путь, код ответа, длительность и идентификатор запроса.
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id || req.headers['x-request-id'] || 'unknown-req-id',
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`,
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode
      };
    }
  }
});

export default httpLogger;
