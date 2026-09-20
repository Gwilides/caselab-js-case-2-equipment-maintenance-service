import { equipmentRepository } from '../repositories/index.js';
import { EquipmentService } from './EquipmentService.js';

export const equipmentService = new EquipmentService(equipmentRepository);

export default {
  equipmentService
};
