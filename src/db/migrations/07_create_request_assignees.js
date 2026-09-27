import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('request_assignees', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    request_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'maintenance_requests',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    technician_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'technicians',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    hours: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0
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
    }
  });

  await queryInterface.addIndex('request_assignees', ['request_id', 'technician_id'], {
    unique: true,
    name: 'unique_request_technician'
  });
  await queryInterface.addIndex('request_assignees', ['technician_id']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('request_assignees');
}
