import { publicEndpoint } from '@/lib/public-endpoint';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Crea la cuenta y su empresa. No abre sesión: eso ocurre al verificar el correo (y pasa por el segundo factor). */
export function POST(request: Request) {
  return publicEndpoint(request, {
    path: '/auth/register',
    fields: { email: 254, password: 200, firstName: 100, lastName: 100, tenantName: 150 },
    bucket: 'register',
    ipMax: 10,
    accountField: 'email',
    accountMax: 3,
    // Solo lo que la pantalla necesita; si el gateway devolviera tokens aquí no saldrían.
    onSuccess: (data) => Response.json({ user: data.user, tenant: data.tenant, message: data.message }),
  });
}
