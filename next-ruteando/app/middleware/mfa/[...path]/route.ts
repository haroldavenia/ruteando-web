import { ensureAccess } from '@/lib/auth-flow';
import { verifySameOrigin } from '@/lib/csrf';
import { jsonError } from '@/lib/errors';
import { getMfa } from '@/lib/mfa/service';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { writeSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Pasos del login que se atienden sin sesión: la persona aún no la tiene, solo el reto. */
const PUBLIC_STEPS = new Set(['/login/send', '/login/verify', '/login/complete']);

async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!verifySameOrigin(request)) return jsonError(403, 'Origen no permitido.');
  if (!rateLimit(`mfa:${clientIp(request)}`, 60, 60_000)) return jsonError(429, 'Demasiadas peticiones.');

  const mfa = getMfa();
  const route = '/' + (await params).path.join('/');
  // Sesión de cookies solo donde hace falta: el segundo paso del login y el reto de activación van sin ella.
  const needsSession = !PUBLIC_STEPS.has(route) && !request.headers.has('x-mfa-challenge');
  const session = needsSession ? await ensureAccess().catch(() => null) : null;

  const result = await mfa.handle(request, route, { user: session?.user ?? null, accessToken: session?.accessToken });
  // La sesión del gateway que entrega el segundo factor se convierte en cookies; los tokens no viajan en el JSON.
  if (result.session) await writeSession(result.session);
  return Response.json(result.json, { status: result.status });
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
