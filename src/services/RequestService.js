import crypto from 'node:crypto';
import { NotFoundError, ConflictError } from '../errors/index.js';

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

  async updateStatus(id, newStatus) {
    const existing = await this.getById(id);
    const currentStatus = existing.status;

    if (currentStatus === newStatus) {
      throw new ConflictError(`Заявка уже находится в статусе "${currentStatus}"`);
    }

    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
      throw new ConflictError(
        `Недопустимый переход статуса заявки из "${currentStatus}" в "${newStatus}". Допустимые переходы: [${allowedNextStatuses.join(', ')}]`
      );
    }

    const now = new Date().toISOString();
    return await this.requestRepository.update(id, {
      status: newStatus,
      updatedAt: now
    });
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
