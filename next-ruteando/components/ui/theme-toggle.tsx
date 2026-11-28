'use client';

import { RiMoonLine, RiSunLine } from '@remixicon/react';
import { type ReactNode, useState } from 'react';

import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';
import { applyTheme } from '@/lib/prefs-client';
import type { Theme } from '@/lib/theme';

import { Icon } from './icon';

/** «Tema del sistema»: un sol con una A (el `brightness_auto` de Material, que Remix Icon no trae). Decorativo: el botón lleva su nombre. */
function AutoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 2.5 14.6 5.4H18.6V9.4L21.5 12 18.6 14.6V18.6H14.6L12 21.5 9.4 18.6H5.4V14.6L2.5 12 5.4 9.4V5.4H9.4Z"
        strokeLinejoin="round"
      />
      <path d="M9.6 15.2 12 8.6l2.4 6.6M10.4 13.2h3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const OPTIONS: { value: Theme; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'Tema del sistema', icon: <AutoIcon /> },
  { value: 'light', label: 'Tema claro', icon: <Icon icon={RiSunLine} size={20} /> },
  { value: 'dark', label: 'Tema oscuro', icon: <Icon icon={RiMoonLine} size={20} /> },
];

/**
 * Selector de tema: tres botones de icono seguidos de 44px (Sistema, Claro y Oscuro) donde se ve de un vistazo cuál está elegido. `initial`
 * es la cookie que leyó el servidor, así que la primera pintura ya coincide. Al elegir se guarda la cookie y se cambia `data-theme` en el
 * momento (no hace falta pedir nada al servidor).
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
      className={cn(
        'inline-flex overflow-hidden rounded-full bg-surface-container outline -outline-offset-1 outline-outline-variant',
        className
      )}
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
              'inline-grid size-11 cursor-pointer place-items-center transition-colors duration-120 ease-out',
              active
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-on-surface/8'
            )}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
