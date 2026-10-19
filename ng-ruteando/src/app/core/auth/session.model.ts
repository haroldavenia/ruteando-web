export type UserRole = 'super_admin' | 'tenant_admin' | 'agent' | 'driver';

/** Usuario que devuelven `/auth/login`, `/auth/refresh` y `/auth/me`. */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: UserRole;
  tenantId: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

/** Respuesta de `/auth/login` y `/auth/refresh`; `expiresIn` son segundos. */
export interface SessionResponse {
  message: string | null;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}
