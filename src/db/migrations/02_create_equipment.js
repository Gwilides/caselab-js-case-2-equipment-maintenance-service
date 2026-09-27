import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('equipment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    site_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'sites',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    serial_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
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
    installed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  await queryInterface.addIndex('equipment', ['site_id']);
  await queryInterface.addIndex('equipment', ['serial_number']);
  await queryInterface.addIndex('equipment', ['status']);
  await queryInterface.addIndex('equipment', ['type']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('equipment');
}
