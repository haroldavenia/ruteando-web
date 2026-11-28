import { GENERIC_5XX, jsonError } from '@/lib/errors';
import { completeLogin, isSession, loginGate } from '@/lib/login-flow';
import { publicEndpoint } from '@/lib/public-endpoint';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function POST(request: Request) {
  return publicEndpoint(request, {
    path: '/auth/login',
    fields: { email: 254, password: 200 },
    bucket: 'login',
    ipMax: 20,
    // Además del límite por IP (que se reparte entre muchas), uno por cuenta contra el adivinado de contraseñas.
    accountField: 'email',
    accountMax: 10,
    guard: loginGate,
    // Segundo factor: la sesión se retiene en el servidor y no se escribe en cookies hasta superarlo (ver login-flow.ts).
    onSuccess: (data) => (isSession(data) ? completeLogin(data) : jsonError(502, GENERIC_5XX)),
  });
}
