import { Router } from 'express';
import { requestController } from '../controllers/request.controller.js';
import validate from '../middlewares/validate.js';
import {
  createRequestSchema,
  updateRequestSchema,
  updateStatusSchema,
  requestQuerySchema,
  requestParamsSchema,
  bulkCreateRequestSchema,
  assignTeamSchema,
  removeAssigneeParamsSchema
} from '../validators/request.schema.js';
import { usePartSchema } from '../validators/part.schema.js';

const router = Router();

router.get('/', validate({ query: requestQuerySchema }), requestController.getAll);

router.post('/', validate({ body: createRequestSchema }), requestController.create);

// Массовый импорт заявок (207 Multi-Status)
router.post('/bulk', validate({ body: bulkCreateRequestSchema }), requestController.bulkCreate);

// Назначение бригады специалистов на заявку
router.post(
  '/:id/assignees',
  validate({ params: requestParamsSchema, body: assignTeamSchema }),
  requestController.assignTeam
);

// Снятие специалиста с заявки
router.delete(
  '/:id/assignees/:userId',
  validate({ params: removeAssigneeParamsSchema }),
  requestController.removeAssignee
);

// Журнал истории изменения статусов
router.get('/:id/history', validate({ params: requestParamsSchema }), requestController.getStatusHistory);

// Списание и учёт запчастей по заявке
router.post(
  '/:id/parts',
  validate({ params: requestParamsSchema, body: usePartSchema }),
  requestController.usePart
);
router.get('/:id/parts', validate({ params: requestParamsSchema }), requestController.getParts);

router.get('/:id', validate({ params: requestParamsSchema }), requestController.getById);


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

router.delete('/:id', validate({ params: requestParamsSchema }), requestController.delete);

export default router;
