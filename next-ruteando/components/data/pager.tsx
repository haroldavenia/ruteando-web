'use client';

import { RiArrowLeftSLine, RiArrowRightSLine, RiSkipBackMiniLine, RiSkipForwardMiniLine } from '@remixicon/react';

import { IconButton } from '@/components/ui/icon-button';
import { useT } from '@/lib/i18n/client';
import { rangeLabel } from '@/lib/list/list-logic';

/** Paginación de un listado en memoria: filas por página, rango visible y primera, anterior, siguiente y última. */
export function Pager({
  index,
  last,
  size,
  length,
  sizes,
  label,
  onPage,
  onSize,
}: {
  index: number;
  last: number;
  size: number;
  length: number;
  sizes: readonly number[];
  /** Nombre accesible de la paginación («Paginación de vehículos»). */
  label: string;
  onPage: (index: number) => void;
  onSize: (size: number) => void;
}) {
  const t = useT();
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 border-t border-outline-variant px-3 py-1 text-sm text-on-surface-variant"
    >
      <label className="flex items-center gap-2">
        {t('Filas por página')}
        <select
          value={size}
          onChange={(event) => onSize(Number(event.target.value))}
          className="h-9 rounded-control border border-outline bg-surface px-2 text-on-surface"
        >
          {sizes.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <span aria-live="polite">{rangeLabel(index, size, length, t)}</span>
      <span className="flex">
        <IconButton
          label={t('Primera página')}
          icon={RiSkipBackMiniLine}
          disabled={index === 0}
          onClick={() => onPage(0)}
        />
        <IconButton
          label={t('Página anterior')}
          icon={RiArrowLeftSLine}
          disabled={index === 0}
          onClick={() => onPage(index - 1)}
        />
        <IconButton
          label={t('Página siguiente')}
          icon={RiArrowRightSLine}
          disabled={index >= last}
          onClick={() => onPage(index + 1)}
        />
        <IconButton
          label={t('Última página')}
          icon={RiSkipForwardMiniLine}
          disabled={index >= last}
          onClick={() => onPage(last)}
        />
      </span>
    </nav>
  );
}
