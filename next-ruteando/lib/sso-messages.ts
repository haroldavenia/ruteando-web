import type { FailureMessages } from './api-client';

/** Qué se le dice a la persona cuando el regreso del proveedor trae un código de error (`#error=…` en `/access/sso`). Devuelve la clave de `t()`. */
export function ssoErrorKey(code: string | null): string {
  switch (code) {
    case 'DENIED':
      return 'Cancelaste el inicio de sesión en el proveedor';
    case 'NO_ACCOUNT':
      return 'No hay una cuenta con ese correo. Pide a tu administrador que te invite';
    case 'ACCOUNT_DISABLED':
      return 'Tu cuenta está desactivada';
    case 'EMAIL_NOT_VERIFIED':
    case 'EMAIL_MISSING':
      return 'El proveedor no entregó un correo verificado';
    case 'SSO_DISABLED':
      return 'Tu empresa no permite entrar con inicio de sesión único';
    case 'WRONG_TENANT':
    case 'WRONG_DOMAIN':
      return 'Ese correo no pertenece a la empresa de este proveedor';
    case 'ROLE_NOT_ALLOWED':
      return 'Este rol no puede entrar con el SSO de una empresa';
    case 'IDENTITY_MISMATCH':
      return 'Esa cuenta del proveedor ya está vinculada a otra persona';
    case 'NO_PROVIDER':
      return 'No hay inicio de sesión único para ese correo';
    case 'STATE_INVALID':
      return 'El inicio de sesión caducó o se abrió en otro navegador. Inténtalo de nuevo';
    case 'PROVIDER_UNAVAILABLE':
      return 'No se pudo contactar con el proveedor. Inténtalo más tarde';
    case 'GATEWAY_ERROR':
      return 'El servicio no está disponible, inténtalo más tarde';
    default:
      return 'No se pudo iniciar sesión con el proveedor';
  }
}

/** Mensajes de los errores de `/middleware/sso/**` al canjear el ticket (los del servidor van en español: aquí se traducen). */
export const SSO_ERRORS: FailureMessages = {
  TICKET_EXPIRED: 'El inicio de sesión caducó. Inténtalo de nuevo',
  TOO_MANY_FAILURES: 'Demasiados códigos erróneos. Inténtalo de nuevo en unos minutos',
  MFA_UNAVAILABLE: 'El segundo factor es obligatorio pero ningún método está disponible',
};
