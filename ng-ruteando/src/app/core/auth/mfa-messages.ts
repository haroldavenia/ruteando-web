import { HttpContext } from '@angular/common/http';

import { withErrorMessage } from '../api/api-error-messages';
import { t } from '../i18n/i18n';

/** Mensajes de los errores del segundo factor; el código del servidor manda sobre el estado HTTP. */
export const mfaErrors = (): HttpContext =>
  withErrorMessage({
    INVALID_CODE: t('El código no es válido'),
    CHALLENGE_EXPIRED: t('La verificación caducó. Inicia sesión de nuevo'),
    TOO_MANY_ATTEMPTS: t('Demasiados intentos. Inicia sesión de nuevo'),
    TOO_MANY_FAILURES: t('Demasiados códigos erróneos. Inténtalo de nuevo en unos minutos'),
    TOO_MANY_REQUESTS: t('Demasiados envíos. Espera unos minutos e inténtalo de nuevo'),
    METHOD_UNAVAILABLE: t('Ese método no está disponible'),
    METHOD_NOT_ALLOWED: t('Tu empresa no permite este método'),
    ALREADY_ACTIVE: t('Ese método ya está activo. Desactívalo con un código antes de cambiarlo'),
    INVALID_PHONE: t('Escribe el teléfono en formato internacional, por ejemplo +573001234567'),
    LAST_METHOD: t('Tu empresa exige el segundo factor: no puedes quitar el último método'),
    NO_METHOD_ALLOWED: t('Para exigir el segundo factor hace falta permitir al menos un método'),
    INVALID_POLICY: t('La configuración no es válida'),
    NOT_PENDING: t('No hay una activación pendiente'),
    ENROLL_PENDING: t('Activa un método antes de entrar'),
    MFA_DISABLED: t('El segundo factor no está activado en el servidor'),
    MFA_UNAVAILABLE: t('El segundo factor es obligatorio pero ningún método está disponible'),
    NOT_FOUND: t('No se encontró lo que buscabas'),
  });
