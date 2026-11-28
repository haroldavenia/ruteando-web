import type { Metadata } from 'next';

import { Brand } from '@/components/ui/brand';
import { getT } from '@/lib/i18n/server';

export const metadata: Metadata = { title: 'Ruteando', robots: { index: false, follow: false } };

/**
 * Lo que muestra el service worker cuando no hay conexión y la persona abre una página. No lleva datos ni sesión: se guarda en la
 * instalación del worker y se sirve tal cual.
 */
export default async function OfflinePage() {
  const t = await getT();
  return (
    <main className="grid min-h-dvh place-items-center bg-route-glow px-4">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-card border border-outline-variant bg-surface-container-low p-8 text-center shadow-card">
        <Brand />
        <h1 className="font-brand text-2xl font-bold">{t('Sin conexión')}</h1>
        <p className="text-on-surface-variant">
          {t(
            'No hay conexión a internet. Los datos y la sesión siempre se piden en línea: vuelve a intentarlo cuando se restablezca.'
          )}
        </p>
      </div>
    </main>
  );
}
