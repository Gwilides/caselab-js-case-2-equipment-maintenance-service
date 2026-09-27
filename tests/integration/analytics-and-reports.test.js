import request from 'supertest';
import app from '../../src/app.js';
import { Site, Equipment, MaintenanceRequest, RequestAssignee } from '../../src/db/models/index.js';

describe('Analytics & Raw SQL Reports API', () => {
  let siteAId;
  let siteBId;
  let eqA1Id;
  let eqA2Id;
  let eqB1Id;

  const techLeadId = 'aaaa1111-1111-4aaa-8aaa-111111111111';
  const techMemberId = 'aaaa2222-2222-4aaa-8aaa-222222222222';

  beforeAll(async () => {
    // 1. Создаем две площадки
    const siteA = await Site.create({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Ветропарк Северный',
      code: 'WIND-NORTH',
      region: 'Северо-Западный федеральный округ',
      lat: 68.97,
      lon: 33.08
    });
    siteAId = siteA.id;

    const siteB = await Site.create({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Солнечная станция Южная',
      code: 'SOLAR-SOUTH',
      region: 'Южный федеральный округ',
      lat: 44.51,
      lon: 38.71
    });
    siteBId = siteB.id;

    // 2. Создаем оборудование
    const eqA1 = await Equipment.create({
      id: '33333333-3333-4333-8333-111111111111',
      siteId: siteAId,
      name: 'Ветротурбина ВЭУ-1',
      type: 'turbine',
      serialNumber: 'SN-ANALYTICS-01',
      location: { lat: 68.97, lon: 33.08 },
      status: 'operational',
      installedAt: '2023-01-15'
    });
    eqA1Id = eqA1.id;

    const eqA2 = await Equipment.create({
      id: '33333333-3333-4333-8333-222222222222',
      siteId: siteAId,
      name: 'Ветротурбина ВЭУ-2',
      type: 'turbine',
      serialNumber: 'SN-ANALYTICS-02',
      location: { lat: 68.98, lon: 33.09 },
      status: 'maintenance',
      installedAt: '2023-02-20'
    });
    eqA2Id = eqA2.id;

    const eqB1 = await Equipment.create({
      id: '33333333-3333-4333-8333-333333333333',
      siteId: siteBId,
      name: 'Инверторная подстанция ИП-1',
      type: 'inverter',
      serialNumber: 'SN-ANALYTICS-03',
      location: { lat: 44.51, lon: 38.71 },
      status: 'operational',
      installedAt: '2024-03-10'
    });
    eqB1Id = eqB1.id;

    // 3. Создаем заявки для eqA1: 2 заявки (1 done, 1 in_progress)
    const req1 = await MaintenanceRequest.create({
      id: '44444444-4444-4444-8444-111111111111',
      equipmentId: eqA1Id,
      title: 'ТО редуктора ветрогенератора',
      priority: 'high',
      status: 'done',
      createdAt: new Date('2026-09-01T08:00:00Z'),
      closedAt: new Date('2026-09-01T14:00:00Z') // 6 часов
    });
    await RequestAssignee.create({
      requestId: req1.id,
      technicianId: techLeadId,
      role: 'lead',
      hours: 10
    });

    const req2 = await MaintenanceRequest.create({
      id: '44444444-4444-4444-8444-222222222222',
      equipmentId: eqA1Id,
      title: 'Осмотр лопастей ветрогенератора',
      priority: 'medium',
      status: 'in_progress',
      createdAt: new Date('2026-09-10T10:00:00Z')
    });
    await RequestAssignee.create({
      requestId: req2.id,
      technicianId: techLeadId,
      role: 'lead',
      hours: 6
    });
    await RequestAssignee.create({
      requestId: req2.id,
      technicianId: techMemberId,
      role: 'member',
      hours: 4
    });

    // 4. Создаем заявку для eqA2: 1 заявка (new)
    await MaintenanceRequest.create({
      id: '44444444-4444-4444-8444-333333333333',
      equipmentId: eqA2Id,
      title: 'Диагностика анемометра',
      priority: 'low',
      status: 'new',
      createdAt: new Date('2026-09-15T12:00:00Z')
    });

    // 5. Создаем заявку для eqB1: 1 заявка (done, 2 часа)
    const req4 = await MaintenanceRequest.create({
      id: '44444444-4444-4444-8444-444444444444',
      equipmentId: eqB1Id,
      title: 'Продувка воздушных фильтров инвертора',
      priority: 'critical',
      status: 'done',
      createdAt: new Date('2026-09-20T09:00:00Z'),
      closedAt: new Date('2026-09-20T11:00:00Z') // 2 часа
    });
    await RequestAssignee.create({
      requestId: req4.id,
      technicianId: techLeadId,
      role: 'lead',
      hours: 3
    });
  });

  describe('GET /api/sites/:id/summary - Site operational analytics', () => {
    it('should return aggregated site metrics and average completion time for Site A', async () => {
      const res = await request(app).get(`/api/sites/${siteAId}/summary`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.site).toBeDefined();
      expect(res.body.data.site.name).toBe('Ветропарк Северный');
      expect(res.body.data.equipmentCount).toBe(2);
      expect(res.body.data.totalRequests).toBe(3);

      expect(res.body.data.requestsByStatus).toEqual({
        new: 1,
        in_progress: 1,
        done: 1,
        rejected: 0
      });

      expect(res.body.data.requestsByPriority).toEqual({
        low: 1,
        medium: 1,
        high: 1,
        critical: 0
      });

      // Единственная закрытая заявка длилась 6 часов (21600 сек)
      expect(res.body.data.averageCompletionTimeHours).toBe(6);
      expect(res.body.data.averageCompletionTimeSeconds).toBe(21600);
    });

    it('should return 404 for non-existent site summary', async () => {
      const res = await request(app).get(
        '/api/sites/00000000-0000-0000-0000-000000000000/summary'
      );
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID site id', async () => {
      const res = await request(app).get('/api/sites/invalid-uuid-format/summary');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/reports/equipment-load - Raw SQL aggregated report', () => {
    it('should return equipment load metrics joined across 4 tables with correct totals', async () => {
      const res = await request(app).get('/api/reports/equipment-load');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      const eqA1Report = res.body.data.find((e) => e.equipmentId === eqA1Id);
      expect(eqA1Report).toBeDefined();
      expect(eqA1Report.equipmentName).toBe('Ветротурбина ВЭУ-1');
      expect(eqA1Report.siteName).toBe('Ветропарк Северный');
      expect(eqA1Report.totalRequests).toBe(2);
      expect(eqA1Report.closedRequests).toBe(1);
      expect(eqA1Report.totalHours).toBe(20); // 10h (req1) + 6h + 4h (req2) = 20h
      expect(eqA1Report.lastMaintenanceDate).toBeDefined();
    });

    it('should filter groups using HAVING clause (minRequests)', async () => {
      const res = await request(app).get('/api/reports/equipment-load?minRequests=2');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].equipmentId).toBe(eqA1Id);
      expect(res.body.data[0].totalRequests).toBeGreaterThanOrEqual(2);
    });

    it('should filter by siteId', async () => {
      const res = await request(app).get(`/api/reports/equipment-load?siteId=${siteBId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].equipmentId).toBe(eqB1Id);
      expect(res.body.data[0].siteName).toBe('Солнечная станция Южная');
    });

    it('should support pagination and bounded limits', async () => {
      const res = await request(app).get('/api/reports/equipment-load?limit=2&offset=0');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toMatchObject({
        limit: 2,
        page: 1,
        total: expect.any(Number)
      });
    });

    it('should reject invalid sortBy with 400 (SQL injection protection via whitelist)', async () => {
      const res = await request(app).get(
        "/api/reports/equipment-load?sortBy=e.name;DROP%20TABLE%20equipment;--"
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject excessive or negative limit values with 400', async () => {
      const res = await request(app).get('/api/reports/equipment-load?limit=999');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
