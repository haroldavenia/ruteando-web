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

/** Cuerpo de `POST /auth/register`. */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Nombre de la empresa: el registro crea también su tenant. */
  tenantName: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

/** Respuesta de `POST /auth/register`: no trae tokens, la sesión se inicia después de verificar el correo. */
export interface RegisterResponse {
  user: UserProfile;
  tenant: TenantSummary;
  message: string;
}

/** Respuesta con solo un mensaje (`forgot-password`, `resend-verification`, `reset-password`). */
export interface MessageResponse {
  message: string;
}
