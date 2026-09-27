import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class RequestStatusHistory extends Model {}

RequestStatusHistory.init(
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
    fromStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'from_status'
    },
    toStatus: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'to_status'
    },
    author: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Система'
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  },
  {
    sequelize,
    modelName: 'RequestStatusHistory',
    tableName: 'request_status_history',
    underscored: true,
    timestamps: false, // append-only журнал: без updated_at
    paranoid: false // записи не удаляются
  }
);

export default RequestStatusHistory;
