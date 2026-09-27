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
});

afterAll(async () => {
  await sequelize.close();
});
