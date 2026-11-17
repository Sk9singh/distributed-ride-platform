import { createLogger } from '@ride/common';
import { createApp } from './app';
import { config } from './config';

const logger = createLogger('api-gateway');
const app = createApp({
  logger,
  jwtSecret: config.jwtSecret,
  userServiceUrl: config.userServiceUrl,
});

const server = app.listen(config.port, () =>
  logger.info(`api-gateway listening on :${config.port}`),
);

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
