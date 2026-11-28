'use client';

import { RiMenuLine } from '@remixicon/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';
import { isActivePath, type NavItem } from '@/lib/nav-items';

/** Menú de las pantallas estrechas (bajo 960px, donde no hay riel): un panel lateral con todas las entradas, las secciones con su título. */
export function MobileMenu({ items }: { items: readonly NavItem[] }) {
  const t = useT();
  const pathname = usePathname();

  const link = (item: NavItem) => (
    <li key={item.link}>
      <SheetClose asChild>
        <Link
          href={item.link!}
          aria-current={isActivePath(pathname, item) ? 'page' : undefined}
          className={cn(
            'flex min-h-12 items-center gap-3 rounded-full px-4 text-sm font-medium transition-colors duration-120 ease-out hover:bg-on-surface/8',
            isActivePath(pathname, item) && 'bg-primary-container text-on-primary-container'
          )}
        >
          <Icon icon={item.icon} size={22} />
          {t(item.label)}
        </Link>
      </SheetClose>
    </li>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <IconButton label={t('Abrir menú de navegación')} icon={RiMenuLine} className="lg:hidden" />
      </SheetTrigger>
      <SheetContent title={t('Menú principal')}>
        <nav aria-label={t('Navegación principal')}>
          <ul className="flex flex-col gap-1">
            {items.map((item) =>
              item.children ? (
                <li key={item.label}>
                  <h3 className="px-4 pt-3 pb-1 text-xs font-medium text-on-surface-variant">{t(item.label)}</h3>
                  <ul className="flex flex-col gap-1">{item.children.map(link)}</ul>
                </li>
              ) : (
                link(item)
              )
            )}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
