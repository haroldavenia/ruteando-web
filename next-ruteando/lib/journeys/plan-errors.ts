import { ApiError } from '@/lib/api-client';
import type { TFunction } from '@/lib/i18n/core';

/** Mensaje técnico que el gateway pone en el cuerpo del error (`{ error, message, ... }`), si lo hay. */
export function gatewayMessage(error: ApiError): string | null {
  const details = error.details;
  if (details && typeof details === 'object' && 'message' in details && typeof details.message === 'string') {
    return details.message;
  }
  return typeof details === 'string' && details ? details : null;
}

/**
 * Texto de un fallo de planificación. El mensaje del gateway se muestra tal cual: es lo único que identifica el defecto conocido de los
 * identificadores hexadecimales (`For input string: "…"`).
 */
export function planErrorMessage(error: unknown, t: TFunction): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  if (error.status === 400 || error.status === 422) {
    const detail = gatewayMessage(error);
    return detail ? t('No se pudo planificar la jornada: {0}', [detail]) : t('No se pudo planificar la jornada');
  }
  if (error.status === 404) {
    return t('La configuración o alguno de los paquetes ya no existe. Revisa la selección y vuelve a intentarlo.');
  }
  if (error.status === 502 || error.status === 504) {
    return t('La planificación tardó demasiado o el servicio no respondió; vuelve a intentarlo');
  }
  return undefined;
}
