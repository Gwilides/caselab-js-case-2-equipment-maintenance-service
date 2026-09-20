import { Router } from 'express';
import equipmentRoutes from './equipment.routes.js';
import requestRoutes from './request.routes.js';

const router = Router();

// Health check эндпоинт
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Роуты сущностей
router.use('/equipment', equipmentRoutes);
router.use('/requests', requestRoutes);

export default router;
