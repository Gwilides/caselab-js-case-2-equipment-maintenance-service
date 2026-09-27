import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class EquipmentPassport extends Model {}

EquipmentPassport.init(
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
      unique: true,
      field: 'equipment_id'
    },
    manufacturer: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    powerRating: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      field: 'power_rating'
    },
    lastInspectionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'last_inspection_date'
    }
  },
  {
    sequelize,
    modelName: 'EquipmentPassport',
    tableName: 'equipment_passports',
    underscored: true,
    timestamps: true,
    paranoid: true
  }
);

export default EquipmentPassport;
