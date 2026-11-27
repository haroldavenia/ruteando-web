'use client';

import { type RemixiconComponentType, RiContrast2Line, RiMoonLine, RiSunLine } from '@remixicon/react';
import { useState } from 'react';

import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';
import { applyTheme } from '@/lib/prefs-client';
import type { Theme } from '@/lib/theme';

import { Icon } from './icon';

const OPTIONS: { value: Theme; label: string; icon: RemixiconComponentType }[] = [
  { value: 'light', label: 'Tema claro', icon: RiSunLine },
  { value: 'system', label: 'Tema del sistema', icon: RiContrast2Line },
  { value: 'dark', label: 'Tema oscuro', icon: RiMoonLine },
];

/**
 * Selector de tema: tres botones seguidos (Claro, Sistema, Oscuro) para ver cuál está activo sin abrir un menú. `initial` es la cookie
 * que leyó el servidor, así que la primera pintura ya coincide. Al elegir se guarda la cookie y se cambia `data-theme` en el momento
 * (no hace falta pedir nada al servidor).
 */
export function ThemeToggle({ initial, className }: { initial: Theme; className?: string }) {
  const t = useT();
  const [theme, setTheme] = useState(initial);

  function choose(value: Theme) {
    setTheme(value);
    applyTheme(value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('Tema de color')}
      className={cn('inline-flex rounded-full border border-outline-variant bg-surface p-0.5', className)}
    >
      {OPTIONS.map(({ value, label, icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={t(label)}
            aria-label={t(label)}
            onClick={() => choose(value)}
            className={cn(
              'inline-grid size-10 cursor-pointer place-items-center rounded-full transition-colors duration-120 ease-out',
              active
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-on-surface/8'
            )}
          >
            <Icon icon={icon} size={20} />
          </button>
        );
      })}
    </div>
  );
}
