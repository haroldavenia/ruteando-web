'use client';

import { RiAddLine, RiDeleteBinLine, RiDownloadLine, RiEdit2Line } from '@remixicon/react';
import Link from 'next/link';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { DataTable, type DataTableProps } from '@/components/data/data-table';
import { PageHead } from '@/components/page/page-head';
import { Button, buttonVariants } from '@/components/ui/button';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { IconLink } from '@/components/ui/icon-link';
import { useNotify } from '@/components/ui/toast';
import type { FailureMessages } from '@/lib/api-client';
import { csvFileName, downloadCsv } from '@/lib/csv';
import { useDelete } from '@/lib/hooks/use-delete';
import { useT } from '@/lib/i18n/client';
import type { Page } from '@/lib/list/fetch-all';
import type { Facet } from '@/lib/list/list-logic';
import { useFullList } from '@/lib/list/use-full-list';

export interface EntityListProps<T extends { id: string }> extends Pick<
  DataTableProps<T>,
  'columns' | 'card' | 'filter' | 'onFilterChange' | 'facetKey' | 'onFacetChange' | 'onFiltered'
> {
  /** Título de la pantalla (lo pinta la barra del marco; aquí solo bajo 1024px). */
  title: string;
  /** «vehículo» / «vehículos» (minúscula): para el resumen, los avisos y las confirmaciones. */
  singular: string;
  plural: string;
  /** «vehículos»: cómo se nombran en «Cargando …» y en la paginación. */
  fetchPage: (page: number, size: number) => Promise<Page<T>>;
  /** Chips de estado; con una función se calculan sobre las filas cargadas (tipos que solo se conocen al traerlas). */
  facet?: Facet<T> | ((rows: readonly T[]) => Facet<T>);
  /** Pestañas, filtros u otro contenido bajo la cabecera. */
  above?: ReactNode;
  /** Contenido a un lado de la tabla (un mapa): fijo en una columna desde 1100px y encima de la tabla por debajo. Recibe lo cargado y lo filtrado. */
  aside?: (context: { rows: readonly T[]; filtered: readonly T[]; reload: () => void }) => ReactNode;
  newHref?: string;
  newLabel?: string;
  emptyMessage: string;
  emptyActionLabel?: string;
  searchPlaceholder: string;
  /** Cómo se nombra una fila en avisos y etiquetas. */
  rowLabel: (row: T) => string;
  editHref?: (row: T) => string;
  editLabel?: (row: T) => string;
  remove?: (row: T, messages?: FailureMessages) => Promise<unknown>;
  byStatus?: FailureMessages;
  /** «vehiculos»: nombre del CSV; con `csv` hay botones de exportar. */
  fileBase?: string;
  csv?: (rows: readonly T[]) => string;
  /** Acciones de fila extra (antes de editar y borrar). */
  extraActions?: (row: T) => ReactNode;
  /** Acciones extra sobre la cabecera (antes de «Nuevo»). */
  headActions?: ReactNode;
  /** Acciones extra sobre las filas elegidas (antes de «Eliminar»); `clear` quita la selección. */
  selectionExtra?: (rows: readonly T[], clear: () => void) => ReactNode;
  /** Con `true` hay casillas aunque no se pueda borrar ni exportar (las acciones de la selección son solo las extra). */
  selectable?: boolean;
  /** Más botones en el estado vacío, junto a «Crear el primero». */
  emptyExtra?: ReactNode;
  /** Lo que se exporta con «Exportar CSV» de la cabecera y de la selección: por defecto, las filas. */
  /** Contenido bajo la tabla (un mapa que acompaña a la lista). */
  below?: ReactNode;
}

/**
 * Pantalla de listado con el patrón de la aplicación: cabecera con el recuento, «Exportar CSV» y «Nuevo», tabla con búsqueda, chips,
 * selección y borrado (uno o en lote, con una confirmación), y los avisos de lo ocurrido sobre la tabla.
 */
