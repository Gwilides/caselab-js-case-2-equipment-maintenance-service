import request from 'supertest';
import app from '../../src/app.js';

describe('Team Assignment, Status History & Transaction Integrity', () => {
  let equipmentId;
  let testRequestId;

  const techLeadId = 'aaaa1111-1111-4aaa-8aaa-111111111111'; // Иванов
  const techMemberId = 'aaaa2222-2222-4aaa-8aaa-222222222222'; // Смирнова
  const nonExistentTechId = '99999999-9999-4999-8999-999999999999';

  beforeAll(async () => {
    // 1. Создаём оборудование
    const eqRes = await request(app)
      .post('/api/equipment')
      .send({
        name: 'Трансформаторная подстанция КТП-250',
        type: 'substation',
        serialNumber: 'SN-SUB-ASSIGN-01',
        location: { lat: 55.7512, lon: 37.6184 },
        status: 'operational',
        installedAt: '2023-01-10'
      });
    equipmentId = eqRes.body.data.id;

    // 2. Создаём тестовую заявку (изначально без бригады)
    const reqRes = await request(app)
      .post('/api/requests')
      .send({
        equipmentId,
        title: 'Комплексная ревизия трансформатора',
        description: 'Проверка изоляции и отбор проб масла',
        priority: 'high',
        plannedAt: '2026-10-15T09:00:00.000Z'
      });
    testRequestId = reqRes.body.data.id;
  });

  describe('Business Rule: in_progress requires assigned team', () => {
    it('PATCH /api/requests/:id/status - should reject transition to in_progress without assigned team with 409 Conflict', async () => {
      const res = await request(app)
        .patch(`/api/requests/${testRequestId}/status`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('бригады');
    });
  });

  describe('POST /api/requests/:id/assignees - Team assignment & validation', () => {
    it('should reject team assignment without lead (0 leads) with 422 Unprocessable Content', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/assignees`)
        .send([
          { userId: techMemberId, role: 'member', hours: 4 }
        ]);

      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('UNPROCESSABLE_ENTITY');
      expect(res.body.error.message).toContain('lead');
    });

    it('should reject team assignment with multiple leads (>1 lead) with 422 Unprocessable Content', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/assignees`)
        .send([
          { userId: techLeadId, role: 'lead', hours: 4 },
          { userId: techMemberId, role: 'lead', hours: 6 }
        ]);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('UNPROCESSABLE_ENTITY');
    });

    it('should return 404 when assigning non-existent technician', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/assignees`)
        .send([
          { userId: nonExistentTechId, role: 'lead', hours: 5 }
        ]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject duplicate technician in assignment payload with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/assignees`)
        .send([
          { userId: techLeadId, role: 'lead', hours: 4 },
          { userId: techLeadId, role: 'member', hours: 2 }
        ]);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should successfully assign valid team (1 lead, 1 member) and return 200 OK', async () => {
      const res = await request(app)
        .post(`/api/requests/${testRequestId}/assignees`)
        .send([
          { userId: techLeadId, role: 'lead', hours: 8 },
          { userId: techMemberId, role: 'member', hours: 6 }
        ]);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);

      const lead = res.body.data.find((a) => a.role === 'lead');
      expect(lead).toBeDefined();
      expect(lead.technicianId).toBe(techLeadId);
      expect(lead.technician).toBeDefined();
      expect(lead.technician.fullName).toBe('Иванов Алексей Петрович');
    });

    it('should verify transaction rollback: failed update preserves previous assignments', async () => {
      // Пытаемся назначить невалидную бригаду (несуществующий специалист)
      const failRes = await request(app)
        .post(`/api/requests/${testRequestId}/assignees`)
        .send([
          { userId: nonExistentTechId, role: 'lead', hours: 5 }
        ]);
      expect(failRes.status).toBe(404);

      // Проверяем, что прежняя бригада осталась неизменной (rollback сработал)
      const checkRes = await request(app).get(`/api/requests/${testRequestId}`);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.assignees.length).toBe(2);
      expect(checkRes.body.data.assignees.some((a) => a.technicianId === techLeadId)).toBe(true);
    });
  });

  describe('Lifecycle transition with team assigned', () => {
    it('PATCH /api/requests/:id/status - should now succeed to transition new -> in_progress', async () => {
      const res = await request(app)
        .patch(`/api/requests/${testRequestId}/status`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });
  });

  describe('DELETE /api/requests/:id/assignees/:userId - Remove technician', () => {
    it('should remove member from request and return 204 No Content', async () => {
      const res = await request(app).delete(
        `/api/requests/${testRequestId}/assignees/${techMemberId}`
      );
      expect(res.status).toBe(204);

      const checkRes = await request(app).get(`/api/requests/${testRequestId}`);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.assignees.length).toBe(1);
      expect(checkRes.body.data.assignees[0].technicianId).toBe(techLeadId);
    });

    it('should return 404 when removing technician that is not assigned', async () => {
      const res = await request(app).delete(
        `/api/requests/${testRequestId}/assignees/${nonExistentTechId}`
      );
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/requests/:id/history - Status change audit log', () => {
    it('should return chronological status change audit trail', async () => {
      const res = await request(app).get(`/api/requests/${testRequestId}/history`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Первая запись: создание
      expect(res.body.data[0].fromStatus).toBeNull();
      expect(res.body.data[0].toStatus).toBe('new');

      // Вторая запись: перевод в in_progress
      expect(res.body.data[1].fromStatus).toBe('new');
      expect(res.body.data[1].toStatus).toBe('in_progress');
      expect(res.body.data[1].createdAt).toBeDefined();
    });

    it('should return 404 for non-existent request history', async () => {
      const res = await request(app).get(
        '/api/requests/00000000-0000-0000-0000-000000000000/history'
      );
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
