import crypto from 'node:crypto';
import { NotFoundError, ConflictError } from '../errors/index.js';

export class EquipmentService {
  /**
   * @param {import('../repositories/interfaces/EquipmentRepository.js').EquipmentRepository} equipmentRepository
   * @param {object} [requestRepository]
   */
  constructor(equipmentRepository, requestRepository = null) {
    this.equipmentRepository = equipmentRepository;
    this.requestRepository = requestRepository;
  }

  setRequestRepository(requestRepository) {
    this.requestRepository = requestRepository;
  }

  async create(data) {
    const existing = await this.equipmentRepository.findBySerialNumber(data.serialNumber);
    if (existing) {
      throw new ConflictError(
        `Оборудование с серийным номером "${data.serialNumber}" уже зарегистрировано`
      );
    }

    const now = new Date().toISOString();
    const entity = {
      id: crypto.randomUUID(),
      name: data.name,
      type: data.type,
      serialNumber: data.serialNumber,
      location: data.location,
      status: data.status || 'operational',
      installedAt: data.installedAt,
      createdAt: now,
      updatedAt: now
    };

    return await this.equipmentRepository.create(entity);
  }

  async getAll({
    page = 1,
    limit = 10,
    status,
    type,
    installedFrom,
    installedTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search
  } = {}) {
    const { items, total } = await this.equipmentRepository.findAll({
      filter: { status, type, installedFrom, installedTo, search },
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
    const item = await this.equipmentRepository.findById(id);
    if (!item) {
      throw new NotFoundError(`Оборудование с id "${id}"`);
    }
    return item;
  }

  async update(id, updates) {
    const existing = await this.getById(id);

    if (
      updates.serialNumber &&
      updates.serialNumber.toLowerCase() !== existing.serialNumber.toLowerCase()
    ) {
      const duplicate = await this.equipmentRepository.findBySerialNumber(updates.serialNumber);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(
          `Оборудование с серийным номером "${updates.serialNumber}" уже зарегистрировано`
        );
      }
    }

    // Защита от мутации служебных полей
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.createdAt;
    safeUpdates.updatedAt = new Date().toISOString();

    return await this.equipmentRepository.update(id, safeUpdates);
  }

  async delete(id) {
    await this.getById(id);

    // Бизнес-правило: запрещено удалять оборудование с незакрытыми заявками (new / in_progress)
    if (
      this.requestRepository &&
      typeof this.requestRepository.hasActiveRequestsForEquipment === 'function'
    ) {
      const hasActive = await this.requestRepository.hasActiveRequestsForEquipment(id);
      if (hasActive) {
        throw new ConflictError(
          'Невозможно удалить оборудование: имеются активные (незакрытые) заявки на обслуживание'
        );
      }
    }

    await this.equipmentRepository.delete(id);
    return true;
  }
}

export default EquipmentService;
