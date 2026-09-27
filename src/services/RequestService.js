import crypto from 'node:crypto';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  UnprocessableEntityError
} from '../errors/index.js';
import {
  sequelize,
  MaintenanceRequest,
  RequestAssignee,
  Technician,
  RequestStatusHistory
} from '../db/models/index.js';

// Таблица допустимых переходов статусов жизненного цикла заявки
const VALID_TRANSITIONS = {
  new: ['in_progress', 'rejected'],
  in_progress: ['done', 'rejected'],
  done: [],
  rejected: []
};

export class RequestService {
  /**
   * @param {import('../repositories/interfaces/RequestRepository.js').RequestRepository} requestRepository
   * @param {import('../repositories/interfaces/EquipmentRepository.js').EquipmentRepository} equipmentRepository
   */
  constructor(requestRepository, equipmentRepository) {
    this.requestRepository = requestRepository;
    this.equipmentRepository = equipmentRepository;
  }

  async create(data) {
    // Проверка существования оборудования (при отсутствии -> 404)
    const equipment = await this.equipmentRepository.findById(data.equipmentId);
    if (!equipment) {
      throw new NotFoundError(`Оборудование с id "${data.equipmentId}"`);
    }

    const now = new Date().toISOString();
    const entity = {
      id: crypto.randomUUID(),
      equipmentId: data.equipmentId,
      title: data.title,
      description: data.description || '',
      priority: data.priority,
      status: data.status || 'new',
      plannedAt: data.plannedAt || null,
      createdAt: now,
      updatedAt: now
    };

    return await this.requestRepository.create(entity);
  }

