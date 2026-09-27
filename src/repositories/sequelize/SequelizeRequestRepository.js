import { Op } from 'sequelize';
import crypto from 'node:crypto';
import { RequestRepository } from '../interfaces/RequestRepository.js';
import {
  sequelize,
  MaintenanceRequest,
  RequestAssignee,
  Technician,
  RequestStatusHistory
} from '../../db/models/index.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function parseDateBoundary(dateStr, isEndOfDay = false) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + (isEndOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'));
  }
  return new Date(dateStr);
}

const ALLOWED_SORT_FIELDS = [
  'id',
  'title',
  'priority',
  'status',
  'plannedAt',
  'createdAt',
  'updatedAt'
];

export class SequelizeRequestRepository extends RequestRepository {
  async findAll({ filter = {}, sort = {}, pagination = {} } = {}) {
    const where = {};

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.priority) {
      where.priority = filter.priority;
    }
    if (filter.equipmentId) {
      if (!isValidUUID(filter.equipmentId)) {
        return { items: [], total: 0 };
      }
      where.equipmentId = filter.equipmentId;
    }

    if (filter.createdFrom && filter.createdTo) {
      where.createdAt = {
        [Op.gte]: parseDateBoundary(filter.createdFrom, false),
        [Op.lte]: parseDateBoundary(filter.createdTo, true)
      };
    } else if (filter.createdFrom) {
      where.createdAt = {
        [Op.gte]: parseDateBoundary(filter.createdFrom, false)
      };
    } else if (filter.createdTo) {
      where.createdAt = {
        [Op.lte]: parseDateBoundary(filter.createdTo, true)
      };
    }

    if (filter.plannedFrom && filter.plannedTo) {
      where.plannedAt = {
        [Op.gte]: parseDateBoundary(filter.plannedFrom, false),
        [Op.lte]: parseDateBoundary(filter.plannedTo, true)
      };
    } else if (filter.plannedFrom) {
      where.plannedAt = {
        [Op.gte]: parseDateBoundary(filter.plannedFrom, false)
      };
    } else if (filter.plannedTo) {
      where.plannedAt = {
        [Op.lte]: parseDateBoundary(filter.plannedTo, true)
      };
    }

    if (filter.search) {
      const q = `%${filter.search}%`;
      where[Op.or] = [{ title: { [Op.iLike]: q } }, { description: { [Op.iLike]: q } }];
    }

    const sortBy = ALLOWED_SORT_FIELDS.includes(sort.sortBy) ? sort.sortBy : 'createdAt';
    const sortOrder = sort.sortOrder && sort.sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const page = Math.max(1, parseInt(pagination.page || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit || 10, 10)));
    const offset = (page - 1) * limit;

    const { rows, count } = await MaintenanceRequest.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      include: [
        {
          model: RequestAssignee,
          as: 'assignees',
          attributes: ['role', 'hours', 'technicianId'],
          include: [
            {
              model: Technician,
              as: 'technician',
              attributes: ['id', 'fullName', 'specialization', 'employeeId']
            }
          ]
        }
      ],
      distinct: true
    });

    return {
      items: rows.map((r) => r.toJSON()),
      total: count
    };
  }

  async findById(id, options = {}) {
    if (!isValidUUID(id)) return null;

    const item = await MaintenanceRequest.findByPk(id, {
      include: [
        {
          model: RequestAssignee,
          as: 'assignees',
          attributes: ['role', 'hours', 'technicianId'],
          include: [
            {
              model: Technician,
              as: 'technician',
              attributes: ['id', 'fullName', 'specialization', 'employeeId']
            }
          ]
        },
        {
          model: RequestStatusHistory,
          as: 'history',
          attributes: ['id', 'fromStatus', 'toStatus', 'author', 'comment', 'createdAt']
        }
      ],
      ...options
    });

    return item ? item.toJSON() : null;
  }

  async findByEquipmentId(equipmentId, options = {}) {
    if (!isValidUUID(equipmentId)) {
      return { items: [], total: 0 };
    }
    return this.findAll({
      ...options,
      filter: {
        ...(options.filter || {}),
        equipmentId
      }
    });
  }

  async hasActiveRequestsForEquipment(equipmentId) {
    if (!isValidUUID(equipmentId)) return false;
    const count = await MaintenanceRequest.count({
      where: {
        equipmentId,
        status: {
          [Op.in]: ['new', 'in_progress']
        }
      }
    });
    return count > 0;
  }

  async create(requestData, options = {}) {
    const execute = async (t) => {
      const created = await MaintenanceRequest.create(
        {
          id: requestData.id || crypto.randomUUID(),
          equipmentId: requestData.equipmentId,
          title: requestData.title,
          description: requestData.description || '',
          priority: requestData.priority,
          status: requestData.status || 'new',
          plannedAt: requestData.plannedAt || null,
          author: requestData.author || 'Система',
          closedAt: requestData.status === 'done' ? new Date() : null
        },
        { transaction: t }
      );

      // Фиксируем исходную запись в журнал истории статусов
      await RequestStatusHistory.create(
        {
          id: crypto.randomUUID(),
          requestId: created.id,
          fromStatus: null,
          toStatus: created.status,
          author: requestData.author || 'Система',
          comment: 'Создание заявки'
        },
        { transaction: t }
      );

      return created.toJSON();
    };

    if (options.transaction) {
      return await execute(options.transaction);
    }
    return await sequelize.transaction(execute);
  }

  async update(id, updates, options = {}) {
    if (!isValidUUID(id)) return null;

    const execute = async (t) => {
      const item = await MaintenanceRequest.findByPk(id, { transaction: t });
      if (!item) return null;

      const safeUpdates = { ...updates };
      delete safeUpdates.id;
      delete safeUpdates.equipmentId;
      delete safeUpdates.createdAt;

      if (safeUpdates.status === 'done' && !item.closedAt) {
        safeUpdates.closedAt = new Date();
      }

      await item.update(safeUpdates, { transaction: t });

      const reloaded = await MaintenanceRequest.findByPk(id, {
        include: [
          {
            model: RequestAssignee,
            as: 'assignees',
            attributes: ['role', 'hours', 'technicianId'],
            include: [
              {
                model: Technician,
                as: 'technician',
                attributes: ['id', 'fullName', 'specialization', 'employeeId']
              }
            ]
          }
        ],
        transaction: t
      });

      return reloaded ? reloaded.toJSON() : item.toJSON();
    };

    if (options.transaction) {
      return await execute(options.transaction);
    }
    return await sequelize.transaction(execute);
  }

  async delete(id, options = {}) {
    if (!isValidUUID(id)) return false;

    const deletedCount = await MaintenanceRequest.destroy({
      where: { id },
      ...options
    });
    return deletedCount > 0;
  }
}

export default SequelizeRequestRepository;
