import type { ReactNode } from 'react';

import { AccessArt } from '@/components/access/access-art';
import { AccessPitch } from '@/components/access/access-pitch';
import { AccessSteps } from '@/components/access/access-steps';
import { LegalLinks } from '@/components/legal/legal-links';
import { Brand } from '@/components/ui/brand';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { RouteBackdrop } from '@/components/ui/route-backdrop';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getT } from '@/lib/i18n/server';
import { getTheme } from '@/lib/theme-server';

/**
 * Marco de las pantallas de acceso, sin barra ni menú lateral. En pantallas estrechas, una tarjeta de cristal centrada sobre la ilustración
 * de rutas, que ocupa toda la ventana; desde 1024px, la ilustración con su presentación queda a la izquierda, fija, y el formulario ocupa
 * la columna derecha a pantalla completa (440px como mínimo, 34rem como máximo). En el DOM el formulario va primero (para el teclado y los
 * lectores de pantalla); la columna izquierda se coloca con `grid-template-areas`, no con `order`. Idioma y tema van arriba del formulario:
 * el de idioma a la izquierda y el de tema a la derecha.
 */
export default async function AccessLayout({ children }: { children: ReactNode }) {
  const t = await getT();
  const theme = await getTheme();
  return (
    <main className="relative grid min-h-dvh place-items-center bg-surface-container-low px-4 py-6 text-on-surface access:grid-cols-[minmax(0,1fr)_minmax(440px,34rem)] access:place-items-stretch access:bg-surface access:p-0 access:[grid-template-areas:'art_panel']">
      <section className="relative z-10 w-full max-w-110 min-w-0 rounded-[28px] border border-outline-variant bg-surface/80 px-5 py-6 shadow-[0_8px_32px_rgb(0_0_0/0.14),0_2px_6px_rgb(0_0_0/0.08)] backdrop-blur-[14px] backdrop-saturate-[1.2] [--field-bg:var(--color-surface)] xs:px-7 xs:py-8 access:flex access:min-h-dvh access:max-w-none access:items-center access:justify-center access:rounded-none access:border-0 access:border-s access:bg-surface access:px-[clamp(32px,4vw,64px)] access:py-8 access:shadow-none access:backdrop-blur-none access:[grid-area:panel]">
        <div className="w-full access:max-w-100">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <LanguageToggle />
            <ThemeToggle initial={theme} />
          </div>
          <Brand className="access:mb-8" />
          <p className="mt-2 mb-6 text-sm text-on-surface-variant access:hidden">{t('Planifica y sigue tus rutas')}</p>
          {children}
          <div className="mt-7 border-t border-outline-variant pt-2">
            <LegalLinks />
          </div>
        </div>
      </section>
      <div className="absolute inset-0 z-0 access:sticky access:top-0 access:flex access:h-dvh access:items-end access:self-start access:overflow-hidden access:p-[clamp(24px,4vw,56px)] access:[grid-area:art]">
        <RouteBackdrop align="start" />
        <AccessArt pitch={<AccessPitch />} steps={<AccessSteps />} />
      </div>
    </main>
  );
}
