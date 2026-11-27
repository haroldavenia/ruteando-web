import type { Metadata } from 'next';

import { RegisterForm } from '@/components/access/register-form';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Crea tu cuenta'), alternates: { canonical: '/access/register' } };
}

export default function Register() {
  return <RegisterForm />;
}
