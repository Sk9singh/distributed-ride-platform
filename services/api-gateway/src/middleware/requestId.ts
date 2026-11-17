import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { HEADERS } from '@ride/common';

const SAFE_ID = /^[\w-]{1,128}$/;

/**
 * Correlation ID: one id per client request, forwarded to every service (and later into
 * Kafka events), so one grep across all logs shows a request's whole journey.
 * Reuse the client's id if it looks sane; otherwise mint one.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header(HEADERS.requestId);
  const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  req.headers[HEADERS.requestId] = id; // forwarded upstream by the proxy
  res.setHeader(HEADERS.requestId, id); // returned to the client for bug reports
  next();
};
