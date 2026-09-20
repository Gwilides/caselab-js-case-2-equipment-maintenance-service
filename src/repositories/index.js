import path from 'node:path';
import env from '../config/env.js';
import { FileEquipmentRepository } from './file/FileEquipmentRepository.js';

const equipmentFilePath = path.resolve(process.cwd(), env.dataDir, 'equipment.json');

export const equipmentRepository = new FileEquipmentRepository(equipmentFilePath);

export default {
  equipmentRepository
};
