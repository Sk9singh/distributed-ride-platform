// Shared between the gateway (verifies tokens) and user-service (issues them).

export const ROLES = ['RIDER', 'DRIVER', 'ADMIN'] as const;
export type UserRole = (typeof ROLES)[number];

export interface JwtClaims {
  sub: string; // user id
  role: UserRole;
}

export const HEADERS = {
  requestId: 'x-request-id',
  userId: 'x-user-id',
  userRole: 'x-user-role',
} as const;
