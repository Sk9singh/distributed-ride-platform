import type { ErrorRequestHandler, Request, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError, notFound, unauthorized } from './errors';
import { HEADERS, ROLES, type UserRole } from './auth';
import type { Logger } from './logger';

export interface Identity {
  id: string;
  role: UserRole;
}

/**
 * Services do NOT verify JWTs. They trust identity headers set by the gateway.
 * That is only safe because (a) the gateway strips these headers from incoming requests,
 * and (b) services are not reachable except through the gateway (enforced by networking
 * in Phase 7/8; in local dev, anyone hitting :3001 directly could forge them).
 */
export function identityFrom(req: Request): Identity {
  const id = req.header(HEADERS.userId);
  const role = req.header(HEADERS.userRole) as UserRole | undefined;
  if (!id || !role || !ROLES.includes(role)) throw unauthorized();
  return { id, role };
}

/** Express 5's default 404 is an HTML page; APIs should answer in JSON. */
export const notFoundHandler: RequestHandler = (req, _res, next) =>
  next(notFound(`No route for ${req.method} ${req.path}`));

/** One log line per request, tagged with the correlation id the gateway assigned. */
export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      logger.info({
        requestId: req.header(HEADERS.requestId),
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ms: Number(process.hrtime.bigint() - start) / 1e6,
      });
    });
    next();
  };
}

/**
 * Express 5 forwards rejected promises from async handlers here automatically,
 * so routes can just `throw` and never need try/catch for the response.
 */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  // Express recognizes an error handler by its 4 parameters, so _next must stay.
  return (err, req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message } });
      return;
    }
    if (err instanceof ZodError) {
      res
        .status(400)
        .json({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.issues },
        });
      return;
    }
    logger.error({ err, requestId: req.header(HEADERS.requestId) }, 'unhandled error');
    // Never leak internals (SQL, stack traces) to clients.
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  };
}