export function EntityList<T extends { id: string }>(props: EntityListProps<T>) {
  const t = useT();
  const notify = useNotify();
  const list = useFullList(props.fetchPage);
  const [filtered, setFiltered] = useState<readonly T[]>([]);
  const { onFiltered } = props;
  const track = useCallback(
    (rows: readonly T[]) => {
      // Solo si cambió lo filtrado: una lista nueva con las mismas filas no debe volver a pintar (ni a avisar) en bucle
      setFiltered((current) =>
        current.length === rows.length && current.every((row, index) => row === rows[index]) ? current : rows
      );
      onFiltered?.(rows);
    },
    [onFiltered]
  );
  const facetProp = props.facet;
  const facet = useMemo(
    () => (typeof facetProp === 'function' ? facetProp(list.rows) : facetProp),
    [facetProp, list.rows]
  );

  const remover = props.remove;
  const deleter = useDelete<T>({
    singular: props.singular,
    plural: props.plural,
    label: props.rowLabel,
    remove: remover ?? (async () => undefined),
    reload: list.reload,
    byStatus: props.byStatus,
  });

  function exportRows(rows: readonly T[]) {
    if (!props.csv || !props.fileBase) return;
    const fileName = csvFileName(props.fileBase);
    downloadCsv(fileName, props.csv(rows));
    notify(
      rows.length === 1
        ? t('Se exportó 1 {0} a {1}', [props.singular, fileName])
        : t('Se exportaron {0} {1} a {2}', [rows.length, props.plural, fileName])
    );
  }

  const total = list.total;
  const subtitle = list.status === 'ready' ? `${total} ${total === 1 ? props.singular : props.plural}` : undefined;
  const canExport = !!props.csv;
  const canDelete = !!remover;
  const selectable = canDelete || canExport || !!props.selectionExtra || !!props.selectable;

  return (
    <>
      <PageHead title={props.title} subtitle={subtitle}>
        {canExport ? (
          <Button variant="outlined" disabled={total === 0} onClick={() => exportRows(filtered)}>
            <Icon icon={RiDownloadLine} size={20} />
            {t('Exportar CSV')}
          </Button>
        ) : null}
        {props.headActions}
        {props.newHref ? (
          <Link href={props.newHref} className={buttonVariants({ variant: 'primary' })}>
            <Icon icon={RiAddLine} size={20} />
            {props.newLabel}
          </Link>
        ) : null}
      </PageHead>
      {props.above}
      <div className="mb-3 empty:hidden">
        <FormResult error={deleter.error} />
      </div>
      <div
        className={
          props.aside && list.rows.length > 0
            ? 'grid items-start gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'
            : undefined
        }
      >
        {props.aside && list.rows.length > 0 ? (
          <div className="xl:sticky xl:top-4">{props.aside({ rows: list.rows, filtered, reload: list.reload })}</div>
        ) : null}
        <DataTable
          list={list}
          columns={props.columns}
          entityPlural={props.plural}
          emptyMessage={props.emptyMessage}
          searchPlaceholder={props.searchPlaceholder}
          facet={facet}
          card={props.card}
          selectable={selectable}
          filter={props.filter}
          onFilterChange={props.onFilterChange}
          facetKey={props.facetKey}
          onFacetChange={props.onFacetChange}
          onFiltered={track}
          emptyAction={
            props.newHref && props.emptyActionLabel ? (
              <Link href={props.newHref} className={buttonVariants({ variant: 'outlined' })}>
                {props.emptyActionLabel}
              </Link>
            ) : undefined
          }
          rowActions={(row) => (
            <>
              {props.extraActions?.(row)}
              {props.editHref ? (
                <IconLink
                  href={props.editHref(row)}
                  icon={RiEdit2Line}
                  label={props.editLabel?.(row) ?? t('Editar') + ' ' + props.rowLabel(row)}
                />
              ) : null}
              {canDelete ? (
                <IconButton
                  icon={RiDeleteBinLine}
                  label={t('Eliminar') + ' ' + props.rowLabel(row)}
                  onClick={() => void deleter.one(row)}
                />
              ) : null}
            </>
          )}
          selectionActions={(rows, clear) => (
            <>
              {canDelete ? (
                <Button variant="text" onClick={() => void deleter.many(rows, clear)}>
                  <Icon icon={RiDeleteBinLine} size={20} />
                  {t('Eliminar')}
                </Button>
              ) : null}
              {canExport ? (
                <Button variant="text" onClick={() => exportRows(rows)}>
                  <Icon icon={RiDownloadLine} size={20} />
                  {t('Exportar')}
                </Button>
              ) : null}
            </>
          )}
        />
      </div>
      {props.below}
      {deleter.dialog}
    </>
  );
}
