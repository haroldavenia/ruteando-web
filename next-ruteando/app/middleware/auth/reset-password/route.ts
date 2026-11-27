import { messageOnly, publicEndpoint } from '@/lib/public-endpoint';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Fija la contraseña nueva con el token del correo. No abre sesión (aunque el gateway devolviera una, `messageOnly` la descarta). */
export function POST(request: Request) {
  return publicEndpoint(request, {
    path: '/auth/reset-password',
    fields: { token: 500, newPassword: 200 },
    bucket: 'reset',
    ipMax: 10,
    onSuccess: messageOnly,
  });
}
