import { z } from 'zod';

export const createPartSchema = z.object({
  name: z.string().trim().min(2, 'Наименование запчасти должно содержать минимум 2 символа').max(150),
  code: z.string().trim().min(2, 'Артикул / код запчасти должен содержать минимум 2 символа').max(50),
  stockQuantity: z.coerce.number().int().min(0, 'Количество на складе не может быть отрицательным').optional().default(0),
  unit: z.string().trim().max(20).optional().default('шт')
});

export const usePartSchema = z.object({
  partId: z.string().uuid('Некорректный идентификатор запчасти (ожидается UUID)'),
  quantity: z.coerce.number().int().positive('Количество должно быть положительным целым числом')
});

export const partParamsSchema = z.object({
  id: z.string().uuid('Некорректный идентификатор запчасти (ожидается UUID)')
});

export const partQuerySchema = z.object({
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0)
});
