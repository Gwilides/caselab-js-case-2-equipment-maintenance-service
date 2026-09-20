/**
 * Интерфейс репозитория оборудования.
 * Изолирует слой хранения данных от сервисного слоя.
 */
export class EquipmentRepository {
  async findAll(_options = {}) {
    throw new Error('Method findAll() must be implemented');
  }

  async findById(_id) {
    throw new Error('Method findById() must be implemented');
  }

  async findBySerialNumber(_serialNumber) {
    throw new Error('Method findBySerialNumber() must be implemented');
  }

  async create(_equipment) {
    throw new Error('Method create() must be implemented');
  }

  async update(_id, _updates) {
    throw new Error('Method update() must be implemented');
  }

  async delete(_id) {
    throw new Error('Method delete() must be implemented');
  }
}

export default EquipmentRepository;
