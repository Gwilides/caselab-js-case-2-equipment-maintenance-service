export async function up({ context: queryInterface }) {
  // Попытка создания расширения pg_trgm для ускорения ILIKE через GIN-индексы
  try {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_equipment_name_trgm ON equipment USING gin (name gin_trgm_ops);'
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_requests_title_trgm ON maintenance_requests USING gin (title gin_trgm_ops);'
    );
  } catch {
    // Если расширение недоступно в окружении, создаем функциональные btree индексы
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_equipment_name_lower ON equipment (lower(name));'
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_requests_title_lower ON maintenance_requests (lower(title));'
    );
  }

  // Составные индексы для аналитики и частых фильтров
  await queryInterface.addIndex('maintenance_requests', ['equipment_id', 'status'], {
    name: 'idx_requests_equipment_status'
  });
  await queryInterface.addIndex('equipment', ['site_id', 'status'], {
    name: 'idx_equipment_site_status'
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('equipment', 'idx_equipment_site_status').catch(() => {});
  await queryInterface
    .removeIndex('maintenance_requests', 'idx_requests_equipment_status')
    .catch(() => {});

  try {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_equipment_name_trgm;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_requests_title_trgm;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_equipment_name_lower;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_requests_title_lower;');
  } catch {
    // Игнорируем ошибки удаления при откате
  }
}
