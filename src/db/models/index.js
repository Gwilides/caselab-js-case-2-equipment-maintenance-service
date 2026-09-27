import { sequelize } from '../../config/database.js';
import Site from './Site.js';
import Equipment from './Equipment.js';
import EquipmentPassport from './EquipmentPassport.js';
import Technician from './Technician.js';
import MaintenanceRequest from './MaintenanceRequest.js';
import RequestStatusHistory from './RequestStatusHistory.js';
import RequestAssignee from './RequestAssignee.js';
import SparePart from './SparePart.js';
import RequestPart from './RequestPart.js';

// 1. Площадка -> Оборудование (1:N)
Site.hasMany(Equipment, {
  foreignKey: 'site_id',
  as: 'equipment',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Equipment.belongsTo(Site, {
  foreignKey: 'site_id',
  as: 'site'
});

// 2. Оборудование -> Паспорт (1:1)
Equipment.hasOne(EquipmentPassport, {
  foreignKey: 'equipment_id',
  as: 'passport',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
EquipmentPassport.belongsTo(Equipment, {
  foreignKey: 'equipment_id',
  as: 'equipment'
});

// 3. Оборудование -> Заявки (1:N)
Equipment.hasMany(MaintenanceRequest, {
  foreignKey: 'equipment_id',
  as: 'requests',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
MaintenanceRequest.belongsTo(Equipment, {
  foreignKey: 'equipment_id',
  as: 'equipment'
});

// 4. Заявка -> История статусов (1:N)
MaintenanceRequest.hasMany(RequestStatusHistory, {
  foreignKey: 'request_id',
  as: 'history',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
RequestStatusHistory.belongsTo(MaintenanceRequest, {
  foreignKey: 'request_id',
  as: 'request'
});

// 5. Заявки <-> Специалисты (N:M через request_assignees)
MaintenanceRequest.belongsToMany(Technician, {
  through: RequestAssignee,
  foreignKey: 'request_id',
  otherKey: 'technician_id',
  as: 'technicians'
});
Technician.belongsToMany(MaintenanceRequest, {
  through: RequestAssignee,
  foreignKey: 'technician_id',
  otherKey: 'request_id',
  as: 'requests'
});

MaintenanceRequest.hasMany(RequestAssignee, {
  foreignKey: 'request_id',
  as: 'assignees',
  onDelete: 'CASCADE'
});
RequestAssignee.belongsTo(MaintenanceRequest, {
  foreignKey: 'request_id',
  as: 'request'
});

RequestAssignee.belongsTo(Technician, {
  foreignKey: 'technician_id',
  as: 'technician'
});
Technician.hasMany(RequestAssignee, {
  foreignKey: 'technician_id',
  as: 'assignments',
  onDelete: 'CASCADE'
});

// 6. Заявки <-> Запчасти (N:M через request_parts) (Бонус)
MaintenanceRequest.belongsToMany(SparePart, {
  through: RequestPart,
  foreignKey: 'request_id',
  otherKey: 'spare_part_id',
  as: 'spareParts'
});
SparePart.belongsToMany(MaintenanceRequest, {
  through: RequestPart,
  foreignKey: 'spare_part_id',
  otherKey: 'request_id',
  as: 'requests'
});

MaintenanceRequest.hasMany(RequestPart, {
  foreignKey: 'request_id',
  as: 'partUsages',
  onDelete: 'CASCADE'
});
RequestPart.belongsTo(MaintenanceRequest, {
  foreignKey: 'request_id',
  as: 'request'
});

RequestPart.belongsTo(SparePart, {
  foreignKey: 'spare_part_id',
  as: 'sparePart'
});
SparePart.hasMany(RequestPart, {
  foreignKey: 'spare_part_id',
  as: 'usages',
  onDelete: 'RESTRICT'
});

export {
  sequelize,
  Site,
  Equipment,
  EquipmentPassport,
  Technician,
  MaintenanceRequest,
  RequestStatusHistory,
  RequestAssignee,
  SparePart,
  RequestPart
};

export default {
  sequelize,
  Site,
  Equipment,
  EquipmentPassport,
  Technician,
  MaintenanceRequest,
  RequestStatusHistory,
  RequestAssignee,
  SparePart,
  RequestPart
};
