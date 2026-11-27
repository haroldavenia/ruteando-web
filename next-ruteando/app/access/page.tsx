import type { Metadata } from 'next';

import { LoginForm } from '@/components/access/login-form';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Iniciar sesión'),
    description: t('Planifica y sigue tus rutas'),
    alternates: { canonical: '/access' },
  };
}

export default async function Access({ searchParams }: { searchParams: Promise<{ returnUrl?: string | string[] }> }) {
  const { returnUrl } = await searchParams;
  // Se pasa tal cual: se valida con `safeReturnUrl` justo al usarlo, que es lo que importa
  return <LoginForm returnUrl={typeof returnUrl === 'string' ? returnUrl : null} />;
}
