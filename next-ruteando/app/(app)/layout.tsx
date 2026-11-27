import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { Shell } from '@/components/shell/shell';
import { readSession } from '@/lib/session';
import { getTheme } from '@/lib/theme-server';

/**
 * Área privada. `proxy.ts` ya lleva a /access a quien no tiene sesión, pero la comprobación de verdad es ESTA, en el servidor y con la
 * firma de `rt_user`: un proxy no sustituye a la comprobación de cada página que muestra datos. Los datos se piden después con el token
 * (`ensureAccess`), que se renueva solo.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await readSession();
  if (!user) redirect('/access');
  return (
    <Shell user={user} theme={await getTheme()}>
      {children}
    </Shell>
  );
}
