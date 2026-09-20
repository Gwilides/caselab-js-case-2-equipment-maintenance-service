import request from 'supertest';
import app from '../../src/app.js';

describe('Web Client Static Delivery', () => {
  it('GET / - should serve the HTML single-page application', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Сервис обслуживания оборудования');
    expect(res.text).toContain('createRequestForm');
  });

  it('GET /styles.css - should serve CSS stylesheet', async () => {
    const res = await request(app).get('/styles.css');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/css');
  });

  it('GET /app.js - should serve client script', async () => {
    const res = await request(app).get('/app.js');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('javascript');
  });
});
