import request from 'supertest';
import app from '../../src/app.js';
import env from '../../src/config/env.js';

describe('Security Policies, Headers, and Rate Limiting', () => {
  it('should include Helmet security headers in responses', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('should allow whitelisted CORS origin', async () => {
    const allowedOrigin = env.corsOrigins[0] || 'http://localhost:3000';
    const res = await request(app)
      .get('/api/health')
      .set('Origin', allowedOrigin);

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should not allow non-whitelisted CORS origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://malicious-site.com');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should set HttpOnly, SameSite=Strict cookie on /api/auth/login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ apiKey: 'caselab-secret-key' });

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const authCookie = cookies.find((c) => c.startsWith('auth_token='));
    expect(authCookie).toBeDefined();
    expect(authCookie).toContain('HttpOnly');
    expect(authCookie.toLowerCase()).toContain('samesite=strict');
  });

  it('should reject payload exceeding 100kb with 413 PAYLOAD_TOO_LARGE', async () => {
    // Генерируем строку более 100kb
    const largeString = 'a'.repeat(105 * 1024);
    const res = await request(app)
      .post('/api/equipment')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ data: largeString }));

    expect(res.status).toBe(413);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(res.body.error.requestId).toBeDefined();
  });
});
