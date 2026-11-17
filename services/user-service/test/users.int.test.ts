import request from 'supertest';
import { asUser, buildTestApp } from './helpers';

const { app, pool } = buildTestApp();

const rider = { email: 'Asha@Example.com', password: 'password123', name: 'Asha', role: 'RIDER' };

beforeEach(() => pool.query('TRUNCATE users CASCADE'));
afterAll(() => pool.end());

describe('POST /users/register', () => {
  it('creates a user, normalizes email, never returns the hash', async () => {
    const res = await request(app).post('/users/register').send(rider).expect(201);
    expect(res.body.user).toMatchObject({ email: 'asha@example.com', role: 'RIDER' });
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 409 for a duplicate email, even with different casing', async () => {
    await request(app).post('/users/register').send(rider).expect(201);
    await request(app)
      .post('/users/register')
      .send({ ...rider, email: 'ASHA@example.com' })
      .expect(409);
  });

  it('concurrent duplicate registrations: exactly one wins (UNIQUE constraint, not app code)', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post('/users/register').send(rider)),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
  });

  it('rejects self-registration as ADMIN', async () => {
    await request(app)
      .post('/users/register')
      .send({ ...rider, role: 'ADMIN' })
      .expect(400);
  });

  it('rejects invalid input with 400', async () => {
    await request(app)
      .post('/users/register')
      .send({ email: 'nope', password: 'x', name: '', role: 'RIDER' })
      .expect(400);
  });
});

describe('POST /users/login', () => {
  beforeEach(() => request(app).post('/users/register').send(rider).expect(201));

  it('returns a token for correct credentials', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'asha@example.com', password: 'password123' })
      .expect(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('wrong password and unknown email get the SAME 401', async () => {
    const wrongPw = await request(app)
      .post('/users/login')
      .send({ email: 'asha@example.com', password: 'nope-nope' });
    const unknown = await request(app)
      .post('/users/login')
      .send({ email: 'ghost@example.com', password: 'nope-nope' });
    expect(wrongPw.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPw.body).toEqual(unknown.body);
  });
});

describe('GET /users/me', () => {
  it('401 without gateway identity headers', async () => {
    await request(app).get('/users/me').expect(401);
  });

  it('returns the current user with driverProfile: null for a rider', async () => {
    const { body } = await request(app).post('/users/register').send(rider).expect(201);
    const res = await request(app).get('/users/me').set(asUser(body.user.id, 'RIDER')).expect(200);
    expect(res.body.user).toMatchObject({ id: body.user.id, driverProfile: null });
  });
});

describe('database constraints (the last line of defense)', () => {
  it('CHECK rejects a non-lowercase email even if app code forgets to normalize', async () => {
    await expect(
      pool.query(
        `INSERT INTO users (email, password_hash, name, role) VALUES ('Bad@X.com', 'h', 'n', 'RIDER')`,
      ),
    ).rejects.toMatchObject({ code: '23514' }); // check_violation
  });

  it('ENUM rejects an unknown role', async () => {
    await expect(
      pool.query(
        `INSERT INTO users (email, password_hash, name, role) VALUES ('a@x.com', 'h', 'n', 'SUPERUSER')`,
      ),
    ).rejects.toMatchObject({ code: '22P02' }); // invalid_text_representation
  });
});
