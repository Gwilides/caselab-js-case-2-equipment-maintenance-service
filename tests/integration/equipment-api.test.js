import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import app from '../../src/app.js';
import env from '../../src/config/env.js';

describe('Equipment REST API', () => {
  const equipmentFile = path.resolve(process.cwd(), env.dataDir, 'equipment.json');

  beforeAll(async () => {
    // Чистим файл перед тестами
    try {
      await fs.writeFile(equipmentFile, JSON.stringify([]), 'utf-8');
    } catch {
      // Игнорируем
    }
  });

  afterAll(async () => {
    try {
      await fs.unlink(equipmentFile);
    } catch {
      // Игнорируем
    }
  });

  const validEquipment = {
    name: 'Ветрогенератор ВЭУ-01',
    type: 'turbine',
    serialNumber: 'SN-WT-001',
    location: { lat: 55.7558, lon: 37.6173 },
    status: 'operational',
    installedAt: '2024-01-15'
  };

  let createdId;

  it('POST /api/equipment - should create equipment and return 201 with Location header', async () => {
    const res = await request(app).post('/api/equipment').send(validEquipment);

    expect(res.status).toBe(201);
    expect(res.headers.location).toMatch(/\/api\/equipment\/[a-f0-9-]+/);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe(validEquipment.name);
    expect(res.body.data.serialNumber).toBe(validEquipment.serialNumber);
    expect(res.body.data.createdAt).toBeDefined();
    expect(res.body.data.updatedAt).toBeDefined();

    createdId = res.body.data.id;
  });

  it('POST /api/equipment - should return 409 Conflict on duplicate serialNumber', async () => {
    const res = await request(app)
      .post('/api/equipment')
      .send({
        ...validEquipment,
        name: 'Другой генератор'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('POST /api/equipment - should return 400 when installedAt is in the future', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);

    const res = await request(app)
      .post('/api/equipment')
      .send({
        ...validEquipment,
        serialNumber: 'SN-FUTURE',
        installedAt: futureDate.toISOString()
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field.includes('installedAt'))).toBe(true);
  });

  it('POST /api/equipment - should return 400 on invalid coordinates', async () => {
    const res = await request(app)
      .post('/api/equipment')
      .send({
        ...validEquipment,
        serialNumber: 'SN-INVALID-COORD',
        location: { lat: 105, lon: 37.6173 }
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/equipment - should return paginated list with metadata', async () => {
    const res = await request(app).get('/api/equipment?page=1&limit=10').send();

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toMatchObject({
      total: expect.any(Number),
      page: 1,
      limit: 10,
      totalPages: expect.any(Number)
    });
  });

  it('GET /api/equipment - should filter equipment by installedFrom and installedTo', async () => {
    // installedAt для createdId равен '2024-01-15'
    const matchRes = await request(app)
      .get('/api/equipment?installedFrom=2024-01-01&installedTo=2024-12-31')
      .send();

    expect(matchRes.status).toBe(200);
    expect(matchRes.body.data.some((e) => e.id === createdId)).toBe(true);

    const noMatchRes = await request(app)
      .get('/api/equipment?installedFrom=2025-01-01&installedTo=2025-12-31')
      .send();

    expect(noMatchRes.status).toBe(200);
    expect(noMatchRes.body.data.some((e) => e.id === createdId)).toBe(false);
  });

  it('GET /api/equipment/:id - should return single equipment by id', async () => {
    const res = await request(app).get(`/api/equipment/${createdId}`).send();

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(createdId);
  });

  it('GET /api/equipment/:id - should return 404 for non-existent equipment', async () => {
    const res = await request(app).get('/api/equipment/non-existent-id').send();

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /api/equipment/:id - should partially update equipment', async () => {
    const res = await request(app).patch(`/api/equipment/${createdId}`).send({
      name: 'Обновлённый Ветрогенератор',
      status: 'maintenance'
    });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Обновлённый Ветрогенератор');
    expect(res.body.data.status).toBe('maintenance');
    expect(res.body.data.serialNumber).toBe(validEquipment.serialNumber);
  });

  it('PATCH /api/equipment/:id - should ignore or strip attempts to modify id or createdAt', async () => {
    const res = await request(app).patch(`/api/equipment/${createdId}`).send({
      id: 'hacked-id',
      createdAt: '1970-01-01T00:00:00.000Z',
      name: 'Безопасное обновление'
    });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdId);
    expect(res.body.data.createdAt).not.toBe('1970-01-01T00:00:00.000Z');
  });

  it('DELETE /api/equipment/:id - should delete equipment and return 204', async () => {
    const res = await request(app).delete(`/api/equipment/${createdId}`).send();

    expect(res.status).toBe(204);

    const checkRes = await request(app).get(`/api/equipment/${createdId}`).send();
    expect(checkRes.status).toBe(404);
  });

  it('DELETE /api/equipment/:id - should return 404 when deleting non-existent equipment', async () => {
    const res = await request(app).delete('/api/equipment/already-deleted-or-not-found').send();

    expect(res.status).toBe(404);
  });
});
