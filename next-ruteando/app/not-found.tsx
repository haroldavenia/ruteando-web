import Link from 'next/link';

import { Brand } from '@/components/ui/brand';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { getT } from '@/lib/i18n/server';

/** 404 con el diseño de la aplicación (la de Next, sin estilos, no encaja con el resto). */
export default async function NotFound() {
  const t = await getT();
  return (
    <main className="grid min-h-dvh place-items-center bg-route-glow px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <Brand />
        <p className="font-brand text-6xl font-extrabold text-primary">404</p>
        <h1 className="font-brand text-[28px]/9 font-bold">{t('Página no encontrada')}</h1>
        <p className="text-on-surface-variant">{t('La dirección no existe o ya no está disponible.')}</p>
        <Link href="/" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}>
          {t('Volver al inicio')}
        </Link>
      </div>
    </main>
  );
}
