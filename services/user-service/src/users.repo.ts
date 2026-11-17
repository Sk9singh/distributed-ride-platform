import type { Pool } from 'pg';
import type { UserRole } from '@ride/common';

// All SQL for this service lives here. $1, $2... are bind parameters: the values travel
// separately from the SQL text, so user input can never be parsed as SQL (no injection).

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface DriverProfile {
  vehicleNo: string;
  vehicleType: string;
  isActive: boolean;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: Date;
}

const toUser = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  createdAt: r.created_at,
});

export async function insertUser(
  db: Pool,
  u: { email: string; passwordHash: string; name: string; role: UserRole },
): Promise<User> {
  // RETURNING gives us the generated id/created_at in the same round trip.
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role, created_at`,
    [u.email, u.passwordHash, u.name, u.role],
  );
  return toUser(rows[0]);
}

export async function findUserByEmail(
  db: Pool,
  email: string,
): Promise<(User & { passwordHash: string }) | null> {
  const { rows } = await db.query<UserRow & { password_hash: string }>(
    `SELECT id, email, name, role, created_at, password_hash
     FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] ? { ...toUser(rows[0]), passwordHash: rows[0].password_hash } : null;
}

export async function findUserWithProfile(
  db: Pool,
  id: string,
): Promise<(User & { driverProfile: DriverProfile | null }) | null> {
  // LEFT JOIN: riders have no profile row, so the dp.* columns come back NULL instead of
  // the user disappearing (which is what an INNER JOIN would do).
  const { rows } = await db.query<
    UserRow & { vehicle_no: string | null; vehicle_type: string; is_active: boolean }
  >(
    `SELECT u.id, u.email, u.name, u.role, u.created_at,
            dp.vehicle_no, dp.vehicle_type, dp.is_active
     FROM users u
     LEFT JOIN driver_profiles dp ON dp.user_id = u.id
     WHERE u.id = $1`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    ...toUser(r),
    driverProfile: r.vehicle_no
      ? { vehicleNo: r.vehicle_no, vehicleType: r.vehicle_type, isActive: r.is_active }
      : null,
  };
}

/*
 * EXERCISE (yours to write): insertDriverProfile(db, userId, { vehicleNo, vehicleType })
 *
 * - One INSERT ... RETURNING into driver_profiles.
 * - Do NOT "SELECT first to check if a profile exists". Two concurrent requests would both
 *   see "no profile" and both insert. Let the constraints decide and catch the error:
 *     PK on user_id        → this user already has a profile
 *     UNIQUE on vehicle_no → someone else registered that vehicle
 *   Both raise SQLSTATE 23505; `err.constraint` tells you which one
 *   (Postgres auto-names them driver_profiles_pkey / driver_profiles_vehicle_no_key).
 */
