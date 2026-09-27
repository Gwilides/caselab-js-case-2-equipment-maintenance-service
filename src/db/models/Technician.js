import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Technician extends Model {}

Technician.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'full_name'
    },
    specialization: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'employee_id'
    }
  },
  {
    sequelize,
    modelName: 'Technician',
    tableName: 'technicians',
    underscored: true,
    timestamps: true,
    paranoid: true
  }
);

export default Technician;
