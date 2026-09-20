import { Router } from 'express';
import { equipmentController } from '../controllers/equipment.controller.js';
import { requestController } from '../controllers/request.controller.js';
import { weatherController } from '../controllers/weather.controller.js';
import validate from '../middlewares/validate.js';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  equipmentQuerySchema,
  equipmentParamsSchema
} from '../validators/equipment.schema.js';
import { requestQuerySchema } from '../validators/request.schema.js';

const router = Router();

router.get('/', validate({ query: equipmentQuerySchema }), equipmentController.getAll);

router.post('/', validate({ body: createEquipmentSchema }), equipmentController.create);

router.get('/:id', validate({ params: equipmentParamsSchema }), equipmentController.getById);

// Вложенный ресурс: заявки по конкретной единице оборудования
router.get(
  '/:id/requests',
  validate({ params: equipmentParamsSchema, query: requestQuerySchema }),
  requestController.getByEquipmentId
);

// Прогноз погоды и оценка пригодности наружных работ
router.get(
  '/:id/weather',
  validate({ params: equipmentParamsSchema }),
  weatherController.getEquipmentWeather
);

router.patch(
  '/:id',
  validate({ params: equipmentParamsSchema, body: updateEquipmentSchema }),
  equipmentController.update
);

router.delete('/:id', validate({ params: equipmentParamsSchema }), equipmentController.delete);

export default router;
