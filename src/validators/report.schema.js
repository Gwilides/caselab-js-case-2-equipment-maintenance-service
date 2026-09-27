import { z } from 'zod';

const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Некорректный формат даты (ожидается ISO)'
});

export const equipmentLoadQuerySchema = z.object({
  minRequests: z.coerce.number().int().min(0).default(0),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  from: isoDateString.optional(),
  to: isoDateString.optional(),
  siteId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z
    .enum([
      'totalRequests',
      'closedRequests',
      'totalHours',
      'equipmentName',
      'serialNumber',
      'lastMaintenanceDate'
    ])
    .default('totalRequests'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export default {
  equipmentLoadQuerySchema
};
