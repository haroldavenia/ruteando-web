import { readCapped } from './body';
import { verifySameOrigin } from './csrf';
import { GENERIC_5XX, jsonError } from './errors';
import { gatewayErrorResponse, gatewayFetch } from './gateway';
import { clientIp, rateLimit } from './rate-limit';

const WINDOW_MS = 15 * 60_000;

export interface PublicEndpoint {
  /** Ruta del gateway (nunca la elige el cliente). */
  path: string;
  /** Campos que se reenvían y su largo máximo; todos son cadenas obligatorias. Lo demás se descarta. */
  fields: Record<string, number>;
  /** Nombre del cubo de límites. */
  bucket: string;
  /** Peticiones por IP en 15 minutos. */
  ipMax?: number;
  /** Campo (p. ej. `email`) por el que también se limita, para que no se pueda inundar de correos a una persona. */
  accountField?: string;
  accountMax?: number;
  /** Qué responder con lo que devolvió el gateway (ya con estado 2xx). */
  onSuccess: (data: Record<string, unknown>) => Promise<Response> | Response;
  /** Se ejecuta antes de gastar nada del gateway (p. ej. la puerta del segundo factor). */
  guard?: () => Response | null;
}

/**
 * Endpoint de cuenta que se atiende SIN sesión (registro, verificar, recuperar): origen igual (CSRF), límites por IP y por cuenta, cuerpo
 * acotado, solo los campos esperados, errores 5xx genéricos y respuesta construida por quien llama (nunca el cuerpo del gateway tal cual).
 */
export async function publicEndpoint(request: Request, o: PublicEndpoint): Promise<Response> {
  const blocked = o.guard?.();
  if (blocked) return blocked;
  if (!verifySameOrigin(request)) return jsonError(403, 'Origen no permitido.');
  if (!rateLimit(`${o.bucket}:${clientIp(request)}`, o.ipMax ?? 20, WINDOW_MS)) return jsonError(429, 'Demasiados intentos. Prueba más tarde.');

  let input: Record<string, unknown>;
  try {
    const raw = await readCapped(request, 20 * 1024);
    if (raw === null) return jsonError(413, 'La solicitud es demasiado grande.');
    input = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return jsonError(400, 'Solicitud no válida.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return jsonError(400, 'Solicitud no válida.');

  const body: Record<string, string> = {};
  for (const [name, max] of Object.entries(o.fields)) {
    const v = input[name];
    if (typeof v !== 'string' || v === '' || v.length > max) return jsonError(400, 'Solicitud no válida.');
    body[name] = v;
  }
  if (o.accountField && !rateLimit(`${o.bucket}-acct:${body[o.accountField].trim().toLowerCase()}`, o.accountMax ?? 5, WINDOW_MS)) {
    return jsonError(429, 'Demasiados intentos. Prueba más tarde.');
  }

  try {
    const res = await gatewayFetch(o.path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status >= 500) return jsonError(502, GENERIC_5XX);
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return Response.json({ error: data.error, message: data.message }, { status: res.status });
    return await o.onSuccess(data);
  } catch (err) {
    return gatewayErrorResponse(err);
  }
}

/** Respuesta de los endpoints que no abren sesión: solo el mensaje, aunque el gateway devolviera algo más (tokens, por ejemplo). */
export const messageOnly = (data: Record<string, unknown>) => Response.json({ message: typeof data.message === 'string' ? data.message : null });
