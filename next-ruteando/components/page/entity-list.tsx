'use client';

import { RiAddLine, RiDeleteBinLine, RiDownloadLine, RiEdit2Line } from '@remixicon/react';
import Link from 'next/link';
import { type ReactNode, useCallback, useRef } from 'react';

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
import { useFullList } from '@/lib/list/use-full-list';

export interface EntityListProps<T extends { id: string }> extends Pick<
  DataTableProps<T>,
  'columns' | 'facet' | 'card' | 'filter' | 'onFilterChange' | 'facetKey' | 'onFacetChange' | 'onFiltered'
> {
  /** Título de la pantalla (lo pinta la barra del marco; aquí solo bajo 1024px). */
  title: string;
  /** «vehículo» / «vehículos» (minúscula): para el resumen, los avisos y las confirmaciones. */
  singular: string;
  plural: string;
  /** «vehículos»: cómo se nombran en «Cargando …» y en la paginación. */
  fetchPage: (page: number, size: number) => Promise<Page<T>>;
  /** Pestañas, filtros u otro contenido bajo la cabecera. */
  above?: ReactNode;
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
  /** Acciones extra sobre la cabecera (junto a «Nuevo»). */
  headActions?: ReactNode;
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
  const filteredRef = useRef<readonly T[]>([]);
  const { onFiltered } = props;
  const track = useCallback(
    (rows: readonly T[]) => {
      filteredRef.current = rows;
      onFiltered?.(rows);
    },
    [onFiltered]
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

  return (
    <>
      <PageHead title={props.title} subtitle={subtitle}>
        {canExport ? (
          <Button variant="outlined" disabled={total === 0} onClick={() => exportRows(filteredRef.current)}>
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
      <DataTable
        list={list}
        columns={props.columns}
        entityPlural={props.plural}
        emptyMessage={props.emptyMessage}
        searchPlaceholder={props.searchPlaceholder}
        facet={props.facet}
        card={props.card}
        selectable={canDelete || canExport}
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
      {props.below}
      {deleter.dialog}
    </>
  );
}
