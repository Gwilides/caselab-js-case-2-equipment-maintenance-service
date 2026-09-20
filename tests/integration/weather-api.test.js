import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import app from '../../src/app.js';
import env from '../../src/config/env.js';
import { weatherService } from '../../src/services/index.js';

describe('Weather API Integration (/api/equipment/:id/weather)', () => {
  const equipmentFile = path.resolve(process.cwd(), env.dataDir, 'equipment.json');
  let equipmentId;

  beforeAll(async () => {
    try {
      await fs.writeFile(equipmentFile, JSON.stringify([]), 'utf-8');
    } catch {
      // Игнорируем
    }

    const eqRes = await request(app)
      .post('/api/equipment')
      .send({
        name: 'Трансформаторная подстанция ТП-10',
        type: 'substation',
        serialNumber: 'SN-SUB-777',
        location: { lat: 55.751244, lon: 37.618423 },
        installedAt: '2023-01-01'
      });

    equipmentId = eqRes.body.data.id;
  });

  afterAll(async () => {
    try {
      await fs.unlink(equipmentFile);
    } catch {
      // Игнорируем
    }
  });

  it('GET /api/equipment/:id/weather - should return 404 if equipment does not exist', async () => {
    const res = await request(app).get('/api/equipment/unknown-id/weather');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/equipment/:id/weather - should return 200 with weather forecast and outdoor assessment', async () => {
    // Подменяем meteoClient на предсказуемый мок
    const originalClient = weatherService.meteoClient;
    weatherService.meteoClient = {
      getForecast: jest.fn().mockResolvedValue([
        {
          date: '2026-09-21',
          minTemp: 14,
          maxTemp: 24,
          precipitation: 0.0,
          maxWindSpeed: 6.2
        }
      ])
    };

    try {
      const res = await request(app).get(`/api/equipment/${equipmentId}/weather`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.equipmentId).toBe(equipmentId);
      expect(res.body.data.assessment).toBeDefined();
      expect(typeof res.body.data.assessment.suitable).toBe('boolean');
      expect(res.body.data.forecast).toBeInstanceOf(Array);
      expect(res.body.data.forecast.length).toBeGreaterThan(0);
    } finally {
      weatherService.meteoClient = originalClient;
    }
  });

  it('GET /api/equipment/:id/weather - should return 502 Bad Gateway if external API is unreachable', async () => {
    const originalClient = weatherService.meteoClient;
    weatherService.meteoClient = {
      getForecast: jest.fn().mockRejectedValue(new Error('Connection timed out'))
    };

    try {
      const res = await request(app).get(`/api/equipment/${equipmentId}/weather`);

      expect(res.status).toBe(502);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('BAD_GATEWAY');
      expect(res.body.error.message).toContain('погодный сервис');
    } finally {
      weatherService.meteoClient = originalClient;
    }
  });
});
