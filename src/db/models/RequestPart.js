import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class RequestPart extends Model {}

RequestPart.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    requestId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'request_id'
    },
    sparePartId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'spare_part_id'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    }
  },
  {
    sequelize,
    modelName: 'RequestPart',
    tableName: 'request_parts',
    underscored: true,
    timestamps: true
  }
);

export default RequestPart;
