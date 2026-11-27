'use client';

import type { RefObject } from 'react';

import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';

/**
 * Marco del mapa: región con nombre accesible y, si el mapa o sus teselas no cargan, el aviso. En el servidor es un hueco del mismo
 * tamaño. El mapa no se puede operar con teclado: quien lo use debe ofrecer también campos o una tabla equivalente.
 */
export function MapFrame({
  hostRef,
  ariaLabel,
  failed,
  className,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  ariaLabel?: string;
  failed: boolean;
  /** Alto del mapa (por defecto 320px). */
  className?: string;
}) {
  const t = useT();
  return (
    <div>
      <div
        ref={hostRef}
        role="region"
        aria-label={ariaLabel ?? t('Mapa')}
        className={cn('h-80 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container', className)}
      />
      {failed ? (
        <p role="alert" className="mt-2 text-error">
          {t('No se pudo cargar el mapa. Puedes seguir usando los campos de coordenadas.')}
        </p>
      ) : null}
    </div>
  );
}
