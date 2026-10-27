import { HttpContext, HttpContextToken } from '@angular/common/http';
import { InjectionToken, Provider } from '@angular/core';

/** Mensajes por código de error del backend (`'PACKAGE_NOT_FOUND'`) o por estado HTTP (`404`). */
export type ApiErrorMessages = Readonly<Record<string | number, string>>;

/** Mensajes genéricos en español según el estado HTTP. */
export const DEFAULT_API_ERROR_MESSAGES: ApiErrorMessages = {
  0: 'No hay conexión con el servidor',
  400: 'La solicitud no es válida',
  401: 'Tu sesión no es válida o ha caducado',
  403: 'No tienes permiso para realizar esta acción',
  404: 'No se encontró el recurso solicitado',
};

const GENERIC_SERVER_ERROR = 'El servicio no está disponible, inténtalo más tarde';
const GENERIC_OTHER_ERROR = 'No se pudo completar la solicitud';

/** Mensaje genérico para un estado: 5xx comparten texto; el resto de estados, un texto neutro. */
export function genericMessage(status: number): string {
  if (status >= 500) {
    return GENERIC_SERVER_ERROR;
  }
  return DEFAULT_API_ERROR_MESSAGES[status] ?? GENERIC_OTHER_ERROR;
}

/** Registro de mensajes personalizados; se amplía con `provideApiErrorMessages()`. */
export const API_ERROR_MESSAGES = new InjectionToken<ApiErrorMessages[]>('API_ERROR_MESSAGES', {
  providedIn: 'root',
  factory: () => [],
});

/** Añade mensajes por código o por estado, en la configuración de la app o de una feature. */
export function provideApiErrorMessages(messages: ApiErrorMessages): Provider {
  return {
    provide: API_ERROR_MESSAGES,
    multi: true,
    useValue: messages,
  };
}

/** Mensajes indicados en una petición concreta. */
export const REQUEST_ERROR_MESSAGES = new HttpContextToken<ApiErrorMessages>(() => ({}));

/** `http.get(url, { context: withErrorMessage({ 404: 'No existe ese paquete' }) })` */
export function withErrorMessage(messages: ApiErrorMessages, context: HttpContext = new HttpContext()): HttpContext {
  return context.set(REQUEST_ERROR_MESSAGES, messages);
}

function pick(messages: ApiErrorMessages, status: number, code: string | null): string | undefined {
  if (code !== null && Object.prototype.hasOwnProperty.call(messages, code)) {
    return messages[code];
  }
  return Object.prototype.hasOwnProperty.call(messages, status) ? messages[status] : undefined;
}

/**
 * Prioridad, de mayor a menor: mensaje de la petición, mensaje registrado y genérico del estado.
 * Dentro de cada nivel el código del backend gana al estado.
 */
export function resolveErrorMessage(
  error: { status: number; code: string | null },
  requestMessages: ApiErrorMessages,
  registered: readonly ApiErrorMessages[],
): string {
  const fromRequest = pick(requestMessages, error.status, error.code);
  if (fromRequest !== undefined) {
    return fromRequest;
  }
  // Los registros posteriores sustituyen a los anteriores
  for (let i = registered.length - 1; i >= 0; i--) {
    const fromRegistry = pick(registered[i], error.status, error.code);
    if (fromRegistry !== undefined) {
      return fromRegistry;
    }
  }
  return genericMessage(error.status);
}
