import { gatewayFetch } from './gateway';
import { clearSession, type GatewaySession, readSession, writeSession } from './session';

const inflight = new Map<string, Promise<GatewaySession | null>>();

/** Renueva con el gateway. Varias peticiones con el mismo refresh token comparten una sola llamada (single-flight). */
export function refreshWithGateway(refreshToken: string): Promise<GatewaySession | null> {
  const running = inflight.get(refreshToken);
  if (running) return running;
  const p = (async () => {
    const res = await gatewayFetch('/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    return (await res.json()) as GatewaySession;
  })().finally(() => inflight.delete(refreshToken));
  inflight.set(refreshToken, p);
  return p;
}

/**
 * Devuelve un access token vigente: el de la cookie, o uno nuevo si caducó (la cookie vive lo que dura el token). Si el refresh falla
 * (token revocado o vencido) limpia la sesión. `force` ignora el access token actual (tras un 401 del gateway).
 */
export async function ensureAccess(force = false) {
  const s = await readSession();
  if (!force && s.accessToken && s.user) return { accessToken: s.accessToken, user: s.user };
  if (!s.refreshToken) return null;
  const fresh = await refreshWithGateway(s.refreshToken);
  if (!fresh) {
    await clearSession();
    return null;
  }
  // El gateway no rota el refresh token (observado); si no lo devuelve se conserva el actual.
  await writeSession({ ...fresh, refreshToken: fresh.refreshToken || s.refreshToken });
  return { accessToken: fresh.accessToken, user: fresh.user };
}
