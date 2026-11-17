import { Pool } from 'pg';
import type { Logger } from './logger';

/**
 * A Pool keeps N open connections and lends them out per query.
 * Opening a Postgres connection costs a TCP + auth handshake and a whole backend
 * process on the server, so we never connect per request.
 *
 * Sizing: Postgres defaults to max_connections=100 for the WHOLE server.
 * Every service instance takes up to `max`, so 7 services x 3 replicas x 10 = 210 → too many.
 * That pressure is why PgBouncer shows up later (spec §4.4 #9).
 */
export function createPool(connectionString: string, logger: Logger, max = 10): Pool {
  const pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 30_000, // close connections idle this long
    connectionTimeoutMillis: 5_000, // fail fast if the pool is exhausted / DB is down
  });

  // An idle client can error (e.g. DB restarted). Without this listener Node crashes the process.
  pool.on('error', (err) => logger.error({ err }, 'idle pg client error'));
  return pool;
}

/** SQLSTATE 23505 = unique_violation. See https://www.postgresql.org/docs/current/errcodes-appendix.html */
export function isUniqueViolation(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}
