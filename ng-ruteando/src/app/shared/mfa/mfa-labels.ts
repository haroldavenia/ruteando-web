import { MfaChallengeMethod, MfaMethod } from '../../core/auth/mfa.model';
import { t } from '../../core/i18n/i18n';

/** Nombre de cada método tal como se le muestra a la persona. */
export function mfaMethodLabel(method: MfaChallengeMethod): string {
  switch (method) {
    case 'email':
      return t('Correo electrónico');
    case 'sms':
      return t('Mensaje de texto (SMS)');
    case 'totp':
      return t('Aplicación autenticadora');
    case 'recovery':
      return t('Código de recuperación');
  }
}

export function mfaMethodIcon(method: MfaChallengeMethod): string {
  switch (method) {
    case 'email':
      return 'mail';
    case 'sms':
      return 'sms';
    case 'totp':
      return 'phonelink_lock';
    case 'recovery':
      return 'key';
  }
}

/** Frase corta de qué es cada método, para elegir al activarlo. */
export function mfaMethodHint(method: MfaMethod): string {
  switch (method) {
    case 'email':
      return t('Te enviamos un código a tu correo cada vez que inicies sesión.');
    case 'sms':
      return t('Te enviamos un código por mensaje de texto a tu teléfono.');
    case 'totp':
      return t('Un código que cambia cada 30 segundos en Google Authenticator u otra aplicación.');
  }
}

/** Quita espacios y guiones de lo que la persona pegó o tecleó (`123 456`, `abcde-fghjk`). */
export function cleanCode(value: string): string {
  return String(value ?? '').replace(/[\s-]/g, '');
}
