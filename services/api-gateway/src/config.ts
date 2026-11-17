import { requireEnv } from '@ride/common';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: requireEnv('JWT_SECRET'),
  userServiceUrl: requireEnv('USER_SERVICE_URL'),
};
