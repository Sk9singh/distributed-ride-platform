import express from 'express';
import { errorHandler, notFoundHandler, requestLogger, type Logger } from '@ride/common';
import { userRoutes, type RouteDeps } from './routes';

// The app takes its dependencies as arguments (instead of importing a global pool/config)
// so tests can build one against the test database.
export function createApp(deps: RouteDeps & { logger: Logger }) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger(deps.logger));

  // Health = "can I actually reach my DB", not just "the process is up".
  app.get('/health', async (_req, res) => {
    await deps.pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  app.use(userRoutes(deps));
  app.use(notFoundHandler);
  app.use(errorHandler(deps.logger));
  return app;
}
