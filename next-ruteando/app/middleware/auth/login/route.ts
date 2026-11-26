import { verifySameOrigin } from '@/lib/csrf';
import { GENERIC_5XX, jsonError } from '@/lib/errors';
import { gatewayErrorResponse, gatewayFetch } from '@/lib/gateway';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { writeSession, type GatewaySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Fase 3: aquí se intercepta el login para imponer el segundo factor (lib/mfa) antes de entregar la sesión. Hasta entonces falla CERRADO:
// sin el segundo factor este endpoint entregaría la sesión con solo la contraseña, así que solo abre con ALLOW_LOGIN_WITHOUT_MFA=true
// (desarrollo y simulado). Al portar lib/mfa se quita esa variable.
export async function POST(request: Request) {
  if (process.env.ALLOW_LOGIN_WITHOUT_MFA !== 'true') return jsonError(503, 'El acceso no está habilitado todavía.');
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
    await writeSession(data as GatewaySession);
    return Response.json({ user: (data as GatewaySession).user });
  } catch (err) {
    return gatewayErrorResponse(err);
  }
}
