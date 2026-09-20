import app from './app.js';
import env from './config/env.js';

const server = app.listen(env.port, () => {
  console.info(`[Server] Сервис запущен на порту ${env.port} в режиме ${env.nodeEnv}`);
});

// Корректная обработка сигналов завершения процесса (graceful shutdown)
const gracefulShutdown = (signal) => {
  console.info(`[Server] Получен сигнал ${signal}. Завершение работы...`);
  server.close(() => {
    console.info('[Server] HTTP сервер успешно остановлен.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
