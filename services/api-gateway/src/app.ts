import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { errorHandler, notFoundHandler, requestLogger, type Logger } from '@ride/common';
import { authenticate } from './middleware/authenticate';
import { requestId } from './middleware/requestId';

export interface GatewayDeps {
  logger: Logger;
  jwtSecret: string;
  userServiceUrl: string;
}

export function createApp({ logger, jwtSecret, userServiceUrl }: GatewayDeps) {
  const app = express();
  // NOTE: no express.json() here. The gateway streams bodies straight through to the
  // service; parsing them would consume the stream and the proxy would forward nothing.

  app.use(requestId);
  app.use(requestLogger(logger));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(authenticate(jwtSecret));

  // pathFilter keeps the full path (/users/login → user-service /users/login).
  // Later phases add /rides, /drivers, /payments the same way.
  app.use(
    createProxyMiddleware({ target: userServiceUrl, pathFilter: '/users', changeOrigin: true }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
