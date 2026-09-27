import { SequelizeEquipmentRepository } from './sequelize/SequelizeEquipmentRepository.js';
import { SequelizeRequestRepository } from './sequelize/SequelizeRequestRepository.js';

export const equipmentRepository = new SequelizeEquipmentRepository();
export const requestRepository = new SequelizeRequestRepository();

export default {
  equipmentRepository,
  requestRepository
};
