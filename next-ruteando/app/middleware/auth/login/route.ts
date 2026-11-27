import { verifySameOrigin } from '@/lib/csrf';
import { GENERIC_5XX, jsonError } from '@/lib/errors';
import { gatewayErrorResponse, gatewayFetch } from '@/lib/gateway';
import { getMfa } from '@/lib/mfa/service';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { writeSession, type GatewaySession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Falla CERRADO: sin el módulo de segundo factor (MFA_SECRET_KEY) este endpoint entregaría la sesión con solo la contraseña, así que
  // solo abre con ALLOW_LOGIN_WITHOUT_MFA=true (desarrollo, simulado o un despliegue que decide no usar el 2FA).
  const mfa = getMfa();
  if (!mfa.enabled && process.env.ALLOW_LOGIN_WITHOUT_MFA !== 'true') {
    return jsonError(503, 'El acceso no está habilitado todavía.');
  }
  if (!verifySameOrigin(request)) return jsonError(403, 'Origen no permitido.');
  if (!rateLimit(`login:${clientIp(request)}`, 20, 15 * 60_000)) return jsonError(429, 'Demasiados intentos. Prueba más tarde.');

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Solicitud no válida.');
  }
  if (typeof body.email !== 'string' || typeof body.password !== 'string') return jsonError(400, 'Solicitud no válida.');
  // Además del límite por IP (que se reparte entre muchas), uno por cuenta contra el adivinado de contraseñas.
  if (!rateLimit(`login-acct:${body.email.trim().toLowerCase()}`, 10, 15 * 60_000)) {
    return jsonError(429, 'Demasiados intentos. Prueba más tarde.');
  }

  try {
    const res = await gatewayFetch('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
    if (res.status >= 500) return jsonError(502, GENERIC_5XX);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return Response.json({ error: data.error, message: data.message }, { status: res.status });

    const session = data as GatewaySession;
    if (!session?.accessToken || !session.user?.id) return jsonError(502, GENERIC_5XX);
    // Segundo factor: la sesión se retiene en el servidor (en el reto) y no se escribe en cookies hasta superarlo.
    const pending = mfa.afterLogin(session);
    if (pending) return Response.json(pending.json, { status: pending.status });

    await writeSession(session);
    return Response.json({ user: session.user });
  } catch (err) {
    return gatewayErrorResponse(err);
  }
}
