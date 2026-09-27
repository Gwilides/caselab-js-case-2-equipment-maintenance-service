import { equipmentRepository, requestRepository } from '../repositories/index.js';
import { EquipmentService } from './EquipmentService.js';
import { RequestService } from './RequestService.js';
import { WeatherService } from './WeatherService.js';
import { partService, PartService } from './PartService.js';

export const equipmentService = new EquipmentService(equipmentRepository, requestRepository);
export const requestService = new RequestService(requestRepository, equipmentRepository);
export const weatherService = new WeatherService(equipmentRepository);
export { partService, PartService };

export default {
  equipmentService,
  requestService,
  weatherService,
  partService
};

