import { isAllowed } from '@/lib/allowlist';
import { ensureAccess } from '@/lib/auth-flow';
import { readCapped } from '@/lib/body';
import { verifySameOrigin } from '@/lib/csrf';
import { GENERIC_5XX, jsonError } from '@/lib/errors';
import { gatewayErrorResponse, gatewayFetch } from '@/lib/gateway';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_BODY = 10 * 1024 * 1024;
const FORWARD = ['content-type', 'accept', 'accept-language'];

async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!verifySameOrigin(request)) return jsonError(403, 'Origen no permitido.');
  if (!rateLimit(`data:${clientIp(request)}`, 600, 60_000)) return jsonError(429, 'Demasiadas peticiones.');

  const { path } = await params;
  try {
    let session = await ensureAccess();
    if (!session) return jsonError(401, 'Sesión caducada.');
    // Ruta, método y rol: lo que no esté en la lista no existe para el navegador (404, sin pistas).
    if (!isAllowed(path, request.method, session.user.role)) return jsonError(404, 'No encontrado.');

    const hasBody = !['GET', 'HEAD'].includes(request.method);
    const body = hasBody ? await readCapped(request, MAX_BODY) : undefined;
    if (body === null) return jsonError(413, 'La solicitud es demasiado grande.');

    const headers = new Headers();
    for (const h of FORWARD) if (request.headers.has(h)) headers.set(h, request.headers.get(h)!);
    const target = `/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`;
    const call = (token: string) => gatewayFetch(target, { method: request.method, headers, body, token });

    let res = await call(session.accessToken);
    if (res.status === 401) {
      // El token pudo caducar antes que la cookie: se renueva una vez y se reintenta.
      session = await ensureAccess(true);
      if (!session) return jsonError(401, 'Sesión caducada.');
      res = await call(session.accessToken);
    }
    if (res.status >= 500) return jsonError(502, GENERIC_5XX);

    const out = new Headers();
    const type = res.headers.get('content-type');
    if (type) out.set('content-type', type);
    return new Response(res.status === 204 ? null : res.body, { status: res.status, headers: out });
  } catch (err) {
    return gatewayErrorResponse(err);
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
