import { readConfig } from './config';
import { GENERIC_5XX, jsonError } from './errors';

export class GatewayUnavailable extends Error {
  constructor(readonly status: 502 | 503 | 504) {
    super('gateway');
  }
}

type GatewayInit = RequestInit & { token?: string; env?: Record<string, string | undefined> };

/** Llama al gateway de servidor a servidor: añade X-Api-Key, sin `Origin` (el gateway responde 403 con él) y con tiempo máximo. */
export async function gatewayFetch(path: string, init: GatewayInit = {}) {
  const { token, env, ...rest } = init;
  const cfg = readConfig(env);
  if (!cfg.gatewayModeValid || !cfg.gatewayUrl || !cfg.gatewayApiKey) throw new GatewayUnavailable(503);

  const headers = new Headers(rest.headers);
  for (const h of ['origin', 'cookie', 'authorization', 'x-api-key']) headers.delete(h);
  headers.set('X-Api-Key', cfg.gatewayApiKey);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  try {
    return await fetch(`${cfg.gatewayUrl}/api/v1${path}`, {
      ...rest,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(cfg.gatewayTimeoutMs),
    });
  } catch (err) {
    throw new GatewayUnavailable(err instanceof Error && err.name === 'TimeoutError' ? 504 : 502);
  }
}

/** Convierte un fallo de red en la respuesta genérica; el resto de errores se relanzan. */
export function gatewayErrorResponse(err: unknown) {
  if (err instanceof GatewayUnavailable) return jsonError(err.status, GENERIC_5XX);
  throw err;
}
