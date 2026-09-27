import request from 'supertest';
import app from '../../src/app.js';
import { MaintenanceRequest } from '../../src/db/models/index.js';

describe('Spare Parts Inventory & Paranoid Soft Deletes', () => {
  let equipmentId;
  let testRequestId;
  let partId;

  beforeAll(async () => {
    // 1. Создаём тестовое оборудование
    const eqRes = await request(app)
      .post('/api/equipment')
      .send({
        name: 'Газовая турбина Siemens SGT-400',
        type: 'turbine',
        serialNumber: 'SN-TURB-PARTS-01',
        location: { lat: 55.7558, lon: 37.6173 },
        status: 'operational',
        installedAt: '2023-05-10'
      });
    expect(eqRes.status).toBe(201);
    equipmentId = eqRes.body.data.id;


    // 2. Создаём тестовую заявку
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        equipmentId,
        title: 'Замена воздушного и масляного фильтров',
        description: 'Плановое техническое обслуживание компрессора',
        priority: 'medium',
        plannedAt: '2026-10-20T08:00:00.000Z'
      });
    testRequestId = reqRes.body.data.id;
  });

  describe('Spare Parts Catalog Management (/api/parts)', () => {
    it('POST /api/parts - should create a new spare part in inventory', async () => {
      const res = await request(app)
        .post('/api/parts')
        .send({
          name: 'Воздушный фильтр AF-200',
          code: 'PART-AF-200',
          stockQuantity: 10,
          unit: 'шт'
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Воздушный фильтр AF-200');
      expect(res.body.data.code).toBe('PART-AF-200');
      expect(res.body.data.stockQuantity).toBe(10);
      partId = res.body.data.id;
    });

    it('POST /api/parts - should reject duplicate part code with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/parts')
        .send({
          name: 'Дубликат фильтра',
          code: 'PART-AF-200',
          stockQuantity: 5
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('GET /api/parts - should list spare parts with pagination and search filter', async () => {
      const res = await request(app)
        .get('/api/parts')
        .query({ search: 'AF-200' });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].code).toBe('PART-AF-200');
      expect(res.body.pagination).toBeDefined();
    });

    it('GET /api/parts/:id - should get spare part details by ID', async () => {
      const res = await request(app).get(`/api/parts/${partId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(partId);
      expect(res.body.data.name).toBe('Воздушный фильтр AF-200');
    });

    it('GET /api/parts/:id - should return 404 for non-existent part', async () => {
      const res = await request(app).get('/api/parts/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Transactional Part Consumption (/api/requests/:id/parts)', () => {
    it('POST /api/requests/:id/parts - should deduct part quantity and link to request', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/parts`)
        .send({
          partId,
          quantity: 3
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.quantity).toBe(3);
      expect(res.body.data.requestId).toBe(testRequestId);

      // Проверяем уменьшение остатка на складе (10 - 3 = 7)
      const partCheck = await request(app).get(`/api/parts/${partId}`);
      expect(partCheck.body.data.stockQuantity).toBe(7);
    });

    it('POST /api/requests/:id/parts - should reject when requested quantity exceeds stock with 409 Conflict', async () => {
      // Пытаемся списать 15 штук при остатке 7
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/parts`)
        .send({
          partId,
          quantity: 15
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('Недостаточно запчастей');

      // Проверяем, что остаток не изменился (транзакция откатилась)
      const partCheck = await request(app).get(`/api/parts/${partId}`);
      expect(partCheck.body.data.stockQuantity).toBe(7);
    });

    it('POST /api/requests/:id/parts - should return 404 for non-existent part', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/parts`)
        .send({
          partId: '00000000-0000-0000-0000-000000000000',
          quantity: 1
        });

      expect(res.status).toBe(404);
    });

    it('GET /api/requests/:id/parts - should list consumed parts for request', async () => {
      const res = await request(app).get(`/api/requests/${testRequestId}/parts`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].sparePartId).toBe(partId);
      expect(res.body.data[0].quantity).toBe(3);
    });
  });

  describe('Paranoid Soft Deletes Integrity', () => {
    it('DELETE /api/requests/:id - should soft-delete request setting deletedAt without erasing row', async () => {
      // 1. Удаляем заявку через API
      const delRes = await request(app).delete(`/api/requests/${testRequestId}`);
      expect(delRes.status).toBe(204);

      // 2. Обычный запрос должен возвращать 404
      const getRes = await request(app).get(`/api/requests/${testRequestId}`);
      expect(getRes.status).toBe(404);

      // 3. Проверяем напрямую в БД через Sequelize с paranoid: false
      const rawInDb = await MaintenanceRequest.findByPk(testRequestId, { paranoid: false });
      expect(rawInDb).not.toBeNull();
      expect(rawInDb.deletedAt).not.toBeNull();
    });
  });
});
