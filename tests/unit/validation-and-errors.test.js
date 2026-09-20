import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import requestId from '../../src/middlewares/requestId.js';
import validate from '../../src/middlewares/validate.js';
import notFoundHandler from '../../src/middlewares/notFound.js';
import errorHandler from '../../src/middlewares/errorHandler.js';
import { NotFoundError, ConflictError } from '../../src/errors/index.js';

describe('Validation and Error Handling', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(requestId);
    app.use(express.json({ limit: '100kb' }));

    const testSchema = z.object({
      name: z.string().min(3),
      age: z.number().int().positive()
    });

    app.post('/test-validate', validate({ body: testSchema }), (req, res) => {
      res.json({ success: true, data: req.valid.body });
    });

    app.get('/test-conflict', () => {
      throw new ConflictError('Конфликт данных');
    });

    app.get('/test-not-found', () => {
      throw new NotFoundError('Тестовый объект');
    });

    app.get('/test-unexpected', () => {
      throw new Error('Непредвиденный сбой');
    });

    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  it('should assign a valid requestId header and property', async () => {
    const res = await request(app).post('/test-validate').send({ name: 'Valid Name', age: 25 });
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.data).toEqual({ name: 'Valid Name', age: 25 });
  });

  it('should return 400 with detailed issues on validation failure', async () => {
    const res = await request(app).post('/test-validate').send({ name: 'ab', age: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.requestId).toBeDefined();
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  it('should strip unknown fields from body in req.valid', async () => {
    const res = await request(app).post('/test-validate').send({
      name: 'Valid Name',
      age: 30,
      unknownField: 'malicious',
      id: 'forbidden-id'
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ name: 'Valid Name', age: 30 });
  });

  it('should format 409 Conflict error with standard envelope', async () => {
    const res = await request(app).get('/test-conflict');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'CONFLICT',
      message: 'Конфликт данных'
    });
    expect(res.body.error.requestId).toBeDefined();
  });

  it('should format 404 NotFound error with standard envelope', async () => {
    const res = await request(app).get('/test-not-found');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Тестовый объект не найден'
    });
    expect(res.body.error.requestId).toBeDefined();
  });

  it('should handle unrouted paths with 404', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should handle JSON syntax error with 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .post('/test-validate')
      .set('Content-Type', 'application/json')
      .send('{"invalid-json: true');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('FileEquipmentRepository should gracefully handle empty or whitespace files without throwing', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const os = await import('node:os');
    const { FileEquipmentRepository } =
      await import('../../src/repositories/file/FileEquipmentRepository.js');

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'caselab-empty-test-'));
    const emptyFile = path.join(tmpDir, 'empty.json');
    await fs.writeFile(emptyFile, '   \n  ', 'utf-8');

    const repo = new FileEquipmentRepository(emptyFile);
    const result = await repo.findAll();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
