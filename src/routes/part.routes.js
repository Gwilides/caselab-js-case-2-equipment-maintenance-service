import { Router } from 'express';
import { partController } from '../controllers/part.controller.js';
import validate from '../middlewares/validate.js';
import {
  createPartSchema,
  partParamsSchema,
  partQuerySchema
} from '../validators/part.schema.js';

const router = Router();

router.get('/', validate({ query: partQuerySchema }), partController.getAll);
router.post('/', validate({ body: createPartSchema }), partController.create);
router.get('/:id', validate({ params: partParamsSchema }), partController.getById);

export default router;
