'use client';

import Link from 'next/link';

import { Brand } from '@/components/ui/brand';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';

/**
 * Error inesperado al pintar una pantalla. No muestra el mensaje ni la traza (en producción Next ya los oculta; aquí tampoco se
 * enseñarían): «Reintentar» vuelve a pintar el segmento y «Volver al inicio» sale de él.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <main className="grid min-h-dvh place-items-center bg-route-glow px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <Brand />
        <h1 className="font-brand text-[28px]/9 font-bold">{t('Algo salió mal')}</h1>
        <p className="text-on-surface-variant">{t('No se pudo mostrar esta pantalla. Puedes intentarlo de nuevo.')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="primary" size="lg" onClick={reset}>
            {t('Reintentar')}
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: 'outlined', size: 'lg' }))}>
            {t('Volver al inicio')}
          </Link>
        </div>
      </div>
    </main>
  );
}
