import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('maintenance_requests', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    equipment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'equipment',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
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
    planned_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    author: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Система'
    },
    closed_at: {
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

  await queryInterface.addIndex('maintenance_requests', ['equipment_id']);
  await queryInterface.addIndex('maintenance_requests', ['status']);
  await queryInterface.addIndex('maintenance_requests', ['priority']);
  await queryInterface.addIndex('maintenance_requests', ['created_at']);
  await queryInterface.addIndex('maintenance_requests', ['planned_at']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('maintenance_requests');
}
