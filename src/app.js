import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import requestId from './middlewares/requestId.js';
import httpLogger from './middlewares/logger.js';
import corsMiddleware from './middlewares/cors.js';
import rateLimiter from './middlewares/rateLimiter.js';
import requireAuth from './middlewares/auth.js';
import notFoundHandler from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import apiRouter from './routes/index.js';

// Создание экземпляра приложения Express
const app = express();

// 1. Сквозная трассировка запросов (присвоение UUID и установка заголовка X-Request-ID)
app.use(requestId);

// 2. Структурированное логирование HTTP-запросов через pino-http
app.use(httpLogger);

// 3. Защитные HTTP-заголовки (Helmet)
app.use(helmet({ contentSecurityPolicy: false }));

// 4. Политика CORS с белым списком доверенных источников
app.use(corsMiddleware);

// 5. Ограничение частоты запросов (Rate Limiting)
app.use('/api', rateLimiter);

// 6. Парсинг защищенных cookie
app.use(cookieParser());

// 7. Парсинг тела запросов с ограничением размера до 100kb
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 8. Аутентификация изменяющих операций (API-ключ / cookie auth_token)
app.use('/api', requireAuth);

// 9. Подключение маршрутов API
app.use('/api', apiRouter);

// 10. Обработчик несуществующих маршрутов (404 Not Found)
app.use(notFoundHandler);

// 11. Централизованный обработчик ошибок
app.use(errorHandler);

export default app;
