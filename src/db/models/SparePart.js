import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class SparePart extends Model {}

SparePart.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'stock_quantity',
      validate: {
        min: 0
      }
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'шт'
    }
  },
  {
    sequelize,
    modelName: 'SparePart',
    tableName: 'spare_parts',
    underscored: true,
    timestamps: true,
    paranoid: true
  }
);

export default SparePart;
