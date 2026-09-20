import express from 'express';
import requestId from './middlewares/requestId.js';
import notFoundHandler from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import apiRouter from './routes/index.js';

// Создание экземпляра приложения Express
const app = express();

// Базовые middleware конвейера
app.use(requestId);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Подключение API роутера
app.use('/api', apiRouter);

// Обработчик 404 для несуществующих путей
app.use(notFoundHandler);

// Централизованный обработчик ошибок
app.use(errorHandler);

export default app;
