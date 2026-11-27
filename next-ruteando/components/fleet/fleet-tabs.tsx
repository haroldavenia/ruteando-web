'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';

const TABS = [
  { href: '/fleet/vehicles', label: 'Vehículos' },
  { href: '/fleet/types', label: 'Tipos de vehículo' },
  { href: '/fleet/drivers', label: 'Conductores' },
] as const;

/** Pestañas entre los tres listados de flota. */
export function FleetTabs() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav aria-label={t('Flota')} className="mb-4 flex gap-1 border-b border-outline-variant">
      {TABS.map((tab) => {
        const on = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'border-b-2 px-4 py-2.5 text-sm font-medium',
              on ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            )}
          >
            {t(tab.label)}
          </Link>
        );
      })}
    </nav>
  );
}
