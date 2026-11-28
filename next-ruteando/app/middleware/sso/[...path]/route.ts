import { cookies } from 'next/headers';

import { ensureAccess } from '@/lib/auth-flow';
import { readCapped } from '@/lib/body';
import { verifySameOrigin } from '@/lib/csrf';
import { jsonError } from '@/lib/errors';
import { loginGate } from '@/lib/login-flow';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { writeSession } from '@/lib/session';
import { getSso, SSO_COOKIE, SSO_TICKET_COOKIE, SSO_TICKET_PATH, type SsoRedirect } from '@/lib/sso/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function redirect({ location, cookie }: SsoRedirect) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  for (const value of ([] as string[]).concat(cookie ?? [])) headers.append('Set-Cookie', value);
  return new Response(null, { status: 302, headers });
}

const cookieOf = (request: Request, name: string) =>
  (request.headers.get('cookie') || '')
    .split(';')
    .map((p) => p.trim().split('='))
    .find(([k]) => k === name)?.[1] || '';

async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path;
  const route = '/' + segments.join('/');
  const sso = getSso();
  const method = request.method;
  if (!rateLimit(`sso:${clientIp(request)}`, 60, 60_000)) return jsonError(429, 'Demasiadas peticiones.');

  // ---- públicas: el navegador aún no tiene sesión ----
  if (method === 'GET' && route === '/providers') return Response.json(sso.listProviders());

  if (method === 'GET' && segments.length === 2 && segments[1] === 'start') {
    return redirect(await sso.start(segments[0], new URL(request.url).searchParams.get('email')));
  }

  // El callback lo abre el proveedor: Apple lo manda como POST entre sitios (con otro Origin), así que NO pasa por verifySameOrigin; lo
  // protegen el `state` de un solo uso y la cookie que liga el regreso al navegador que empezó.
  if ((method === 'GET' || method === 'POST') && segments.length === 2 && segments[1] === 'callback') {
    let query: Record<string, string | undefined>;
    if (method === 'POST') {
      const raw = await readCapped(request, 20 * 1024);
      const form = new URLSearchParams(raw ? new TextDecoder().decode(raw) : '');
      query = Object.fromEntries(form);
    } else {
      query = Object.fromEntries(new URL(request.url).searchParams);
    }
    return redirect(await sso.callback(segments[0], query, cookieOf(request, SSO_COOKIE)));
  }

  if (!verifySameOrigin(request)) return jsonError(403, 'Origen no permitido.');

  if (method === 'POST' && route === '/complete') {
    // Falla CERRADO como el login: sin segundo factor este canje entregaría la sesión con solo el ticket del proveedor.
    const closed = loginGate();
    if (closed) return closed;
    let ticket: unknown;
    try {
      const raw = await readCapped(request, 20 * 1024);
      ticket = raw?.byteLength ? JSON.parse(new TextDecoder().decode(raw)).ticket : undefined;
    } catch {
      return jsonError(400, 'Solicitud no válida.');
    }
    // El ticket solo vale en el navegador que hizo el flujo: la cookie la puso el servidor al volver del proveedor
    const result = sso.complete(ticket, cookieOf(request, SSO_TICKET_COOKIE));
    if (result.session) await writeSession(result.session); // los tokens no viajan en el JSON
    // Sea cual sea el resultado el ticket ya se gastó: su cookie ya no sirve. Por el almacén de cookies de Next (si se pusiera a mano en
    // la respuesta, Next la sustituiría por las que escribe `writeSession`).
    (await cookies()).set(SSO_TICKET_COOKIE, '', { path: SSO_TICKET_PATH, httpOnly: true, maxAge: 0 });
    return Response.json(result.json, { status: result.status });
  }

  // ---- gestión: exige sesión ----
  const session = await ensureAccess().catch(() => null);
  const result = await sso.manage(request, route, { user: session?.user ?? null, accessToken: session?.accessToken });
  return Response.json(result.json, { status: result.status });
}

export { handle as DELETE, handle as GET, handle as POST, handle as PUT };
