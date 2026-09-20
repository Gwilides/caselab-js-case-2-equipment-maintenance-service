import { equipmentRepository, requestRepository } from '../repositories/index.js';
import { EquipmentService } from './EquipmentService.js';
import { RequestService } from './RequestService.js';
import { WeatherService } from './WeatherService.js';

export const equipmentService = new EquipmentService(equipmentRepository, requestRepository);
export const requestService = new RequestService(requestRepository, equipmentRepository);
export const weatherService = new WeatherService(equipmentRepository);

export default {
  equipmentService,
  requestService,
  weatherService
};
