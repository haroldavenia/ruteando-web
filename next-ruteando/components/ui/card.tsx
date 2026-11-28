import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

/** Tarjeta de la guía de diseño: relleno 20/24, borde 1px `outline-variant`, fondo `surface-container-low` y esquina de 20px. */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-card border border-outline-variant bg-surface-container-low px-6 py-5 shadow-card',
        className
      )}
      {...props}
    />
  );
}

/**
 * Título de una tarjeta. Por defecto el `h2` de página de Angular (22px, Manrope 700); con `compact` el `.card-title` (16px, Roboto 500, con
 * 12px debajo), el de Perfil, Seguridad, el SSO y el mapa de lugares.
 */
export function CardTitle({ className, compact = false, ...props }: ComponentProps<'h2'> & { compact?: boolean }) {
  return (
    <h2
      className={cn(
        compact ? 'm-0 mb-3 font-sans text-base/6 font-medium' : 'font-brand text-[22px]/7 font-bold',
        className
      )}
      {...props}
    />
  );
}
