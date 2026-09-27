import { Router } from 'express';
import { sequelize } from '../config/database.js';
import equipmentRoutes from './equipment.routes.js';
import requestRoutes from './request.routes.js';
import authRoutes from './auth.routes.js';

const router = Router();

// Health check эндпоинт с проверкой состояния подключения к БД
router.get('/health', async (req, res) => {
  let dbStatus = 'connected';
  let isHealthy = true;

  try {
    await sequelize.authenticate();
  } catch {
    dbStatus = 'disconnected';
    if (process.env.NODE_ENV !== 'test') {
      isHealthy = false;
    }
  }

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: isHealthy ? 'ok' : 'error',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Роуты аутентификации и сессий
router.use('/auth', authRoutes);

// Роуты сущностей
router.use('/equipment', equipmentRoutes);
router.use('/requests', requestRoutes);

export default router;
