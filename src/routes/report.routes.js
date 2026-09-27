import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import validate from '../middlewares/validate.js';
import { equipmentLoadQuerySchema } from '../validators/report.schema.js';

const router = Router();

router.get(
  '/equipment-load',
  validate({ query: equipmentLoadQuerySchema }),
  reportController.getEquipmentLoad
);

export default router;
