import { type FailureMessages, type MessageSpec, postJson } from './api-client';
import type { TFunction } from './i18n/core';
import type { MfaChallengeMethod, MfaMethod } from './mfa-labels';
import { PASSWORD_POLICY_TEXT } from './password-policy';
import { SSO_ERRORS } from './sso-messages';

/** Opción de un reto de segundo factor; el destino va enmascarado (`a•••@correo`, `+57•••••4567`) y es `null` en TOTP y recuperación. */
export interface MfaMethodOption {
  method: MfaChallengeMethod;
  destination: string | null;
}

/** El servidor pide superar un segundo factor; la sesión la retiene él y solo llegará al acertar. */
export interface MfaChallenge {
  mfaRequired: true;
  challengeId: string;
  methods: MfaMethodOption[];
  expiresInSeconds: number;
}

/** La empresa exige el segundo factor y la persona aún no tiene ninguno: antes de entrar debe activar uno. */
export interface MfaEnrollChallenge {
  mfaEnrollRequired: true;
  challengeId: string;
  methods: MfaMethod[];
  expiresInSeconds: number;
}

/** Qué ocurrió al iniciar sesión: sesión abierta (ya en cookies `httpOnly`), o un reto que superar antes de tenerla. */
export type LoginResult =
  { kind: 'session' } | { kind: 'challenge'; challenge: MfaChallenge } | { kind: 'enroll'; enroll: MfaEnrollChallenge };

/** Interpreta la respuesta del BFF a un login (o al canje de un ticket de SSO). */
export function toLoginResult(data: unknown): LoginResult {
  const d = data as Partial<MfaChallenge & MfaEnrollChallenge>;
  if (d?.mfaRequired) return { kind: 'challenge', challenge: d as MfaChallenge };
  if (d?.mfaEnrollRequired) return { kind: 'enroll', enroll: d as MfaEnrollChallenge };
  return { kind: 'session' };
}

/** Códigos del servidor tras los que el reto ya no sirve: hay que volver a escribir la contraseña. */
export const DEAD_CHALLENGE = ['CHALLENGE_EXPIRED', 'TOO_MANY_ATTEMPTS', 'TOO_MANY_FAILURES'];

export const TOO_MANY_ATTEMPTS = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo';

/** Mensajes propios del login; el gateway devuelve 401 (credenciales), 423 (cuenta bloqueada) y 429 (demasiados intentos). */
const LOGIN_ERRORS: FailureMessages = {
  401: 'Correo o contraseña incorrectos',
  423: 'La cuenta está bloqueada temporalmente. Inténtalo más tarde',
  429: TOO_MANY_ATTEMPTS,
  400: 'Revisa los datos e inténtalo de nuevo',
};

export async function login(email: string, password: string, t: TFunction): Promise<LoginResult> {
  return toLoginResult(await postJson('/middleware/auth/login', { email, password }, t, LOGIN_ERRORS));
}

/** Pide que el servidor envíe un código (correo o SMS) al destino del reto. Devuelve el destino enmascarado. */
export async function mfaSend(challengeId: string, method: 'email' | 'sms', t: TFunction): Promise<string | null> {
  const out = await postJson<{ destination: string | null }>('/middleware/mfa/login/send', { challengeId, method }, t);
  return out.destination;
}

/** Supera el reto con un código. Al acertar el servidor escribe las cookies de sesión: no devuelve ningún token. */
export async function mfaVerify(
  challengeId: string,
  method: MfaChallengeMethod,
  code: string,
  t: TFunction
): Promise<void> {
  await postJson('/middleware/mfa/login/verify', { challengeId, method, code }, t);
}

/** Cierra una activación obligatoria cuando ya hay un método activo: el servidor entrega la sesión (cookies). */
export async function mfaComplete(challengeId: string, t: TFunction): Promise<void> {
  await postJson('/middleware/mfa/login/complete', { challengeId }, t);
}

/** Canjea el ticket de un solo uso del regreso del SSO: da lo mismo que un login (sesión, o el reto de segundo factor). */
export async function ssoComplete(ticket: string, t: TFunction): Promise<LoginResult> {
  return toLoginResult(await postJson('/middleware/sso/complete', { ticket }, t, SSO_ERRORS));
}

export interface SsoProvider {
  id: string;
  label: string;
}

