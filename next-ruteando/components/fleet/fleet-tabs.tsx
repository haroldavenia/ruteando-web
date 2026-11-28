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
    <nav aria-label={t('Flota')} className="flex gap-1 border-b border-outline-variant">
      {TABS.map((tab) => {
        const on = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex h-12 items-center border-b-[3px] px-4 text-sm font-semibold',
              on ? 'border-primary text-primary' : 'border-transparent text-on-surface hover:bg-on-surface/8'
            )}
          >
            {t(tab.label)}
          </Link>
        );
      })}
    </nav>
  );
}
