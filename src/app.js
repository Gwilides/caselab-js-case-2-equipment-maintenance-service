import express from 'express';
import requestId from './middlewares/requestId.js';
import notFoundHandler from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';

// Создание экземпляра приложения Express
const app = express();

// Базовые middleware конвейера
app.use(requestId);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Базовый роут проверки доступности
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Обработчик 404 для несуществующих путей
app.use(notFoundHandler);

// Централизованный обработчик ошибок
app.use(errorHandler);

export default app;
