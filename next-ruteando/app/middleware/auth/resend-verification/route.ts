import { messageOnly, publicEndpoint } from '@/lib/public-endpoint';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function POST(request: Request) {
  return publicEndpoint(request, {
    path: '/auth/resend-verification',
    fields: { email: 254 },
    bucket: 'resend',
    ipMax: 10,
    accountField: 'email',
    accountMax: 3,
    onSuccess: messageOnly,
  });
}
