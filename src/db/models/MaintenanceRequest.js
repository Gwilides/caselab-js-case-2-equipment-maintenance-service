import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class MaintenanceRequest extends Model {}

MaintenanceRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    equipmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'equipment_id'
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ''
    },
    priority: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'new'
    },
    plannedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'planned_at'
    },
    author: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Система'
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'closed_at'
    }
  },
  {
    sequelize,
    modelName: 'MaintenanceRequest',
    tableName: 'maintenance_requests',
    underscored: true,
    timestamps: true,
    paranoid: true
  }
);

export default MaintenanceRequest;
