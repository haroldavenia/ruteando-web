'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { Brand } from '@/components/ui/brand';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useT } from '@/lib/i18n/client';
import { navItemsFor, pageTitleKey, quickActionsFor } from '@/lib/nav-items';
import type { SessionUser } from '@/lib/session-token';
import type { Theme } from '@/lib/theme';

import { GlobalSearch } from './global-search';
import { MobileMenu } from './mobile-menu';
import { NavRail } from './nav-rail';
import { UserMenu } from './user-menu';

/**
 * Marco del área privada. Desde 960px: riel de iconos fijo y, en la barra, el título de la pantalla y la búsqueda; por debajo, la marca
 * compacta y el menú lateral. La barra mide 68px (56px en móvil). El enlace «Saltar al contenido» es lo primero que alcanza el teclado.
 * El menú se calcula con el rol que firmó el servidor, pero es solo una comodidad: la seguridad la dan cada página y el gateway.
 */
export function Shell({ user, theme, children }: { user: SessionUser; theme: Theme; children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const items = navItemsFor(user.role);
  const title = pageTitleKey(pathname, items);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-control bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('Saltar al contenido')}
      </a>
      <NavRail items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-outline-variant bg-surface px-4 lg:h-17 lg:px-6">
          <MobileMenu items={items} />
          <Link href="/" className="rounded-lg lg:hidden">
            <Brand size="compact" />
          </Link>
          <h1 className="hidden font-brand text-xl font-bold lg:block">{title ? t(title) : ''}</h1>
          <div className="hidden flex-1 lg:block">
            <GlobalSearch items={items} actions={quickActionsFor(user.role)} />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <LanguageToggle className="hidden sm:inline-flex" />
            <ThemeToggle initial={theme} />
            <UserMenu user={user} />
          </div>
        </header>
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-300 flex-1 p-4 outline-none sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