  async getAll({
    page = 1,
    limit = 10,
    status,
    priority,
    equipmentId,
    createdFrom,
    createdTo,
    plannedFrom,
    plannedTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search
  } = {}) {
    const { items, total } = await this.requestRepository.findAll({
      filter: {
        status,
        priority,
        equipmentId,
        createdFrom,
        createdTo,
        plannedFrom,
        plannedTo,
        search
      },
      sort: { sortBy, sortOrder },
      pagination: { page, limit }
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  async getById(id) {
    const item = await this.requestRepository.findById(id);
    if (!item) {
      throw new NotFoundError(`Заявка с id "${id}"`);
    }
    return item;
  }

  async getByEquipmentId(equipmentId, query = {}) {
    // Проверяем существование оборудования
    const equipment = await this.equipmentRepository.findById(equipmentId);
    if (!equipment) {
      throw new NotFoundError(`Оборудование с id "${equipmentId}"`);
    }

    return this.getAll({
      ...query,
      equipmentId
    });
  }

  async update(id, updates) {
    await this.getById(id);

    // Защита от мутации служебных и управляемых отдельными эндпоинтами полей
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.equipmentId;
    delete safeUpdates.createdAt;
    delete safeUpdates.status; // Статус обновляется только через /status

    safeUpdates.updatedAt = new Date().toISOString();

    return await this.requestRepository.update(id, safeUpdates);
  }

  async updateStatus(id, newStatus, { author = 'Система', comment = '' } = {}) {
    return await sequelize.transaction(async (t) => {
      // 1. Блокировка строки на уровне БД (SELECT FOR UPDATE) для предотвращения гонок
      const request = await MaintenanceRequest.findByPk(id, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!request) {
        throw new NotFoundError(`Заявка с id "${id}"`);
      }

      const currentStatus = request.status;
      if (currentStatus === newStatus) {
        throw new ConflictError(`Заявка уже находится в статусе "${currentStatus}"`);
      }

      const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowedNextStatuses.includes(newStatus)) {
        throw new ConflictError(
          `Недопустимый переход статуса заявки из "${currentStatus}" в "${newStatus}". Допустимые переходы: [${allowedNextStatuses.join(', ')}]`
        );
      }

      // Бизнес-правило Кейса 3: перевод в in_progress возможен только при наличии хотя бы одного специалиста
      if (newStatus === 'in_progress') {
        const assigneesCount = await RequestAssignee.count({
          where: { requestId: id },
          transaction: t
        });
        if (assigneesCount === 0) {
          throw new ConflictError(
            'Перевод заявки в статус "in_progress" невозможен без назначенной бригады специалистов'
          );
        }
      }

      const now = new Date();
      await request.update(
        {
          status: newStatus,
          closedAt: newStatus === 'done' ? now : request.closedAt,
          updatedAt: now
        },
        { transaction: t }
      );

      // Журналирование в append-only аудит-лог request_status_history
      await RequestStatusHistory.create(
        {
          id: crypto.randomUUID(),
          requestId: id,
          fromStatus: currentStatus,
          toStatus: newStatus,
          author,
          comment: comment || `Перевод статуса из ${currentStatus} в ${newStatus}`,
          createdAt: now
        },
        { transaction: t }
      );

      return await this.requestRepository.findById(id, { transaction: t });
    });
  }

  async assignTeam(id, rawAssignees) {
    await this.getById(id);

    const list = Array.isArray(rawAssignees)
      ? rawAssignees
      : rawAssignees && Array.isArray(rawAssignees.assignees)
        ? rawAssignees.assignees
        : [];

    if (list.length === 0) {
      throw new ValidationError([], 'Список специалистов бригады не может быть пустым');
    }

    // 1. Проверяем наличие ровно одного lead специалиста (иначе 422)
    const leads = list.filter((a) => a.role === 'lead');
    if (leads.length !== 1) {
      throw new UnprocessableEntityError(
        'В бригаде должен быть ровно один ведущий специалист (lead)'
      );
    }

    // 2. Проверяем отсутствие дубликатов специалистов в теле запроса (иначе 409)
    const seenTechIds = new Set();
    for (const a of list) {
      const techId = a.technicianId || a.userId;
      if (seenTechIds.has(techId)) {
        throw new ConflictError(`Повторное назначение того же специалиста "${techId}" невозможно`);
      }
      seenTechIds.add(techId);
    }

    // 3. Выполняем назначение в транзакции
    return await sequelize.transaction(async (t) => {
      const reqRecord = await MaintenanceRequest.findByPk(id, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });
      if (!reqRecord) {
        throw new NotFoundError(`Заявка с id "${id}"`);
      }

      // Проверяем существование каждого специалиста в БД (иначе 404)
      for (const a of list) {
        const techId = a.technicianId || a.userId;
        const tech = await Technician.findByPk(techId, { transaction: t });
        if (!tech) {
          throw new NotFoundError(`Специалист с id "${techId}"`);
        }
      }

      // Снимаем прежние назначения бригады
      await RequestAssignee.destroy({
        where: { requestId: id },
        transaction: t
      });

      // Назначаем новый состав бригады
      for (const a of list) {
        const techId = a.technicianId || a.userId;
        await RequestAssignee.create(
          {
            requestId: id,
            technicianId: techId,
            role: a.role,
            hours: parseFloat(a.hours) || 1.0
          },
          { transaction: t }
        );
      }

      const reloaded = await this.requestRepository.findById(id, { transaction: t });
      return reloaded.assignees;
    });
  }

  async removeAssignee(id, userId) {
    await this.getById(id);

    return await sequelize.transaction(async (t) => {
      const assignment = await RequestAssignee.findOne({
        where: {
          requestId: id,
          technicianId: userId
        },
        transaction: t
      });

      if (!assignment) {
        throw new NotFoundError(`Назначение специалиста "${userId}" на заявку "${id}"`);
      }

      await assignment.destroy({ transaction: t });
      return true;
    });
  }

  async getStatusHistory(id) {
    await this.getById(id);

    const history = await RequestStatusHistory.findAll({
      where: { requestId: id },
      order: [['createdAt', 'ASC']]
    });

    return history.map((h) => h.toJSON());
  }

  async delete(id) {
    await this.getById(id);
    await this.requestRepository.delete(id);
    return true;
  }

  async bulkCreate(requests) {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < requests.length; i++) {
      const item = requests[i];
      try {
        const created = await this.create(item);
        successful++;
        results.push({
          index: i,
          status: 'fulfilled',
          id: created.id,
          data: created
        });
      } catch (err) {
        failed++;
        results.push({
          index: i,
          status: 'rejected',
          error: {
            code: err.code || 'CREATION_FAILED',
            message: err.message
          }
        });
      }
    }

    return {
      total: requests.length,
      successful,
      failed,
      results
    };
  }
}

export default RequestService;
