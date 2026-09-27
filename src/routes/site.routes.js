import { Router } from 'express';
import { siteController } from '../controllers/site.controller.js';
import validate from '../middlewares/validate.js';
import { siteParamsSchema } from '../validators/site.schema.js';

const router = Router();

router.get('/:id/summary', validate({ params: siteParamsSchema }), siteController.getSummary);

export default router;
