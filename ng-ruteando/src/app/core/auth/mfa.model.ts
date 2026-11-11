import { SessionResponse, UserProfile, UserRole } from './session.model';

/** Métodos de segundo factor que se pueden activar. */
export type MfaMethod = 'email' | 'sms' | 'totp';
/** Lo que se puede usar para superar un reto: los métodos activos y un código de recuperación. */
export type MfaChallengeMethod = MfaMethod | 'recovery';

export interface MfaMethodOption {
  method: MfaChallengeMethod;
  /** Destino enmascarado (`a•••@correo`, `+57•••••4567`); `null` en TOTP y recuperación. */
  destination: string | null;
}

/** Respuesta de `POST /auth/login` cuando hay que superar un segundo factor: no trae ningún token. */
export interface MfaChallenge {
  mfaRequired: true;
  challengeId: string;
  methods: MfaMethodOption[];
  expiresInSeconds: number;
}

/** Respuesta de `POST /auth/login` cuando la empresa exige el segundo factor y la persona aún no tiene ninguno. */
export interface MfaEnrollChallenge {
  mfaEnrollRequired: true;
  challengeId: string;
  methods: MfaMethod[];
  expiresInSeconds: number;
}

export type LoginResponse = SessionResponse | MfaChallenge | MfaEnrollChallenge;

/** Qué ocurrió al iniciar sesión: sesión abierta, o un reto que superar antes de tenerla. */
export type LoginResult =
  | { kind: 'session'; user: UserProfile }
  | { kind: 'challenge'; challenge: MfaChallenge }
  | { kind: 'enroll'; enroll: MfaEnrollChallenge };

/** Sesión que entrega el servidor al superar el reto; `mfa` indica con qué se superó. */
export interface MfaSessionResponse extends SessionResponse {
  mfa?: { method: string; recoveryCodesLeft?: number };
}

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
  roles: UserRole[];
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
