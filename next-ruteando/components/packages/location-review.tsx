'use client';

import { RiDeleteBinLine, RiDownloadLine, RiMapPinLine } from '@remixicon/react';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/data/data-table';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { downloadCsv } from '@/lib/csv';
import { useFormat } from '@/lib/hooks/use-format';
import { useT } from '@/lib/i18n/client';
import type { Column, Facet } from '@/lib/list/list-logic';
import { localList } from '@/lib/list/local-list';
import { fromGeoJsonPoint } from '@/lib/map/lat-lng';
import { geocodingStatusLabel } from '@/lib/packages/labels';
import {
  importableRows,
  needsLocating,
  REVIEW_FILE_NAME,
  reviewCounts,
  reviewCsv,
  type ReviewRow,
} from '@/lib/packages/locating';
import { statusTone } from '@/lib/status-tone';

import { LocationFixDialog } from './location-fix-dialog';

/**
 * Revisión de las ubicaciones de las filas del archivo antes de crear los paquetes: las filas con su estado (ubicada, aproximada, manual
 * o no ubicada), corregir una colocándola en el mapa o cambiando su dirección, quitar las que sobran y descargar el resultado. Las que no
 * tienen ubicación no se importan.
 */
export function LocationReview({
  rows,
  onChange,
  onConfirm,
  onRetry,
}: {
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
  onConfirm: () => void;
  onRetry: () => void;
}) {
  const t = useT();
  const format = useFormat();
  const [fixing, setFixing] = useState<ReviewRow | null>(null);
  const counts = reviewCounts(rows);
  const importCount = importableRows(rows).length;
  const skipped = rows.filter(needsLocating).length;
  const list = useMemo(() => localList(rows), [rows]);

  const columns = useMemo<Column<ReviewRow>[]>(
    () => [
      { id: 'line', header: t('Línea'), cell: (row) => String(row.line), kind: 'id', primary: true },
      { id: 'address', header: t('Dirección'), cell: (row) => row.input.address, kind: 'strong' },
      { id: 'city', header: t('Ciudad'), cell: (row) => row.input.city ?? '', kind: 'muted' },
      {
        id: 'standardized',
        header: t('Dirección estandarizada'),
        cell: (row) => row.standardizedAddress ?? '',
        kind: 'muted',
      },
      {
        id: 'location',
        header: t('Latitud / longitud'),
        cell: (row) => (row.input.location ? format.latLng(fromGeoJsonPoint(row.input.location.coordinates)) : ''),
        kind: 'muted',
      },
      {
        id: 'status',
        header: t('Estado'),
        cell: (row) => (row.failed ? t('Sin respuesta del servicio') : geocodingStatusLabel(row.status, t)),
        tone: (row) => (row.failed ? 'warning' : statusTone('geocoding', row.status)),
      },
    ],
    [t, format]
  );
  const facet = useMemo<Facet<ReviewRow>>(
    () => ({
      label: t('Estado'),
      of: (row) => row.status,
      options: [
        { key: 'match', label: t('Ubicadas') },
        { key: 'mean', label: t('Aproximadas') },
        { key: 'manual', label: t('Manuales') },
        { key: 'unmatch', label: t('No ubicadas') },
      ],
    }),
    [t]
  );
  const remove = (lines: readonly number[]) => onChange(rows.filter((r) => !lines.includes(r.line)));

  return (
    <div className="flex flex-col gap-3">
      <p role="status" aria-live="polite">
        {t('{0} filas: {1} ubicadas, {2} aproximadas, {3} manuales y {4} sin ubicar.', [
          counts.all,
          counts.match,
          counts.mean,
          counts.manual,
          counts.unmatch,
        ])}
      </p>
      {counts.mean > 0 ? (
        <p className="text-sm text-on-surface-variant">
          {t('Las aproximadas pueden estar en otro punto: revísalas en el mapa antes de importar.')}
        </p>
      ) : null}
      {counts.failed > 0 ? (
        <p role="alert" className="text-sm text-on-warning-container">
          {t(
            'No se pudo consultar el servicio de ubicación para {0} filas. Vuelve a intentarlo o colócalas en el mapa.',
            [counts.failed]
          )}{' '}
          <Button variant="text" onClick={onRetry}>
            {t('Volver a intentarlo')}
          </Button>
        </p>
      ) : null}

      <DataTable<ReviewRow>
        list={list}
        columns={columns}
        facet={facet}
        selectable
        rowKey={(row) => String(row.line)}
        entityPlural={t('filas')}
        emptyMessage={t('No quedan filas por importar')}
        searchPlaceholder={t('Buscar por dirección o ciudad')}
        rowActions={(row) => (
          <>
            <IconButton
              icon={RiMapPinLine}
              label={t('Corregir la ubicación de la línea ') + row.line}
              onClick={() => setFixing(row)}
            />
            <IconButton
              icon={RiDeleteBinLine}
              label={t('Quitar de la importación la línea ') + row.line}
              onClick={() => remove([row.line])}
            />
          </>
        )}
        selectionActions={(selected, clear) => (
          <Button
            variant="text"
            onClick={() => {
              remove(selected.map((r) => r.line));
              clear();
            }}
          >
            <Icon icon={RiDeleteBinLine} size={20} />
            {t('Quitar de la importación')}
          </Button>
        )}
      />

      {skipped > 0 ? (
        <p role="status" className="text-sm text-on-surface-variant">
          {t('{0} filas sin ubicación no se importarán. Corrígelas o quítalas.', [skipped])}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={importCount === 0} onClick={onConfirm}>
          {t('Importar {0} paquetes', [importCount])}
        </Button>
        <Button variant="outlined" onClick={() => downloadCsv(REVIEW_FILE_NAME, reviewCsv(rows))}>
          <Icon icon={RiDownloadLine} size={20} />
          {t('Descargar CSV con las ubicaciones')}
        </Button>
      </div>

      {fixing ? (
        <LocationFixDialog
          key={fixing.line}
          row={fixing}
          onClose={() => setFixing(null)}
          onSave={(updated) => {
            onChange(rows.map((r) => (r.line === updated.line ? updated : r)));
            setFixing(null);
          }}
        />
      ) : null}
    </div>
  );
}
