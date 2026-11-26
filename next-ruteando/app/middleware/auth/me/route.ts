import { ensureAccess } from '@/lib/auth-flow';
import { jsonError } from '@/lib/errors';
import { gatewayErrorResponse } from '@/lib/gateway';

export const dynamic = 'force-dynamic';

/** Restaura la sesión al cargar la página: el navegador no ve los tokens, solo pregunta quién es. */
export async function GET() {
  try {
    const session = await ensureAccess();
    return session ? Response.json({ user: session.user }) : jsonError(401, 'Sin sesión.');
  } catch (err) {
    return gatewayErrorResponse(err);
  }
}
