import { Pool } from 'pg';
import { createLogger } from '@ride/common';
import { createApp } from '../src/app';

// A separate database, so tests can TRUNCATE freely without touching dev data.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://user_svc:user_svc@localhost:5432/users_db_test';

export function buildTestApp() {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  const logger = createLogger('user-service-test');
  logger.level = 'silent';
  const app = createApp({ pool, logger, jwtSecret: 'test-secret', jwtExpiresIn: '1h' });
  return { app, pool };
}

/** Headers the gateway would add after verifying a JWT. */
export const asUser = (id: string, role: string) => ({ 'x-user-id': id, 'x-user-role': role });
