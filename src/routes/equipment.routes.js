import { Router } from 'express';
import { equipmentController } from '../controllers/equipment.controller.js';
import validate from '../middlewares/validate.js';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  equipmentQuerySchema,
  equipmentParamsSchema
} from '../validators/equipment.schema.js';

const router = Router();

router.get(
  '/',
  validate({ query: equipmentQuerySchema }),
  equipmentController.getAll
);

router.post(
  '/',
  validate({ body: createEquipmentSchema }),
  equipmentController.create
);

router.get(
  '/:id',
  validate({ params: equipmentParamsSchema }),
  equipmentController.getById
);

router.patch(
  '/:id',
  validate({ params: equipmentParamsSchema, body: updateEquipmentSchema }),
  equipmentController.update
);

router.delete(
  '/:id',
  validate({ params: equipmentParamsSchema }),
  equipmentController.delete
);

export default router;
