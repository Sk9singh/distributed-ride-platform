import { createLogger, createPool } from '@ride/common';
import { createApp } from './app';
import { config } from './config';

const logger = createLogger('user-service');
const pool = createPool(config.databaseUrl, logger);
const app = createApp({
  pool,
  logger,
  jwtSecret: config.jwtSecret,
  jwtExpiresIn: config.jwtExpiresIn,
});

const server = app.listen(config.port, () =>
  logger.info(`user-service listening on :${config.port}`),
);

// Graceful shutdown: stop accepting connections, let in-flight requests finish, then close
// DB connections. Matters in Docker/K8s, which send SIGTERM before killing a container.
function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
