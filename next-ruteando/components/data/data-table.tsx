'use client';

import {
  RiAlignJustify,
  RiErrorWarningLine,
  RiInboxLine,
  RiLayoutGridLine,
  RiMenuLine,
  RiSearchEyeLine,
  RiSearchLine,
  RiTableLine,
} from '@remixicon/react';
import Link from 'next/link';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';
import {
  chipsOf,
  type Column,
  type Facet,
  filterByFacet,
  paginate,
  scopeText,
  searchRows,
} from '@/lib/list/list-logic';
import type { FullList } from '@/lib/list/use-full-list';
import { useStoredPref } from '@/lib/stored-pref';

import { Pager } from './pager';

const DENSITY_KEY = 'ruteando-density';
const VIEW_KEY = 'ruteando-list-view';
const DENSITIES = ['comfortable', 'compact'] as const;
const VIEWS = ['table', 'cards'] as const;
const SKELETON_ROWS = [0, 1, 2, 3, 4];

export interface CardContext<T> {
  row: T;
  selectable: boolean;
  selected: boolean;
  toggle: () => void;
}

export interface DataTableProps<T> {
  list: FullList<T>;
  columns: readonly Column<T>[];
  /** Nombre del tipo de registro en plural, para los mensajes («vehículos»). */
  entityPlural: string;
  emptyMessage: string;
  searchPlaceholder?: string;
  pageSizeOptions?: readonly number[];
  /** Chips de estado con recuento. */
  facet?: Facet<T>;
  /** Casillas por fila y barra de acciones de la selección. */
  selectable?: boolean;
  /** Identifica una fila al seleccionarla; por defecto, su `id`. */
  rowKey?: (row: T) => string;
  /** Acciones de cada fila (botones de icono). */
  rowActions?: (row: T) => ReactNode;
  /** Acciones sobre las filas elegidas; `clear` quita la selección. */
  selectionActions?: (rows: readonly T[], clear: () => void) => ReactNode;
  /** Si se da, hay vista de tarjetas (la preferida por defecto) además de la tabla. */
  card?: (context: CardContext<T>) => ReactNode;
  /** Contenido que se muestra solo cuando la lista está vacía («Crear el primero»). */
  emptyAction?: ReactNode;
  /** Búsqueda y estado elegido controlados desde fuera (p. ej. guardados en la dirección). Sin ellos son estado propio. */
  filter?: string;
  onFilterChange?: (value: string) => void;
  facetKey?: string | null;
  onFacetChange?: (key: string | null) => void;
  /** Recibe lo que queda tras la búsqueda y el estado (todo, no solo la página), para un mapa que acompañe a la lista. */
  onFiltered?: (rows: readonly T[]) => void;
}

const defaultKey = (row: unknown) => String((row as { id?: unknown }).id ?? '');

