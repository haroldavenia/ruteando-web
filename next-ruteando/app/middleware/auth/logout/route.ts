import { verifySameOrigin } from '@/lib/csrf';
import { jsonError } from '@/lib/errors';
import { gatewayFetch } from '@/lib/gateway';
import { clearSession, readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return jsonError(403, 'Origen no permitido.');
  const { refreshToken, accessToken } = await readSession();
  if (refreshToken) {
    // Mejor esfuerzo: si el gateway no responde la sesión local se cierra igual.
    await gatewayFetch('/auth/logout', {
      method: 'POST',
      token: accessToken,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  await clearSession();
  return Response.json({ ok: true });
}