/** Proveedores que el servidor ofrece; sin lista (SSO apagado, servidor caído) no hay botones y el acceso con contraseña sigue igual. */
export async function listSsoProviders(): Promise<SsoProvider[]> {
  try {
    const res = await fetch('/middleware/sso/providers');
    if (!res.ok) return [];
    return ((await res.json()) as { providers?: SsoProvider[] }).providers ?? [];
  } catch {
    return [];
  }
}

/** Dirección de inicio del SSO. Es una navegación del navegador (no un `fetch`): el servidor lo lleva al proveedor. */
export const ssoStartUrl = (provider: string, email?: string) =>
  `/gateway/sso/${provider}/start${email ? `?email=${encodeURIComponent(email)}` : ''}`;

/**
 * Cierra la sesión: el servidor revoca el refresh token en el gateway (mejor esfuerzo) y borra las tres cookies. El navegador añade solo
 * `Origin` a este POST del mismo origen, que es lo que comprueba `verifySameOrigin`. Devuelve `true` si el servidor respondió bien; la
 * persona sale en cualquier caso (quien llama la lleva a /access).
 */
export async function logout(): Promise<boolean> {
  try {
    const res = await fetch('/middleware/auth/logout', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------- cuenta: registro, verificación de correo, recuperar y restablecer contraseña ----------

const REVIEW_DATA = 'Revisa los datos e inténtalo de nuevo';
export const INVALID_LINK = 'El enlace no es válido o ha caducado';
/** Cuando el gateway rechaza la contraseña (`PASSWORD_POLICY_VIOLATION`): la regla, no un error genérico. */
const PASSWORD_REJECTED: MessageSpec = {
  key: 'La contraseña no cumple la política. {0}',
  args: [PASSWORD_POLICY_TEXT],
};

const REGISTER_ERRORS: FailureMessages = {
  409: 'Ya existe una cuenta con ese correo',
  429: TOO_MANY_ATTEMPTS,
  400: REVIEW_DATA,
  PASSWORD_POLICY_VIOLATION: PASSWORD_REJECTED,
};

/**
 * Enlaces de un solo uso (verificar el correo, restablecer la contraseña). El gateway no documenta qué estado usa para un token inválido:
 * `INVALID_TOKEN` y los habituales; un 400 sin código se sigue leyendo como enlace no válido, pero un 400 por la contraseña o por datos
 * no válidos no.
 */
const LINK_ERRORS: FailureMessages = {
  INVALID_TOKEN: INVALID_LINK,
  PASSWORD_POLICY_VIOLATION: PASSWORD_REJECTED,
  VALIDATION_ERROR: REVIEW_DATA,
  429: TOO_MANY_ATTEMPTS,
  400: INVALID_LINK,
  401: INVALID_LINK,
  404: INVALID_LINK,
  410: INVALID_LINK,
};

export interface RegisterInput {
  firstName: string;
  lastName: string;
  tenantName: string;
  email: string;
  password: string;
}

/** Crea la cuenta y su empresa. No inicia sesión: eso ocurre al verificar el correo. */
export async function register(input: RegisterInput, t: TFunction): Promise<void> {
  await postJson('/middleware/auth/register', input, t, REGISTER_ERRORS);
}

/** Verifica el correo con el token del enlace; si el gateway entrega una sesión pasa por el 2FA como un login. */
export async function verifyEmail(token: string, t: TFunction): Promise<LoginResult> {
  return toLoginResult(await postJson('/middleware/auth/verify-email', { token }, t, LINK_ERRORS));
}

export async function resendVerification(email: string, t: TFunction): Promise<void> {
  await postJson('/middleware/auth/resend-verification', { email }, t, { 429: TOO_MANY_ATTEMPTS });
}

export async function forgotPassword(email: string, t: TFunction): Promise<void> {
  await postJson('/middleware/auth/forgot-password', { email }, t, { 429: TOO_MANY_ATTEMPTS });
}

/** Fija la contraseña nueva con el token del correo. No inicia sesión. */
export async function resetPassword(token: string, newPassword: string, t: TFunction): Promise<void> {
  await postJson('/middleware/auth/reset-password', { token, newPassword }, t, LINK_ERRORS);
}

/** Estados con los que el gateway indica que el enlace ya no sirve (no documenta cuál usa). */
export const LINK_STATUSES = [400, 401, 404, 410];
/** Códigos de un 400 que culpan a la contraseña o a los datos escritos, no al enlace: el token sigue valiendo. */
export const FORM_ERROR_CODES = ['PASSWORD_POLICY_VIOLATION', 'VALIDATION_ERROR'];
