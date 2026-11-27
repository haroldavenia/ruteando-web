import { LoginForm } from '@/components/access/login-form';

export default async function Access({ searchParams }: { searchParams: Promise<{ returnUrl?: string | string[] }> }) {
  const { returnUrl } = await searchParams;
  // Se pasa tal cual: se valida con `safeReturnUrl` justo al usarlo, que es lo que importa
  return <LoginForm returnUrl={typeof returnUrl === 'string' ? returnUrl : null} />;
}
