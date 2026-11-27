import { GENERIC_5XX, jsonError } from '@/lib/errors';
import { completeLogin, isSession, loginGate } from '@/lib/login-flow';
import { publicEndpoint } from '@/lib/public-endpoint';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Verificar el correo hace que el gateway entregue una SESIÓN: por eso pasa por la misma puerta y el mismo segundo factor que el login.
 * (En la app anterior el navegador llamaba a esta ruta directo por el proxy y se saltaba el 2FA.)
 */
export function POST(request: Request) {
  return publicEndpoint(request, {
    path: '/auth/verify-email',
    fields: { token: 500 },
    bucket: 'verify',
    ipMax: 20,
    guard: loginGate, // antes de gastar el token de un solo uso
    onSuccess: (data) => (isSession(data) ? completeLogin(data) : jsonError(502, GENERIC_5XX)),
  });
}
