import { vi } from 'vitest';

export interface Call {
  method: string;
  path: string;
  body: unknown;
  headers: Record<string, string>;
}

type Reply = unknown | { status: number; body?: unknown } | ((call: Call) => unknown);

/**
 * Simula el BFF (`/middleware/**`) en las pruebas de pantalla: `routes` se indexa por «MÉTODO ruta» (con la consulta). Lo que no esté
 * responde 404. `calls` guarda lo pedido, para comprobar cuerpos y rutas.
 */
export function mockGateway(routes: Record<string, Reply>) {
  const calls: Call[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = String(url);
    const call: Call = {
      method,
      path,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    };
    calls.push(call);
    const entry = routes[`${method} ${path}`];
    if (entry === undefined) return new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404 });
    const value = typeof entry === 'function' ? (entry as (c: Call) => unknown)(call) : entry;
    if (
      value &&
      typeof value === 'object' &&
      'status' in value &&
      typeof (value as { status: unknown }).status === 'number'
    ) {
      const { status, body } = value as { status: number; body?: unknown };
      return new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status });
    }
    return new Response(JSON.stringify(value ?? {}), { status: 200 });
  });
  return { calls, sent: (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path) };
}

/** Una página del gateway con estos registros. */
export const page = <T>(content: T[]) => ({
  content,
  totalElements: content.length,
  page: 0,
  size: 100,
  totalPages: 1,
});
