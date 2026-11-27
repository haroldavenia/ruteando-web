import {
  type RemixiconComponentType,
  RiKeyLine,
  RiLockPasswordLine,
  RiMailLine,
  RiMessage2Line,
} from '@remixicon/react';

/** Métodos de segundo factor que se pueden activar. */
export type MfaMethod = 'email' | 'sms' | 'totp';
/** Lo que se puede usar para superar un reto: los métodos activos y un código de recuperación. */
export type MfaChallengeMethod = MfaMethod | 'recovery';

/** Nombre de cada método (clave en español de `t()`). */
export const MFA_LABEL: Record<MfaChallengeMethod, string> = {
  email: 'Correo electrónico',
  sms: 'Mensaje de texto (SMS)',
  totp: 'Aplicación autenticadora',
  recovery: 'Código de recuperación',
};

export const MFA_ICON: Record<MfaChallengeMethod, RemixiconComponentType> = {
  email: RiMailLine,
  sms: RiMessage2Line,
  totp: RiLockPasswordLine,
  recovery: RiKeyLine,
};

/** Frase corta de qué es cada método, para elegir al activarlo (clave de `t()`). */
export const MFA_HINT: Record<MfaMethod, string> = {
  email: 'Te enviamos un código a tu correo cada vez que inicies sesión.',
  sms: 'Te enviamos un código por mensaje de texto a tu teléfono.',
  totp: 'Un código que cambia cada 30 segundos en Google Authenticator u otra aplicación.',
};

/** Quita espacios y guiones de lo que la persona pegó o tecleó (`123 456`, `abcde-fghjk`). */
export const cleanCode = (value: unknown): string => String(value ?? '').replace(/[\s-]/g, '');
