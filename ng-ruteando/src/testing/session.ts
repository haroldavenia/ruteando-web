import { SessionResponse, UserProfile, UserRole } from '../app/core/auth/session.model';

/** Datos de prueba sin información real: el correo usa el dominio reservado `.invalid`. */
export function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    email: 'persona@example.invalid',
    firstName: 'Prueba',
    lastName: 'Usuario',
    phone: null,
    role: 'tenant_admin' as UserRole,
    tenantId: 'tenant-1',
    emailVerified: true,
    phoneVerified: false,
    createdAt: '2026-10-11T14:14:04.598Z',
    ...overrides,
  };
}

export function makeSession(access = 'acceso-1', refresh = 'refresco-1', expiresIn = 3599, user = makeUser()): SessionResponse {
  return { message: null, accessToken: access, refreshToken: refresh, expiresIn, user };
}
