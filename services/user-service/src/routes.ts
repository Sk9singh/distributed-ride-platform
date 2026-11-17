import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import {
  conflict,
  forbidden,
  HttpError,
  identityFrom,
  isUniqueViolation,
  notFound,
  unauthorized,
} from '@ride/common';
import { DUMMY_HASH, hashPassword, signToken, verifyPassword } from './auth';
import { findUserByEmail, findUserWithProfile, insertUser } from './users.repo';

export interface RouteDeps {
  pool: Pool;
  jwtSecret: string;
  jwtExpiresIn: string;
}

// Normalize before validating so 'A@X.com ' and 'a@x.com' are the same account.
const email = z.string().trim().toLowerCase().pipe(z.email());

const registerSchema = z.object({
  email,
  // bcrypt only looks at the first 72 bytes; longer passwords would silently be truncated.
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(100),
  // ADMIN is deliberately not self-registrable.
  role: z.enum(['RIDER', 'DRIVER']),
});

const loginSchema = z.object({ email, password: z.string() });

export function userRoutes({ pool, jwtSecret, jwtExpiresIn }: RouteDeps): Router {
  const router = Router();

  router.post('/users/register', async (req, res) => {
    const body = registerSchema.parse(req.body);
    try {
      const user = await insertUser(pool, {
        email: body.email,
        passwordHash: await hashPassword(body.password),
        name: body.name,
        role: body.role,
      });
      res.status(201).json({ user });
    } catch (err) {
      // No "SELECT to check if email exists" beforehand: that is a check-then-act race.
      // The UNIQUE constraint is the only check that holds under concurrency.
      if (isUniqueViolation(err)) throw conflict('Email already registered');
      throw err;
    }
  });

  router.post('/users/login', async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await findUserByEmail(pool, email);
    // Always run bcrypt, even for unknown emails. Otherwise "no such user" answers in ~1ms
    // and "wrong password" in ~70ms, and the timing reveals which emails are registered.
    const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw unauthorized('Invalid email or password');

    const token = signToken({ sub: user.id, role: user.role }, jwtSecret, jwtExpiresIn);
    const { passwordHash: _omit, ...publicUser } = user; // never send the hash out
    res.json({ token, user: publicUser });
  });

  router.get('/users/me', async (req, res) => {
    const { id } = identityFrom(req);
    const user = await findUserWithProfile(pool, id);
    if (!user) throw notFound('User not found'); // valid token, but user was deleted
    res.json({ user });
  });

  router.post('/users/me/driver-profile', async (req) => {
    const { role } = identityFrom(req);
    if (role !== 'DRIVER') throw forbidden('Only drivers can create a driver profile');
    // EXERCISE: validate { vehicleNo, vehicleType } with zod, call insertDriverProfile
    // (see users.repo.ts), map each 23505 to a 409 with a clear message, respond 201.
    // Tests waiting for you: test/driver-profile.int.test.ts (remove the .skip).
    throw new HttpError(501, 'NOT_IMPLEMENTED', 'Driver profile: exercise not done yet');
  });

  return router;
}
