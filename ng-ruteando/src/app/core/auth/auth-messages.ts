import { HttpContext } from '@angular/common/http';

import { withErrorMessage } from '../api/api-error-messages';

export const INVALID_LINK_MESSAGE = 'El enlace no es válido o ha caducado';

/**
 * Mensajes de error propios de cada operación de acceso. Sustituyen al genérico del estado solo en
 * esa petición. El gateway no documenta qué estado devuelve un token inválido: se cubren los habituales.
 */
export const loginErrors = (): HttpContext => withErrorMessage({ 401: 'Correo o contraseña incorrectos' });

export const registerErrors = (): HttpContext =>
  withErrorMessage({ 409: 'Ya existe una cuenta con ese correo', 400: 'Revisa los datos e inténtalo de nuevo' });

export const linkErrors = (): HttpContext =>
  withErrorMessage({
    400: INVALID_LINK_MESSAGE,
    401: INVALID_LINK_MESSAGE,
    404: INVALID_LINK_MESSAGE,
    410: INVALID_LINK_MESSAGE,
  });
