import type { ReactNode } from 'react';

/**
 * Cabecera de una pantalla: título (en pantallas anchas lo pinta la barra del marco, así que aquí solo se ve bajo 1024px), resumen
 * («12 vehículos») y las acciones, la principal la última.
 */
export function PageHead({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-brand text-xl font-bold lg:hidden">{title}</h1>
        {subtitle ? <p className="text-sm text-on-surface-variant">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}
