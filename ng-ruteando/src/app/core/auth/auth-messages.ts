import { HttpContext } from '@angular/common/http';

import { withErrorMessage } from '../api/api-error-messages';
import { PASSWORD_POLICY_TEXT } from './password-policy';

import { t } from '../i18n/i18n';
export const INVALID_LINK_MESSAGE = t('El enlace no es válido o ha caducado');
export const REVIEW_DATA_MESSAGE = t('Revisa los datos e inténtalo de nuevo');
/** Cuando el gateway rechaza la contraseña (`PASSWORD_POLICY_VIOLATION`): la regla, no un error genérico. */
export const PASSWORD_REJECTED_MESSAGE = t('La contraseña no cumple la política. {0}', [PASSWORD_POLICY_TEXT]);

/** El gateway limita intentos con 429 y bloquea cuentas con 423 (no documentado: se leen por estado). */
export const TOO_MANY_ATTEMPTS_MESSAGE = t('Demasiados intentos. Espera unos minutos e inténtalo de nuevo');
export const ACCOUNT_LOCKED_MESSAGE = t('La cuenta está bloqueada temporalmente. Inténtalo más tarde');

/**
 * Mensajes de error propios de cada operación de acceso. Sustituyen al genérico del estado solo en
 * esa petición; el código del gateway (`INVALID_TOKEN`, `PASSWORD_POLICY_VIOLATION`...) manda sobre el estado.
 */
export const loginErrors = (): HttpContext =>
  withErrorMessage({
    401: t('Correo o contraseña incorrectos'),
    423: ACCOUNT_LOCKED_MESSAGE,
    429: TOO_MANY_ATTEMPTS_MESSAGE,
  });

export const registerErrors = (): HttpContext =>
  withErrorMessage({
    409: t('Ya existe una cuenta con ese correo'),
    429: TOO_MANY_ATTEMPTS_MESSAGE,
    400: REVIEW_DATA_MESSAGE,
    PASSWORD_POLICY_VIOLATION: PASSWORD_REJECTED_MESSAGE,
  });

/**
 * Enlaces de un solo uso (verificar el correo, restablecer la contraseña). El gateway no documenta qué estado
 * usa para un token inválido: `INVALID_TOKEN` y los habituales; un 400 sin código se sigue leyendo como enlace
 * no válido, pero un 400 por la contraseña o por datos no válidos no.
 */
export const linkErrors = (): HttpContext =>
  withErrorMessage({
    INVALID_TOKEN: INVALID_LINK_MESSAGE,
    PASSWORD_POLICY_VIOLATION: PASSWORD_REJECTED_MESSAGE,
    VALIDATION_ERROR: REVIEW_DATA_MESSAGE,
    429: TOO_MANY_ATTEMPTS_MESSAGE,
    400: INVALID_LINK_MESSAGE,
    401: INVALID_LINK_MESSAGE,
    404: INVALID_LINK_MESSAGE,
    410: INVALID_LINK_MESSAGE,
  });
