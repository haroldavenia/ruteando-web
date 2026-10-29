import { ApiError } from '../../core/api/api-error';

/** Mensaje técnico que el gateway pone en el cuerpo del error (`{ error, message, ... }`), si lo hay. */
export function gatewayMessage(error: ApiError): string | null {
  const details = error.details;
  if (details && typeof details === 'object' && 'message' in details && typeof details.message === 'string') {
    return details.message;
  }
  return typeof details === 'string' && details ? details : null;
}

export const PLAN_TIMEOUT = 'La planificación tardó demasiado o el servicio no respondió; vuelve a intentarlo';
export const PLAN_NOT_FOUND = 'La configuración o alguno de los paquetes ya no existe. Revisa la selección y vuelve a intentarlo.';

/**
 * Texto de un fallo de planificación. El mensaje del gateway se muestra tal cual: es lo único que
 * identifica el defecto conocido de los identificadores hexadecimales (`For input string: "…"`).
 */
export function planErrorMessage(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) {
    return undefined;
  }
  if (error.status === 400 || error.status === 422) {
    const detail = gatewayMessage(error);
    return detail ? `No se pudo planificar la jornada: ${detail}` : 'No se pudo planificar la jornada';
  }
  if (error.status === 404) {
    return PLAN_NOT_FOUND;
  }
  if (error.status === 502 || error.status === 504) {
    return PLAN_TIMEOUT;
  }
  return undefined;
}
