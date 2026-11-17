import jwt from 'jsonwebtoken';
import { hashPassword, signToken, verifyPassword } from './auth';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse');
    expect(hash).not.toContain('correct horse');
    expect(await verifyPassword('correct horse', hash)).toBe(true);
    expect(await verifyPassword('wrong horse', hash)).toBe(false);
  });

  it('salts: same password hashes differently each time', async () => {
    expect(await hashPassword('same')).not.toEqual(await hashPassword('same'));
  });
});

describe('signToken', () => {
  it('puts user id in sub and role in the payload', () => {
    const token = signToken({ sub: 'u-1', role: 'DRIVER' }, 'secret', '1h');
    const claims = jwt.verify(token, 'secret') as jwt.JwtPayload;
    expect(claims.sub).toBe('u-1');
    expect(claims.role).toBe('DRIVER');
    expect(claims.exp! - claims.iat!).toBe(3600);
  });

  it('cannot be verified with a different secret', () => {
    const token = signToken({ sub: 'u-1', role: 'RIDER' }, 'secret', '1h');
    expect(() => jwt.verify(token, 'other-secret')).toThrow();
  });
});
