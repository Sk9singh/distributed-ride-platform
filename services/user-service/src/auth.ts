import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { JwtClaims } from '@ride/common';

// bcrypt is deliberately slow; each +1 doubles the work. 10 ≈ 50-100ms per hash: fine for
// a login, painful for an attacker brute-forcing a stolen hash table.
const BCRYPT_COST = 10;

// A real hash of a throwaway password; see its use in the login route.
export const DUMMY_HASH = bcrypt.hashSync('timing-attack-dummy', BCRYPT_COST);

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

/**
 * HS256 = one shared secret both signs (here) and verifies (gateway).
 * Tradeoff: simple, but anyone who can verify can also forge. RS256 would let the
 * gateway hold only a public key. Fine for now; a good interview talking point.
 */
export function signToken(claims: JwtClaims, secret: string, expiresIn: string): string {
  return jwt.sign({ role: claims.role }, secret, {
    subject: claims.sub,
    expiresIn: expiresIn as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}
