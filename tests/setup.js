import { sequelize } from '../src/db/models/index.js';

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.query(`
    TRUNCATE TABLE 
      request_parts,
      spare_parts,
      request_assignees,
      technicians,
      request_status_history,
      maintenance_requests,
      equipment_passports,
      equipment,
      sites 
    CASCADE;
  `);

  await sequelize.query(`
    INSERT INTO technicians (id, full_name, specialization, employee_id, created_at, updated_at) VALUES
    ('aaaa1111-1111-4aaa-8aaa-111111111111', 'Иванов Алексей Петрович', 'Ведущий инженер-электротехник', 'TECH-101', NOW(), NOW()),
    ('aaaa2222-2222-4aaa-8aaa-222222222222', 'Смирнова Елена Васильевна', 'Инженер АСУ ТП и телемеханики', 'TECH-102', NOW(), NOW()),
    ('aaaa3333-3333-4aaa-8aaa-333333333333', 'Кузнецов Дмитрий Иванович', 'Слесарь-механик 6 разряда', 'TECH-103', NOW(), NOW());
  `);
});

afterAll(async () => {
  await sequelize.close();
});
