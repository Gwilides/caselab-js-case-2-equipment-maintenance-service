import { Router } from 'express';
import { requestController } from '../controllers/request.controller.js';
import validate from '../middlewares/validate.js';
import {
  createRequestSchema,
  updateRequestSchema,
  updateStatusSchema,
  requestQuerySchema,
  requestParamsSchema,
  bulkCreateRequestSchema
} from '../validators/request.schema.js';

const router = Router();

router.get(
  '/',
  validate({ query: requestQuerySchema }),
  requestController.getAll
);

router.post(
  '/',
  validate({ body: createRequestSchema }),
  requestController.create
);

// Массовый импорт заявок (207 Multi-Status)
router.post(
  '/bulk',
  validate({ body: bulkCreateRequestSchema }),
  requestController.bulkCreate
);

router.get(
  '/:id',
  validate({ params: requestParamsSchema }),
  requestController.getById
);

router.patch(
  '/:id',
  validate({ params: requestParamsSchema, body: updateRequestSchema }),
  requestController.update
);

router.patch(
  '/:id/status',
  validate({ params: requestParamsSchema, body: updateStatusSchema }),
  requestController.updateStatus
);

router.delete(
  '/:id',
  validate({ params: requestParamsSchema }),
  requestController.delete
);

export default router;
