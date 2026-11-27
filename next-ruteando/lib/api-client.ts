import type { TFunction } from './i18n/core';

/**
 * Cliente del navegador para el BFF (`/middleware/**`). El navegador nunca ve tokens: solo habla con este servidor, que lleva la sesión
 * en cookies `httpOnly`. Un error trae el estado HTTP, el `code` del servicio (si lo hay: los de MFA y SSO) y un `message`.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message);
  }
}

/** Un mensaje (clave de `t()`), o la clave con los valores de sus marcadores `{0}`. */
export type MessageSpec = string | { key: string; args: readonly (string | number | MessageSpec)[] };

export interface FailureMessages {
  /** Mensaje por estado HTTP (`401`) o por código del servicio (`CHALLENGE_EXPIRED`); manda el código sobre el estado. */
  [statusOrCode: string]: MessageSpec | undefined;
}

/** Los argumentos que son un mensaje se traducen antes de entrar en el marcador (una frase dentro de otra). */
export const render = (spec: MessageSpec, t: TFunction): string =>
  typeof spec === 'string'
    ? t(spec)
    : t(
        spec.key,
        spec.args.map((a) => (typeof a === 'object' ? render(a, t) : a))
      );

/**
 * Qué decirle a la persona ante un fallo. Orden: el mensaje que la operación declaró para ese código o estado; los fallos del servicio
 * (5xx) con su frase; y, si no, el mensaje del servidor cuando es de los nuestros (MFA y SSO escriben en español) o uno genérico.
 */
export function failureMessage(
  status: number,
  code: string | undefined,
  serverMessage: string | undefined,
  t: TFunction,
  own?: FailureMessages
): string {
  if (code && own?.[code]) return render(own[code]!, t);
  if (own?.[String(status)]) return render(own[String(status)]!, t);
  if (status === 0) return t('No hay conexión con el servidor');
  if (status >= 500) return t('El servicio no está disponible, inténtalo más tarde');
  // Los servicios propios (MFA, SSO) dan su `code` y un mensaje ya pensado para la persona: manda sobre el genérico del estado
  // (un INVALID_CODE es un 401, pero no es «tu sesión caducó»)
  if (code && serverMessage) return serverMessage;
  if (status === 401) return t('Tu sesión no es válida o ha caducado');
  if (status === 403) return t('No tienes permiso para realizar esta acción');
  if (status === 404) return t('No se encontró el recurso solicitado');
  if (status === 429) return t('Demasiados intentos. Espera unos minutos e inténtalo de nuevo');
  // Los del gateway llegan en inglés y sin `serverMessage`: no se muestran
  return t('No se pudo completar la solicitud');
}

/**
 * POST con cuerpo JSON. El navegador añade solo `Origin`, que es lo que comprueba `verifySameOrigin`. Devuelve el JSON de la respuesta;
 * ante un fallo lanza `ApiError` con el mensaje ya redactado (`messages` declara los propios de la operación).
 */
export async function postJson<T>(
  path: string,
  body: unknown,
  t: TFunction,
  messages?: FailureMessages,
  extraHeaders?: Record<string, string>
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, failureMessage(0, undefined, undefined, t, messages));
  }
  const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string; message?: string };
  if (!res.ok) {
    // `code` es el de los servicios propios (MFA, SSO); el gateway usa `error`
    const code = data.code ?? data.error;
    throw new ApiError(
      res.status,
      failureMessage(res.status, code, data.code ? data.message : undefined, t, messages),
      code
    );
  }
  return data as T;
}
