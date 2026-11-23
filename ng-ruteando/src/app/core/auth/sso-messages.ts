import { HttpContext } from '@angular/common/http';

import { withErrorMessage } from '../api/api-error-messages';
import { t } from '../i18n/i18n';

/** Qué se le dice a la persona cuando el regreso del proveedor trae un código de error (`#error=…` en la pantalla `/access/sso`). */
export function ssoErrorMessage(code: string | null): string {
  switch (code) {
    case 'DENIED':
      return t('Cancelaste el inicio de sesión en el proveedor');
    case 'NO_ACCOUNT':
      return t('No hay una cuenta con ese correo. Pide a tu administrador que te invite');
    case 'ACCOUNT_DISABLED':
      return t('Tu cuenta está desactivada');
    case 'EMAIL_NOT_VERIFIED':
    case 'EMAIL_MISSING':
      return t('El proveedor no entregó un correo verificado');
    case 'SSO_DISABLED':
      return t('Tu empresa no permite entrar con inicio de sesión único');
    case 'WRONG_TENANT':
    case 'WRONG_DOMAIN':
      return t('Ese correo no pertenece a la empresa de este proveedor');
    case 'ROLE_NOT_ALLOWED':
      return t('Este rol no puede entrar con el SSO de una empresa');
    case 'IDENTITY_MISMATCH':
      return t('Esa cuenta del proveedor ya está vinculada a otra persona');
    case 'NO_PROVIDER':
      return t('No hay inicio de sesión único para ese correo');
    case 'STATE_INVALID':
      return t('El inicio de sesión caducó o se abrió en otro navegador. Inténtalo de nuevo');
    case 'PROVIDER_UNAVAILABLE':
      return t('No se pudo contactar con el proveedor. Inténtalo más tarde');
    case 'GATEWAY_ERROR':
      return t('El servicio no está disponible, inténtalo más tarde');
    default:
      return t('No se pudo iniciar sesión con el proveedor');
  }
}

/** Mensajes de los errores de las rutas `/sso/**` (canje del ticket, vínculos, política y proveedor de la empresa). */
export const ssoErrors = (): HttpContext =>
  withErrorMessage({
    TICKET_EXPIRED: t('El inicio de sesión caducó. Inténtalo de nuevo'),
    TOO_MANY_FAILURES: t('Demasiados códigos erróneos. Inténtalo de nuevo en unos minutos'),
    MFA_UNAVAILABLE: t('El segundo factor es obligatorio pero ningún método está disponible'),
    INVALID_POLICY: t('La configuración no es válida'),
    INVALID_PROVIDER: t('Revisa los datos del proveedor'),
    DOMAIN_TAKEN: t('Ese dominio ya lo usa otra empresa'),
    SSO_DISABLED: t('El inicio de sesión único no está activado en el servidor'),
    NOT_FOUND: t('No se encontró lo que buscabas'),
  });