/**
 * Tabla de un listado entero en el cliente: busca (con «/» para enfocar la búsqueda), cuenta por estado (chips), pagina, y muestra los
 * estados de carga (esqueleto), vacío, sin coincidencias y error (con «Reintentar»). Densidad cómoda o compacta y vista de tarjetas se
 * recuerdan. Bajo 840px de ancho de la tabla cada fila pasa a ser un bloque con su encabezado en cada dato: **ninguna tabla se desplaza en
 * horizontal**. Con `selectable`, casillas y una barra de acciones pegada al pie.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    list,
    columns,
    entityPlural,
    emptyMessage,
    pageSizeOptions = [10, 20, 50],
    facet,
    selectable = false,
    rowKey = defaultKey,
    rowActions,
    selectionActions,
    card,
    emptyAction,
    onFiltered,
  } = props;
  const t = useT();
  const searchRef = useRef<HTMLInputElement>(null);
  const [density, setDensity] = useStoredPref(DENSITY_KEY, DENSITIES, 'comfortable');
  const [preferredView, setView] = useStoredPref(VIEW_KEY, VIEWS, 'cards');
  const view = card ? preferredView : 'table';

  const [ownFilter, setOwnFilter] = useState('');
  const [ownFacet, setOwnFacet] = useState<string | null>(null);
  const filter = props.filter ?? ownFilter;
  const facetKey = props.facetKey !== undefined ? props.facetKey : ownFacet;
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(pageSizeOptions[0] ?? 10);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const searched = useMemo(() => searchRows(list.rows, columns, filter), [list.rows, columns, filter]);
  const filtered = useMemo(() => filterByFacet(searched, facet ?? null, facetKey), [searched, facet, facetKey]);
  const paged = paginate(filtered, page, size);
  const chips = facet && list.status === 'ready' ? chipsOf(searched, facet, facetKey, t('Todos')) : null;
  const stickyId = (columns.find((c) => c.primary) ?? columns[0])?.id;

  useEffect(() => {
    onFiltered?.(filtered);
  }, [filtered, onFiltered]);

  // «/» lleva el foco a la búsqueda, salvo que ya se esté escribiendo en un campo
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (searchRef.current) {
        event.preventDefault();
        searchRef.current.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const setFilter = (value: string) => {
    (props.onFilterChange ?? setOwnFilter)(value);
    setPage(0);
  };
  const pickFacet = (key: string | null) => {
    (props.onFacetChange ?? setOwnFacet)(key);
    setPage(0);
  };
  const clearFilter = () => {
    setFilter('');
    pickFacet(null);
  };

  const selectedRows = useMemo(
    () => (selected.size === 0 ? [] : list.rows.filter((row) => selected.has(rowKey(row)))),
    [selected, list.rows, rowKey]
  );
  const allVisible = paged.rows.length > 0 && paged.rows.every((row) => selected.has(rowKey(row)));
  const someVisible = !allVisible && paged.rows.some((row) => selected.has(rowKey(row)));
  const toggleRow = (row: T) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(rowKey(row))) next.add(rowKey(row));
      return next;
    });
  const toggleVisible = () =>
    setSelected((current) => {
      const next = new Set(current);
      for (const row of paged.rows) {
        if (allVisible) next.delete(rowKey(row));
        else next.add(rowKey(row));
      }
      return next;
    });
  const clearSelection = () => setSelected(new Set());
  const rowLabel = (row: T) => columns.find((c) => c.id === stickyId)?.cell(row) ?? '';

  const scope =
    list.status === 'ready'
      ? scopeText(
          {
            shown: filtered.length,
            loaded: list.rows.length,
            total: list.total,
            filtering: filter.trim() !== '' || facetKey !== null,
            plural: entityPlural,
          },
          t
        )
      : '';
  const placeholder = props.searchPlaceholder ?? t('Buscar');

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-card border border-outline-variant bg-surface-container-low shadow-card',
        density === 'compact' && '[--row-pad:6px]'
      )}
    >
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-52 flex-1">
          <Icon icon={RiSearchLine} className="pointer-events-none absolute top-3 left-3 text-on-surface-variant" />
          <input
            ref={searchRef}
            type="search"
            autoComplete="off"
            value={filter}
            placeholder={placeholder}
            aria-label={placeholder}
            onChange={(event) => setFilter(event.target.value)}
            className="h-11 w-full rounded-full border border-outline bg-surface pr-10 pl-11 text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
          />
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute top-3 right-3 rounded-sm border border-outline-variant px-1.5 font-mono text-xs text-on-surface-variant"
          >
            /
          </kbd>
        </div>
        {card ? (
          <Segmented
            label={t('Vista de la lista')}
            value={view}
            onChange={setView}
            options={[
              { value: 'cards', label: t('Ver como tarjetas'), icon: RiLayoutGridLine },
              { value: 'table', label: t('Ver como tabla'), icon: RiTableLine },
            ]}
          />
        ) : null}
        {view === 'table' ? (
          <Segmented
            label={t('Densidad de las filas')}
            value={density}
            onChange={setDensity}
            options={[
              { value: 'compact', label: t('Filas compactas'), icon: RiMenuLine },
              { value: 'comfortable', label: t('Filas cómodas'), icon: RiAlignJustify },
            ]}
          />
        ) : null}
      </div>

      {chips ? (
        <div role="group" aria-label={facet?.label} className="flex flex-wrap gap-2 px-3 pb-3">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              aria-pressed={chip.on}
              onClick={() => pickFacet(chip.key)}
              className={cn(
                'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm',
                chip.on
                  ? 'border-transparent bg-secondary-container text-on-secondary-container'
                  : 'border-outline text-on-surface-variant hover:bg-on-surface/8'
              )}
            >
              {chip.label} <b className="font-medium">{chip.count}</b>
            </button>
          ))}
        </div>
      ) : null}

      {scope ? (
        <p aria-live="polite" className="px-3 pb-2 text-sm text-on-surface-variant">
          {scope}
        </p>
      ) : null}

      {list.status === 'loading' ? (
        <Loading label={t('Cargando {0}…', [entityPlural])} className="grid gap-2 p-3">
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-11" />
          ))}
        </Loading>
      ) : null}

      {list.status === 'error' ? (
        <div role="alert" className="flex flex-col items-center gap-3 p-8 text-center text-on-error-container">
          <Icon icon={RiErrorWarningLine} size={32} />
          <span>{list.error}</span>
          <Button variant="outlined" onClick={list.reload}>
            {t('Reintentar')}
          </Button>
        </div>
      ) : null}

      {list.status === 'empty' ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center text-on-surface-variant">
          <Icon icon={RiInboxLine} size={32} />
          <p>{emptyMessage}</p>
          {emptyAction}
        </div>
      ) : null}

      {list.status === 'ready' ? (
        <>
          {view === 'cards' && card ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 p-3">
              {paged.rows.map((row) => (
                <div key={rowKey(row)}>
                  {card({
                    row,
                    selectable,
                    selected: selected.has(rowKey(row)),
                    toggle: () => toggleRow(row),
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="@container overflow-x-hidden">
              <table role="table" className="w-full border-collapse text-start">
                <thead role="rowgroup" className="@max-[840px]:sr-only">
                  <tr
                    role="row"
                    className="border-y border-outline-variant text-start font-mono text-xs tracking-wide text-on-surface-variant uppercase"
                  >
                    {selectable ? (
                      <th role="columnheader" className="w-12 px-3 py-2">
                        <Check
                          checked={allVisible}
                          indeterminate={someVisible}
                          label={t('Seleccionar las filas que se ven')}
                          onChange={toggleVisible}
                        />
                      </th>
                    ) : null}
                    {columns.map((column) => (
                      <th key={column.id} role="columnheader" className="px-3 py-2 text-start font-medium">
                        {column.header}
                      </th>
                    ))}
                    {rowActions ? (
                      <th role="columnheader" className="px-3 py-2">
                        <span className="sr-only">{t('Acciones')}</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {paged.rows.map((row) => (
                    <tr
                      key={rowKey(row)}
                      role="row"
                      data-selected={selected.has(rowKey(row)) || undefined}
                      className={cn(
                        'group border-b border-outline-variant last:border-b-0 hover:bg-on-surface/4 data-selected:bg-primary-container/40',
                        '@max-[840px]:block @max-[840px]:p-3'
                      )}
                    >
                      {selectable ? (
                        <td
                          role="cell"
                          className={cn('w-12 px-3 py-(--row-pad,12px)', '@max-[840px]:block @max-[840px]:px-0')}
                        >
                          <Check
                            checked={selected.has(rowKey(row))}
                            label={t('Seleccionar ') + rowLabel(row)}
                            onChange={() => toggleRow(row)}
                          />
                        </td>
                      ) : null}
                      {columns.map((column) => {
                        const text = column.cell(row);
                        return (
                          <td
                            key={column.id}
                            role="cell"
                            data-label={column.header}

                            className={cn(
                              'px-3 py-(--row-pad,12px) align-middle',
                              column.id === stickyId
                                ? '@max-[840px]:block @max-[840px]:px-0 @max-[840px]:text-base @max-[840px]:font-medium'
                                : '@max-[840px]:flex @max-[840px]:gap-2 @max-[840px]:px-0 @max-[840px]:py-1 @max-[840px]:before:w-32 @max-[840px]:before:flex-none @max-[840px]:before:text-xs @max-[840px]:before:text-on-surface-variant @max-[840px]:before:content-[attr(data-label)]',
                              text === '' && '@max-[840px]:hidden',
                              column.kind === 'id' && 'font-mono text-sm',
                              column.kind === 'strong' && 'font-medium',
                              column.kind === 'muted' && 'text-on-surface-variant'
                            )}
                          >
                            {column.swatch?.(row) ? (
                              <span
                                aria-hidden="true"
                                className="mr-2 inline-block size-3 rounded-full align-middle"
                                style={{ background: column.swatch(row)! }}
                              />
                            ) : null}
                            {column.link ? (
                              <Link href={column.link(row)} className="text-primary underline-offset-3 hover:underline">
                                {text}
                              </Link>
                            ) : column.tone ? (
                              <StatusBadge tone={column.tone(row)}>{text}</StatusBadge>
                            ) : (
                              text
                            )}
                          </td>
                        );
                      })}
                      {rowActions ? (
                        <td
                          role="cell"
                          className={cn(
                            'px-3 text-end whitespace-nowrap',
                            '@max-[840px]:block @max-[840px]:px-0 @max-[840px]:text-start'
                          )}
                        >
                          {rowActions(row)}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length === 0 ? (
            <div role="status" className="flex flex-col items-center gap-2 p-8 text-center text-on-surface-variant">
              <Icon icon={RiSearchEyeLine} size={32} />
              <p>{t('No hay resultados')}</p>
              <Button variant="text" onClick={clearFilter}>
                {t('Limpiar búsqueda')}
              </Button>
            </div>
          ) : null}

          <Pager
            index={paged.index}
            last={paged.last}
            size={size}
            length={filtered.length}
            sizes={pageSizeOptions}
            label={t('Paginación de ') + entityPlural}
            onPage={setPage}
            onSize={(value) => {
              setSize(value);
              setPage(0);
            }}
          />

          {selectable && selectedRows.length > 0 ? (
            <div
              role="region"
              aria-label={t('Acciones sobre la selección')}
              className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-outline-variant bg-secondary-container px-4 py-2 text-on-secondary-container"
            >
              <span aria-live="polite" className="font-medium">
                {selectedRows.length === 1 ? t('1 seleccionado') : t('{0} seleccionados', [selectedRows.length])}
              </span>
              {selectionActions?.(selectedRows, clearSelection)}
              <Button variant="text" onClick={clearSelection}>
                {t('Quitar la selección')}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function Segmented<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: V;
  onChange: (value: V) => void;
  options: { value: V; label: string; icon: Parameters<typeof Icon>[0]['icon'] }[];
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-full border border-outline p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          aria-label={option.label}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'grid size-9 cursor-pointer place-items-center rounded-full',
            value === option.value
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:bg-on-surface/8'
          )}
        >
          <Icon icon={option.icon} size={20} />
        </button>
      ))}
    </div>
  );
}

function Check({
  checked,
  indeterminate = false,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      aria-label={label}
      onChange={onChange}
      className="size-5 cursor-pointer accent-primary"
    />
  );
}
