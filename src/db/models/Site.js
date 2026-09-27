import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Site extends Model {}

Site.init(
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
    region: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    lat: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    lon: {
      type: DataTypes.DOUBLE,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'Site',
    tableName: 'sites',
    underscored: true,
    timestamps: true,
    paranoid: true
  }
);

export default Site;
