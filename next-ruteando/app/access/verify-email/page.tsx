import { VerifyEmail } from '@/components/access/verify-email';

/** El token del enlace lo lee el servidor y se pasa al formulario, que lo retira de la barra de direcciones al cargar. */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmail token={typeof token === 'string' && token ? token : null} />;
}
