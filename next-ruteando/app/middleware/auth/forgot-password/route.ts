import { messageOnly, publicEndpoint } from '@/lib/public-endpoint';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function POST(request: Request) {
  return publicEndpoint(request, {
    path: '/auth/forgot-password',
    fields: { email: 254 },
    bucket: 'forgot',
    ipMax: 10,
    // Por correo: sin esto cualquiera inundaría de mensajes a una persona
    accountField: 'email',
    accountMax: 3,
    onSuccess: messageOnly,
  });
}
