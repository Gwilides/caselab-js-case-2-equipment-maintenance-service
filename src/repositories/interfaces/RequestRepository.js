/**
 * Интерфейс репозитория заявок на техническое обслуживание.
 */
export class RequestRepository {
  async findAll(_options = {}) {
    throw new Error('Method findAll() must be implemented');
  }

  async findById(_id) {
    throw new Error('Method findById() must be implemented');
  }

  async findByEquipmentId(_equipmentId, _options = {}) {
    throw new Error('Method findByEquipmentId() must be implemented');
  }

  async hasActiveRequestsForEquipment(_equipmentId) {
    throw new Error('Method hasActiveRequestsForEquipment() must be implemented');
  }

  async create(_request) {
    throw new Error('Method create() must be implemented');
  }

  async update(_id, _updates) {
    throw new Error('Method update() must be implemented');
  }

  async delete(_id) {
    throw new Error('Method delete() must be implemented');
  }
}

export default RequestRepository;
