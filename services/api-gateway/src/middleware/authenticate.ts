import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HEADERS, ROLES, unauthorized, type UserRole } from '@ride/common';

const PUBLIC_ROUTES = new Set(['POST /users/register', 'POST /users/login']);

export function authenticate(jwtSecret: string): RequestHandler {
  return (req, _res, next) => {
    // Strip identity headers coming from the outside world FIRST. Without this, a client
    // could send `x-user-role: ADMIN` and every downstream service would believe it.
    delete req.headers[HEADERS.userId];
    delete req.headers[HEADERS.userRole];

    if (PUBLIC_ROUTES.has(`${req.method} ${req.path}`)) return next();

    const auth = req.header('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : undefined;
    if (!token) return next(unauthorized('Missing bearer token'));

    let claims: jwt.JwtPayload;
    try {
      // Pin the algorithm. Never let the token's own header pick it (the classic
      // "alg: none" / algorithm-confusion attacks).
      claims = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    } catch {
      return next(unauthorized('Invalid or expired token'));
    }
    if (!claims.sub || !ROLES.includes(claims.role as UserRole)) {
      return next(unauthorized('Malformed token claims'));
    }

    req.headers[HEADERS.userId] = claims.sub;
    req.headers[HEADERS.userRole] = claims.role;
    next();
  };
}
