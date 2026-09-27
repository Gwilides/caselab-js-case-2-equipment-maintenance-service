import app from './app.js';
import env from './config/env.js';
import { logger } from './middlewares/logger.js';
import { checkDatabaseConnection, closeDatabaseConnection } from './config/database.js';

let server;

async function bootstrap() {
  try {
    logger.info('Проверка подключения к базе данных PostgreSQL...');
    await checkDatabaseConnection();
    logger.info('Подключение к PostgreSQL успешно установлено.');
  } catch (err) {
    logger.fatal(
      { err: err.message, host: env.db.host, port: env.db.port, db: env.db.name },
      'Критическая ошибка: база данных PostgreSQL недоступна при старте приложения'
    );
    process.exit(1);
  }

  server = app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, `Сервер запущен на порту ${env.port}`);
  });
}

// Корректная обработка сигналов завершения процесса (graceful shutdown)
const gracefulShutdown = async (reason, exitCode = 0) => {
  logger.info({ reason }, `Завершение работы процесса (${reason})...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP-сервер успешно остановлен. Закрытие соединений с БД...');
      await closeDatabaseConnection();
      logger.info('Пул соединений с PostgreSQL закрыт.');
      process.exit(exitCode);
    });
  } else {
    await closeDatabaseConnection();
    process.exit(exitCode);
  }

  setTimeout(() => {
    logger.warn('Принудительное завершение по таймауту');
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

bootstrap();

export default server;
