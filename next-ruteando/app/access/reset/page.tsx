import { ResetForm } from '@/components/access/reset-form';

/** El token del enlace lo lee el servidor y se pasa al formulario, que lo retira de la barra de direcciones al cargar. */
export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return <ResetForm token={typeof token === 'string' && token ? token : null} />;
}
