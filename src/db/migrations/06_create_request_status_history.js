import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('request_status_history', {
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
    from_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    to_status: {
      type: DataTypes.STRING(50),
      allowNull: false
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  await queryInterface.addIndex('request_status_history', ['request_id']);
  await queryInterface.addIndex('request_status_history', ['created_at']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('request_status_history');
}
