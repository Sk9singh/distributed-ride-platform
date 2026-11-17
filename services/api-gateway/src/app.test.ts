import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createLogger } from '@ride/common';
import { createApp } from './app';

// A fake user-service that just echoes back the headers the gateway forwarded.
// This tests the gateway in isolation: no database, no real user-service.
let upstream: http.Server;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  upstream = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ path: req.url, headers: req.headers }));
  });
  await new Promise<void>((resolve) => upstream.listen(0, resolve));
  const { port } = upstream.address() as AddressInfo;

  const logger = createLogger('gateway-test');
  logger.level = 'silent';
  app = createApp({ logger, jwtSecret: 'secret', userServiceUrl: `http://127.0.0.1:${port}` });
});

afterAll(() => new Promise((resolve) => upstream.close(resolve)));

const tokenFor = (sub: string, role: string, secret = 'secret') =>
  jwt.sign({ role }, secret, { subject: sub, expiresIn: '1h' });

describe('gateway', () => {
  it('lets public routes through without a token', async () => {
    const res = await request(app).post('/users/login').send({}).expect(200);
    expect(res.body.path).toBe('/users/login');
  });

  it('401 on a protected route without a token', async () => {
    await request(app).get('/users/me').expect(401);
  });

  it('401 on a token signed with the wrong secret', async () => {
    await request(app)
      .get('/users/me')
      .set('authorization', `Bearer ${tokenFor('u-1', 'RIDER', 'attacker')}`)
      .expect(401);
  });

  it('forwards identity headers from a valid token', async () => {
    const res = await request(app)
      .get('/users/me')
      .set('authorization', `Bearer ${tokenFor('u-1', 'DRIVER')}`)
      .expect(200);
    expect(res.body.headers['x-user-id']).toBe('u-1');
    expect(res.body.headers['x-user-role']).toBe('DRIVER');
  });

  it('strips spoofed identity headers on public routes', async () => {
    const res = await request(app)
      .post('/users/login')
      .set('x-user-id', 'someone-else')
      .set('x-user-role', 'ADMIN')
      .send({})
      .expect(200);
    expect(res.body.headers['x-user-id']).toBeUndefined();
    expect(res.body.headers['x-user-role']).toBeUndefined();
  });

  it('overrides spoofed identity headers with the token identity', async () => {
    const res = await request(app)
      .get('/users/me')
      .set('authorization', `Bearer ${tokenFor('u-1', 'RIDER')}`)
      .set('x-user-role', 'ADMIN')
      .expect(200);
    expect(res.body.headers['x-user-role']).toBe('RIDER');
  });

  it('generates a request id and forwards it upstream', async () => {
    const res = await request(app).post('/users/login').send({}).expect(200);
    const id = res.headers['x-request-id'];
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.headers['x-request-id']).toBe(id);
  });

  it('forwards the request body (no body parser eating the stream)', async () => {
    // The echo server doesn't return the body, so check the length header made it through.
    const res = await request(app).post('/users/login').send({ email: 'a@x.com' }).expect(200);
    expect(res.body.headers['content-length']).toBe(
      String(JSON.stringify({ email: 'a@x.com' }).length),
    );
  });

  it('JSON 404 for unknown routes', async () => {
    const res = await request(app)
      .get('/nope')
      .set('authorization', `Bearer ${tokenFor('u-1', 'RIDER')}`)
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
