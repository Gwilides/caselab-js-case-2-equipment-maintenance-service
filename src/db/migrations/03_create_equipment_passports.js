import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('equipment_passports', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    equipment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'equipment',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    manufacturer: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    power_rating: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    last_inspection_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
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

  await queryInterface.addIndex('equipment_passports', ['equipment_id'], { unique: true });
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('equipment_passports');
}
