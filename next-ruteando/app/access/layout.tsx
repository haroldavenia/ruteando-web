import type { ReactNode } from 'react';

import { AccessPitch } from '@/components/access/access-pitch';
import { Brand } from '@/components/ui/brand';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getT } from '@/lib/i18n/server';
import { getTheme } from '@/lib/theme-server';

/**
 * Marco de las pantallas de acceso, sin barra ni menú lateral. En pantallas estrechas, una tarjeta centrada con la marca y el contenido
 * sobre el fondo de marca; desde 1024px, la presentación del producto queda a la izquierda y el formulario ocupa la columna derecha. En el
 * DOM el formulario va primero (para el teclado y los lectores de pantalla); la columna izquierda se coloca con `grid-template-areas`,
 * no con `order`. Idioma y tema van arriba a la derecha del formulario.
 */
export default async function AccessLayout({ children }: { children: ReactNode }) {
  const t = await getT();
  const theme = await getTheme();
  return (
    <div className="grid min-h-dvh bg-route-glow access:grid-cols-2 access:[grid-template-areas:'art_panel']">
      <main className="flex flex-col items-center justify-center px-4 py-8 access:[grid-area:panel]">
        <div className="flex w-full max-w-110 flex-col gap-5 sm:rounded-card sm:border sm:border-outline-variant sm:bg-surface-container-low sm:p-8 sm:shadow-card access:border-0 access:bg-transparent access:p-0 access:shadow-none">
          <div className="flex flex-wrap justify-end gap-3">
            <LanguageToggle />
            <ThemeToggle initial={theme} />
          </div>
          <div>
            <Brand />
            <p className="mt-1 text-sm text-on-surface-variant">{t('Planifica y sigue tus rutas')}</p>
          </div>
          {children}
          <p className="mt-2 text-center text-xs text-on-surface-variant">
            © {new Date().getFullYear()} Ruteando by Hanoit, LLC
          </p>
        </div>
      </main>
      <aside className="hidden items-center justify-center bg-surface-container/60 p-10 access:flex access:[grid-area:art]">
        <AccessPitch />
      </aside>
    </div>
  );
}
