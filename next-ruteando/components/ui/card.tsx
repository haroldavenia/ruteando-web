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

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn('font-brand text-[22px]/7 font-bold', className)} {...props} />;
}
