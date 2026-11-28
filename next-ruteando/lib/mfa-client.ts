import { type FailureMessages, requestJson } from './api-client';
import type { TFunction } from './i18n/core';
import type { MfaChallengeMethod, MfaMethod } from './mfa-labels';

/** Estado de un método para la persona con sesión. */
export interface MfaMethodStatus {
  /** La empresa lo permite. */
  allowed: boolean;
  /** El servidor puede usarlo (SMTP, proveedor de SMS). */
  available: boolean;
  active: boolean;
  /** Activación empezada y sin confirmar. */
  pending: boolean;
  destination: string | null;
}

export interface MfaStatus {
  enabled: boolean;
  methods: Record<MfaMethod, MfaMethodStatus>;
  recoveryCodesLeft: number;
  /** La empresa exige el segundo factor a esta persona. */
  required: boolean;
  activeCount: number;
}

export type MfaRequired = 'none' | 'all' | 'roles';

export interface MfaPolicy {
  tenantId: string;
  methods: Record<MfaMethod, boolean>;
  required: MfaRequired;
  roles: string[];
  /** Qué métodos puede usar el servidor (solo lectura). */
  available?: Record<MfaMethod, boolean>;
}

export interface MfaCodesSent {
  sent: true;
  method?: MfaMethod;
  destination: string | null;
  expiresInSeconds: number;
}

export interface MfaTotpSetup {
  secret: string;
  otpauthUri: string;
}

/** Respuesta al confirmar un método; trae los códigos de recuperación solo cuando era el primero (se muestran una vez). */
export interface MfaEnabled {
  active: true;
  recoveryCodes?: string[];
}

/** Cabecera con el reto de activación obligatoria: sustituye a la sesión en las altas (todavía no hay sesión). */
const CHALLENGE_HEADER = 'X-MFA-Challenge';
const BASE = '/middleware/mfa';

/**
 * Segundo factor (`/middleware/mfa/**`, lo atiende el propio BFF). Dos formas de autenticarse: con la sesión (cookies), la normal del
 * perfil y de seguridad, o con `challengeId`, cuando la empresa exige el segundo factor y la persona aún no tiene sesión.
 */
export const mfaApi = (t: TFunction, messages?: FailureMessages) => {
  const headers = (challengeId?: string | null) => (challengeId ? { [CHALLENGE_HEADER]: challengeId } : undefined);
  const post = <T>(path: string, body: unknown, challengeId?: string | null) =>
    requestJson<T>('POST', `${BASE}${path}`, body, t, messages, headers(challengeId));
  return {
    status: (challengeId?: string | null) =>
      requestJson<MfaStatus>('GET', `${BASE}/status`, undefined, t, messages, headers(challengeId)),
    emailSetup: (challengeId?: string | null) => post<MfaCodesSent>('/email/setup', {}, challengeId),
    emailConfirm: (code: string, challengeId?: string | null) =>
      post<MfaEnabled>('/email/confirm', { code }, challengeId),
    smsSetup: (phone: string, challengeId?: string | null) => post<MfaCodesSent>('/sms/setup', { phone }, challengeId),
    smsConfirm: (code: string, challengeId?: string | null) => post<MfaEnabled>('/sms/confirm', { code }, challengeId),
    totpSetup: (challengeId?: string | null) => post<MfaTotpSetup>('/totp/setup', {}, challengeId),
    totpConfirm: (code: string, challengeId?: string | null) =>
      post<MfaEnabled>('/totp/confirm', { code }, challengeId),
    /** Envía un código por correo o SMS para confirmar una acción sensible. */
    sessionSend: (via: MfaMethod) => post<MfaCodesSent>('/session/send', { via }),
    /** Quita un método; `via` y `code` son el código de un método activo (o de recuperación) que lo autoriza. */
    disable: (method: MfaMethod, via: MfaChallengeMethod, code: string) =>
      requestJson<{ active: false }>('DELETE', `${BASE}/methods/${method}`, { via, code }, t, messages),
    regenerateRecoveryCodes: (via: MfaChallengeMethod, code: string) =>
      post<{ recoveryCodes: string[] }>('/recovery-codes/regenerate', { via, code }),
    policy: (tenantId?: string | null) =>
      requestJson<MfaPolicy>(
        'GET',
        `${BASE}/policy${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''}`,
        undefined,
        t,
        messages
      ),
    savePolicy: (policy: Pick<MfaPolicy, 'methods' | 'required' | 'roles'>, tenantId?: string | null) =>
      requestJson<MfaPolicy>('PUT', `${BASE}/policy`, { ...policy, ...(tenantId ? { tenantId } : {}) }, t, messages),
    /** Quién tiene al menos un método activo en la empresa. */
    usersWithMfa: (tenantId?: string | null) =>
      requestJson<{ userIds: string[] }>(
        'GET',
        `${BASE}/users${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''}`,
        undefined,
        t,
        messages
      ),
    resetUser: (userId: string) => post<{ reset: true }>(`/users/${encodeURIComponent(userId)}/reset`, {}),
  };
};
