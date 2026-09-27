import { z } from 'zod';

const priorities = ['low', 'medium', 'high', 'critical'];
const statuses = ['new', 'in_progress', 'done', 'rejected'];

const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Некорректный формат даты (ожидается ISO)'
});

export const createRequestSchema = z.object({
  equipmentId: z.string().trim().min(1, 'Идентификатор оборудования обязателен'),
  title: z
    .string()
    .trim()
    .min(5, 'Название должно содержать от 5 до 120 символов')
    .max(120, 'Название должно содержать от 5 до 120 символов'),
  description: z
    .string()
    .max(2000, 'Описание не может превышать 2000 символов')
    .optional()
    .default(''),
  priority: z.enum(priorities, {
    errorMap: () => ({ message: `Приоритет должен быть одним из: ${priorities.join(', ')}` })
  }),
  status: z
    .enum(statuses, {
      errorMap: () => ({ message: `Статус должен быть одним из: ${statuses.join(', ')}` })
    })
    .optional()
    .default('new'),
  plannedAt: isoDateString.optional()
});

export const updateRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, 'Название должно содержать от 5 до 120 символов')
      .max(120, 'Название должно содержать от 5 до 120 символов')
      .optional(),
    description: z.string().max(2000, 'Описание не может превышать 2000 символов').optional(),
    priority: z
      .enum(priorities, {
        errorMap: () => ({ message: `Приоритет должен быть одним из: ${priorities.join(', ')}` })
      })
      .optional(),
    plannedAt: isoDateString.optional().nullable()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Необходимо передать хотя бы одно поле для обновления'
  });

export const updateStatusSchema = z.object({
  status: z.enum(statuses, {
    errorMap: () => ({ message: `Статус должен быть одним из: ${statuses.join(', ')}` })
  })
});

export const requestQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(statuses).optional(),
  priority: z.enum(priorities).optional(),
  equipmentId: z.string().trim().optional(),
  createdFrom: isoDateString.optional(),
  createdTo: isoDateString.optional(),
  plannedFrom: isoDateString.optional(),
  plannedTo: isoDateString.optional(),
  sortBy: z
    .enum(['title', 'createdAt', 'updatedAt', 'plannedAt', 'priority', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().optional()
});

export const requestParamsSchema = z.object({
  id: z.string().trim().min(1, 'Идентификатор заявки обязателен')
});

export const bulkCreateRequestSchema = z.object({
  requests: z
    .array(
      z.object({
        equipmentId: z.string().trim().min(1, 'Идентификатор оборудования обязателен'),
        title: z
          .string()
          .trim()
          .min(5, 'Название должно содержать от 5 до 120 символов')
          .max(120, 'Название должно содержать от 5 до 120 символов'),
        description: z
          .string()
          .max(2000, 'Описание не может превышать 2000 символов')
          .optional()
          .default(''),
        priority: z.enum(priorities, {
          errorMap: () => ({ message: `Приоритет должен быть одним из: ${priorities.join(', ')}` })
        }),
        plannedAt: isoDateString.optional()
      })
    )
    .min(1, 'Массив заявок не может быть пустым')
    .max(100, 'Не более 100 заявок за один импорт')
});

export const assigneeItemSchema = z
  .object({
    userId: z.string().trim().optional(),
    technicianId: z.string().trim().optional(),
    role: z.enum(['lead', 'member'], {
      errorMap: () => ({ message: 'Роль специалиста должна быть "lead" или "member"' })
    }),
    hours: z.coerce
      .number()
      .positive('Плановые трудозатраты должны быть положительным числом')
      .optional()
      .default(1)
  })
  .refine((data) => data.userId || data.technicianId, {
    message: 'Необходимо указать userId или technicianId специалиста'
  });

export const assignTeamSchema = z.union([
  z.array(assigneeItemSchema).min(1, 'Список специалистов не может быть пустым'),
  z.object({
    assignees: z.array(assigneeItemSchema).min(1, 'Список специалистов не может быть пустым')
  })
]);

export const removeAssigneeParamsSchema = z.object({
  id: z.string().trim().min(1, 'Идентификатор заявки обязателен'),
  userId: z.string().trim().min(1, 'Идентификатор специалиста обязателен')
});

export default {
  createRequestSchema,
  updateRequestSchema,
  updateStatusSchema,
  requestQuerySchema,
  requestParamsSchema,
  bulkCreateRequestSchema,
  assigneeItemSchema,
  assignTeamSchema,
  removeAssigneeParamsSchema
};
