import request from 'supertest';
import { asUser, buildTestApp } from './helpers';

// EXERCISE: these tests are your acceptance criteria for POST /users/me/driver-profile.
// Implement insertDriverProfile (users.repo.ts) and the route (routes.ts), then
// change `describe.skip` to `describe` and run `npm run test:int`.

const { app, pool } = buildTestApp();

beforeEach(() => pool.query('TRUNCATE users CASCADE'));
afterAll(() => pool.end());

async function register(email: string, role: 'RIDER' | 'DRIVER') {
  const res = await request(app)
    .post('/users/register')
    .send({ email, password: 'password123', name: 'Test', role })
    .expect(201);
  return res.body.user.id as string;
}

describe.skip('POST /users/me/driver-profile', () => {
  const vehicle = { vehicleNo: 'KA01AB1234', vehicleType: 'SEDAN' };

  it('creates a profile for a DRIVER and /users/me shows it', async () => {
    const id = await register('d1@x.com', 'DRIVER');
    await request(app)
      .post('/users/me/driver-profile')
      .set(asUser(id, 'DRIVER'))
      .send(vehicle)
      .expect(201);
    const me = await request(app).get('/users/me').set(asUser(id, 'DRIVER')).expect(200);
    expect(me.body.user.driverProfile).toMatchObject({ ...vehicle, isActive: true });
  });

  it('403 for a RIDER', async () => {
    const id = await register('r1@x.com', 'RIDER');
    await request(app)
      .post('/users/me/driver-profile')
      .set(asUser(id, 'RIDER'))
      .send(vehicle)
      .expect(403);
  });

  it('409 when the driver already has a profile', async () => {
    const id = await register('d1@x.com', 'DRIVER');
    await request(app)
      .post('/users/me/driver-profile')
      .set(asUser(id, 'DRIVER'))
      .send(vehicle)
      .expect(201);
    await request(app)
      .post('/users/me/driver-profile')
      .set(asUser(id, 'DRIVER'))
      .send({ ...vehicle, vehicleNo: 'KA01ZZ9999' })
      .expect(409);
  });

  it('409 when another driver already registered that vehicle number', async () => {
    const a = await register('d1@x.com', 'DRIVER');
    const b = await register('d2@x.com', 'DRIVER');
    await request(app)
      .post('/users/me/driver-profile')
      .set(asUser(a, 'DRIVER'))
      .send(vehicle)
      .expect(201);
    await request(app)
      .post('/users/me/driver-profile')
      .set(asUser(b, 'DRIVER'))
      .send(vehicle)
      .expect(409);
  });

  it('400 for a missing vehicleNo', async () => {
    const id = await register('d1@x.com', 'DRIVER');
    await request(app)
      .post('/users/me/driver-profile')
      .set(asUser(id, 'DRIVER'))
      .send({ vehicleType: 'SEDAN' })
      .expect(400);
  });
});
