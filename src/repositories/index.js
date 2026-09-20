import path from 'node:path';
import env from '../config/env.js';
import { FileEquipmentRepository } from './file/FileEquipmentRepository.js';
import { FileRequestRepository } from './file/FileRequestRepository.js';

const equipmentFilePath = path.resolve(process.cwd(), env.dataDir, 'equipment.json');
const requestFilePath = path.resolve(process.cwd(), env.dataDir, 'requests.json');

export const equipmentRepository = new FileEquipmentRepository(equipmentFilePath);
export const requestRepository = new FileRequestRepository(requestFilePath);

export default {
  equipmentRepository,
  requestRepository
};
