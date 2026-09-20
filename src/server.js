import app from './app.js';
import env from './config/env.js';
import { logger } from './middlewares/logger.js';

const server = app.listen(env.port, () => {
  logger.info({ port: env.port, env: env.nodeEnv }, `Сервер запущен на порту ${env.port}`);
});

// Корректная обработка сигналов завершения процесса (graceful shutdown)
const gracefulShutdown = (reason, exitCode = 0) => {
  logger.info({ reason }, `Завершение работы процесса (${reason})...`);
  server.close(() => {
    logger.info('HTTP-сервер успешно остановлен.');
    process.exit(exitCode);
  });
  setTimeout(() => {
    process.exit(exitCode);
  }, 10_000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));
process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Неперехваченное исключение (uncaughtException)');
  gracefulShutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Необработанное отклонение промиса (unhandledRejection)');
  gracefulShutdown('unhandledRejection', 1);
});

export default server;
