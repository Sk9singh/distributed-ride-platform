import pino from 'pino';

export type Logger = pino.Logger;

// JSON logs from day one: in Phase 9 these get shipped and searched by requestId.
export function createLogger(service: string): Logger {
  return pino({ name: service, level: process.env.LOG_LEVEL ?? 'info' });
}
