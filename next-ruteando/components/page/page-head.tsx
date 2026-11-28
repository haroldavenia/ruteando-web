import type { ReactNode } from 'react';

/**
 * Cabecera de una pantalla, como `app-page-header` de Angular: título `h1` (con resumen debajo, «12 vehículos») y, a la derecha, las
 * acciones (la principal, la última). En pantallas estrechas las acciones ocupan su fila, se reparten el ancho y la principal ocupa
 * una entera.
 */
export function PageHead({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="mt-1 mb-0 text-base text-on-surface-variant">{subtitle}</p> : null}
      </div>
      {children ? (
        <div className="flex flex-wrap gap-2 max-xs:flex-[1_1_100%] max-xs:*:flex-auto max-xs:[&>.bg-brand-gradient]:basis-full">
          {children}
        </div>
      ) : null}
    </header>
  );
}
