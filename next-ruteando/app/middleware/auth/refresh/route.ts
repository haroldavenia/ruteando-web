import { ensureAccess } from '@/lib/auth-flow';
import { verifySameOrigin } from '@/lib/csrf';
import { jsonError } from '@/lib/errors';
import { gatewayErrorResponse } from '@/lib/gateway';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return jsonError(403, 'Origen no permitido.');
  try {
    const session = await ensureAccess(true);
    return session ? Response.json({ user: session.user }) : jsonError(401, 'Sesión caducada.');
  } catch (err) {
    return gatewayErrorResponse(err);
  }
}
