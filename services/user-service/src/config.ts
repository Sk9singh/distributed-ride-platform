import { requireEnv } from '@ride/common';

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
};
