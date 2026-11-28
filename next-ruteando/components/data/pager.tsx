'use client';

import { RiArrowDropDownFill, RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';

import { Icon } from '@/components/ui/icon';
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
      className="flex min-h-14 flex-wrap items-center justify-end gap-x-3 gap-y-1 border-t border-outline-variant px-2 text-xs text-on-surface-variant"
    >
      <label className="flex items-center gap-3">
        {t('Filas por página')}
        <span className="relative">
          <select
            value={size}
            onChange={(event) => onSize(Number(event.target.value))}
            className="h-10 min-w-20 appearance-none rounded-xl border border-outline bg-transparent pr-8 pl-3 text-sm text-on-surface"
          >
            {sizes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <Icon
            icon={RiArrowDropDownFill}
            size={24}
            className="pointer-events-none absolute top-2 right-1.5 text-on-surface-variant"
          />
        </span>
      </label>
      <span aria-live="polite">{rangeLabel(index, size, length, t)}</span>
      <span className="flex">
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
      </span>
    </nav>
  );
}
