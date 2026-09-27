import { z } from 'zod';

export const siteParamsSchema = z.object({
  id: z.string().trim().uuid('Идентификатор площадки должен быть валидным UUID')
});

export default {
  siteParamsSchema
};
