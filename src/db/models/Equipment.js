import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Equipment extends Model {}

Equipment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    siteId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'site_id'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    serialNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'serial_number'
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'operational'
    },
    installedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'installed_at'
    }
  },
  {
    sequelize,
    modelName: 'Equipment',
    tableName: 'equipment',
    underscored: true,
    timestamps: true,
    paranoid: true
  }
);

export default Equipment;
