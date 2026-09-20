import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import app from '../../src/app.js';
import env from '../../src/config/env.js';

describe('Requests REST API & Business Lifecycle', () => {
  const equipmentFile = path.resolve(process.cwd(), env.dataDir, 'equipment.json');
  const requestFile = path.resolve(process.cwd(), env.dataDir, 'requests.json');

  let testEquipmentId;
  let createdRequestId;

  beforeAll(async () => {
    try {
      await fs.writeFile(equipmentFile, JSON.stringify([]), 'utf-8');
      await fs.writeFile(requestFile, JSON.stringify([]), 'utf-8');
    } catch {
      // Игнорируем
    }

    // Создаём тестовое оборудование
    const eqRes = await request(app)
      .post('/api/equipment')
      .send({
        name: 'Инвертор СЭС-01',
        type: 'inverter',
        serialNumber: 'SN-INV-999',
        location: { lat: 45.0355, lon: 38.9753 },
        status: 'operational',
        installedAt: '2023-05-10'
      });
    testEquipmentId = eqRes.body.data.id;
  });

  afterAll(async () => {
    try {
      await fs.unlink(equipmentFile);
      await fs.unlink(requestFile);
    } catch {
      // Игнорируем
    }
  });

  it('POST /api/requests - should create request with status "new" and 201 Created', async () => {
    const res = await request(app)
      .post('/api/requests')
      .send({
        equipmentId: testEquipmentId,
        title: 'Плановая замена предохранителей',
        description: 'Проверка силовых цепей и замена плавких вставок',
        priority: 'medium',
        plannedAt: '2026-10-01T10:00:00.000Z'
      });

    expect(res.status).toBe(201);
    expect(res.headers.location).toMatch(/\/api\/requests\/[a-f0-9-]+/);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.equipmentId).toBe(testEquipmentId);
    expect(res.body.data.status).toBe('new');
    expect(res.body.data.priority).toBe('medium');
    expect(res.body.data.createdAt).toBeDefined();

    createdRequestId = res.body.data.id;
  });

  it('POST /api/requests - should return 404 when equipmentId does not exist', async () => {
    const res = await request(app)
      .post('/api/requests')
      .send({
        equipmentId: '00000000-0000-0000-0000-000000000000',
        title: 'Заявка в пустоту',
        priority: 'low'
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /api/requests - should return 400 on short title or invalid priority', async () => {
    const res = await request(app)
      .post('/api/requests')
      .send({
        equipmentId: testEquipmentId,
        title: 'мало',
        priority: 'super-urgent'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/requests - should return paginated list', async () => {
    const res = await request(app).get('/api/requests?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toMatchObject({
      total: expect.any(Number),
      page: 1,
      limit: 10
    });
  });

  it('GET /api/equipment/:id/requests - should return nested requests for specific equipment', async () => {
    const res = await request(app).get(`/api/equipment/${testEquipmentId}/requests`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].equipmentId).toBe(testEquipmentId);
  });

  it('GET /api/equipment/:id/requests - should return 404 if equipment does not exist', async () => {
    const res = await request(app).get('/api/equipment/unknown-id/requests');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/equipment/:id - should reject equipment deletion if active requests exist (409)', async () => {
    const res = await request(app).delete(`/api/equipment/${testEquipmentId}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toContain('активные');
  });

  it('PATCH /api/requests/:id/status - should transition new -> in_progress', async () => {
    const res = await request(app)
      .patch(`/api/requests/${createdRequestId}/status`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('PATCH /api/requests/:id/status - should reject invalid transition in_progress -> in_progress (same) with 409', async () => {
    const res = await request(app)
      .patch(`/api/requests/${createdRequestId}/status`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('PATCH /api/requests/:id/status - should reject invalid transition in_progress -> new with 409', async () => {
    const res = await request(app)
      .patch(`/api/requests/${createdRequestId}/status`)
      .send({ status: 'new' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('PATCH /api/requests/:id/status - should transition in_progress -> done', async () => {
    const res = await request(app)
      .patch(`/api/requests/${createdRequestId}/status`)
      .send({ status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('done');
  });

  it('PATCH /api/requests/:id/status - should forbid any transitions from done with 409', async () => {
    const res = await request(app)
      .patch(`/api/requests/${createdRequestId}/status`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('POST /api/requests/bulk - should process bulk import with 207 Multi-Status', async () => {
    const res = await request(app)
      .post('/api/requests/bulk')
      .send({
        requests: [
          {
            equipmentId: testEquipmentId,
            title: 'Массовая проверка параметров №1',
            priority: 'low'
          },
          {
            equipmentId: 'non-existent-equipment',
            title: 'Некорректная заявка на несуществующий объект',
            priority: 'high'
          }
        ]
      });

    expect(res.status).toBe(207);
    expect(res.body.data).toMatchObject({
      total: 2,
      successful: 1,
      failed: 1
    });
    expect(res.body.data.results[0].status).toBe('fulfilled');
    expect(res.body.data.results[1].status).toBe('rejected');
  });

  it('DELETE /api/requests/:id - should delete request and return 204', async () => {
    const res = await request(app).delete(`/api/requests/${createdRequestId}`);
    expect(res.status).toBe(204);

    const checkRes = await request(app).get(`/api/requests/${createdRequestId}`);
    expect(checkRes.status).toBe(404);
  });
});
