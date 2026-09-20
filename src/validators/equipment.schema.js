import { z } from 'zod';

const equipmentTypes = ['turbine', 'inverter', 'sensor', 'substation'];
const equipmentStatuses = ['operational', 'maintenance', 'fault', 'decommissioned'];

export const locationSchema = z.object({
  lat: z
    .number()
    .min(-90, 'Широта должна быть в диапазоне от -90 до 90')
    .max(90, 'Широта должна быть в диапазоне от -90 до 90'),
  lon: z
    .number()
    .min(-180, 'Долгота должна быть в диапазоне от -180 до 180')
    .max(180, 'Долгота должна быть в диапазоне от -180 до 180')
});

export const createEquipmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Название должно содержать от 3 до 100 символов')
    .max(100, 'Название должно содержать от 3 до 100 символов'),
  type: z.enum(equipmentTypes, {
    errorMap: () => ({ message: `Тип должен быть одним из: ${equipmentTypes.join(', ')}` })
  }),
  serialNumber: z.string().trim().min(1, 'Серийный номер обязателен'),
  location: locationSchema,
  status: z
    .enum(equipmentStatuses, {
      errorMap: () => ({ message: `Статус должен быть одним из: ${equipmentStatuses.join(', ')}` })
    })
    .optional()
    .default('operational'),
  installedAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Некорректный формат даты установки (ожидается ISO)'
    })
    .refine((val) => new Date(val).getTime() <= Date.now() + 60_000, {
      message: 'Дата установки не может быть в будущем'
    })
});

export const updateEquipmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Название должно содержать от 3 до 100 символов')
      .max(100, 'Название должно содержать от 3 до 100 символов')
      .optional(),
    type: z
      .enum(equipmentTypes, {
        errorMap: () => ({ message: `Тип должен быть одним из: ${equipmentTypes.join(', ')}` })
      })
      .optional(),
    serialNumber: z.string().trim().min(1, 'Серийный номер не может быть пустым').optional(),
    location: locationSchema.optional(),
    status: z
      .enum(equipmentStatuses, {
        errorMap: () => ({
          message: `Статус должен быть одним из: ${equipmentStatuses.join(', ')}`
        })
      })
      .optional(),
    installedAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Некорректный формат даты установки (ожидается ISO)'
      })
      .refine((val) => new Date(val).getTime() <= Date.now() + 60_000, {
        message: 'Дата установки не может быть в будущем'
      })
      .optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Необходимо передать хотя бы одно поле для обновления'
  });

const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Некорректный формат даты (ожидается ISO)'
});

export const equipmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(equipmentStatuses).optional(),
  type: z.enum(equipmentTypes).optional(),
  installedFrom: isoDateString.optional(),
  installedTo: isoDateString.optional(),
  sortBy: z.enum(['name', 'installedAt', 'createdAt', 'status', 'type']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().optional()
});

export const equipmentParamsSchema = z.object({
  id: z.string().trim().min(1, 'Идентификатор оборудования обязателен')
});

export default {
  createEquipmentSchema,
  updateEquipmentSchema,
  equipmentQuerySchema,
  equipmentParamsSchema
};
