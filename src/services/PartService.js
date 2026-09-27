import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { sequelize, SparePart, RequestPart, MaintenanceRequest } from '../db/models/index.js';
import { NotFoundError, ConflictError } from '../errors/index.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export class PartService {
  async getAllParts({ search, limit = 50, offset = 0 } = {}) {
    const where = {};
    if (search) {
      const q = `%${search}%`;
      where[Op.or] = [{ name: { [Op.iLike]: q } }, { code: { [Op.iLike]: q } }];
    }

    const { rows, count } = await SparePart.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: Math.min(100, Math.max(1, parseInt(limit || 50, 10))),
      offset: Math.max(0, parseInt(offset || 0, 10))
    });

    return {
      items: rows.map((r) => r.toJSON()),
      total: count
    };
  }

  async getPartById(id) {
    if (!isValidUUID(id)) {
      throw new NotFoundError(`Запчасть с id "${id}"`);
    }

    const part = await SparePart.findByPk(id);
    if (!part) {
      throw new NotFoundError(`Запчасть с id "${id}"`);
    }

    return part.toJSON();
  }

  async createPart(data) {
    const existing = await SparePart.findOne({ where: { code: data.code } });
    if (existing) {
      throw new ConflictError(`Запчасть с кодом "${data.code}" уже зарегистрирована`);
    }

    const created = await SparePart.create({
      id: crypto.randomUUID(),
      name: data.name,
      code: data.code,
      stockQuantity: data.stockQuantity || 0,
      unit: data.unit || 'шт'
    });

    return created.toJSON();
  }

  async usePartInRequest(requestId, { partId, quantity }) {
    if (!isValidUUID(requestId)) {
      throw new NotFoundError(`Заявка с id "${requestId}"`);
    }
    if (!isValidUUID(partId)) {
      throw new NotFoundError(`Запчасть с id "${partId}"`);
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      throw new ConflictError('Количество списания должно быть положительным числом');
    }

    return await sequelize.transaction(async (t) => {
      // 1. Проверяем существование заявки
      const reqRecord = await MaintenanceRequest.findByPk(requestId, { transaction: t });
      if (!reqRecord) {
        throw new NotFoundError(`Заявка с id "${requestId}"`);
      }

      // 2. Блокируем строку запчасти для защиты от параллельного списания
      const part = await SparePart.findByPk(partId, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!part) {
        throw new NotFoundError(`Запчасть с id "${partId}"`);
      }

      // 3. Проверяем остаток на складе
      if (part.stockQuantity < parsedQty) {
        throw new ConflictError(
          `Недостаточно запчастей "${part.name}" на складе. Доступно: ${part.stockQuantity}, запрошено: ${parsedQty}`
        );
      }

      // 4. Списываем остаток
      await part.update(
        {
          stockQuantity: part.stockQuantity - parsedQty
        },
        { transaction: t }
      );

      // 5. Фиксируем использование запчасти в заявке (N:M)
      const usage = await RequestPart.create(
        {
          id: crypto.randomUUID(),
          requestId,
          sparePartId: partId,
          quantity: parsedQty
        },
        { transaction: t }
      );

      const reloadedUsage = await RequestPart.findByPk(usage.id, {
        include: [{ model: SparePart, as: 'sparePart' }],
        transaction: t
      });

      return reloadedUsage ? reloadedUsage.toJSON() : usage.toJSON();
    });
  }

  async getRequestParts(requestId) {
    if (!isValidUUID(requestId)) {
      throw new NotFoundError(`Заявка с id "${requestId}"`);
    }

    const reqRecord = await MaintenanceRequest.findByPk(requestId);
    if (!reqRecord) {
      throw new NotFoundError(`Заявка с id "${requestId}"`);
    }

    const usages = await RequestPart.findAll({
      where: { requestId },
      include: [
        {
          model: SparePart,
          as: 'sparePart',
          attributes: ['id', 'name', 'code', 'unit', 'stockQuantity']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return usages.map((u) => u.toJSON());
  }
}

export const partService = new PartService();
export default partService;
