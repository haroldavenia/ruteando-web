'use client';

import { useEffect, useMemo } from 'react';

import { DataTable } from '@/components/data/data-table';
import { Button } from '@/components/ui/button';
import type { Package, PackageInput } from '@/lib/api/models';
import { useCrud } from '@/lib/hooks/use-crud';
import { useLang, useT } from '@/lib/i18n/client';
import type { Column } from '@/lib/list/list-logic';
import { useFullList } from '@/lib/list/use-full-list';
import { formatPackageLocation, packageLabel, packageStatusLabel, serviceTypeLabel } from '@/lib/packages/labels';

const PENDING = 'pending';

/**
 * Tabla para elegir los paquetes de una jornada. La selección (`selectedIds`) vive fuera de la tabla: filtrar, paginar o recargar no la
 * pierde. «Seleccionar todos los pendientes» suma a la selección los paquetes en estado `pending` de TODA la lista (que ya está entera en
 * el cliente, hasta 1000).
 */
export function PackagePicker({
  selectedIds,
  onChange,
  onEmpty,
}: {
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  /** Avisa cuando la empresa no tiene ningún paquete. */
  onEmpty?: (empty: boolean) => void;
}) {
  const t = useT();
  const lang = useLang();
  const api = useCrud<Package, PackageInput>('packages');
  const list = useFullList(api.list);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isEmpty = list.status === 'empty';
  useEffect(() => {
    onEmpty?.(isEmpty);
  }, [isEmpty, onEmpty]);

  const columns = useMemo<Column<Package>[]>(
    () => [
      { id: 'guideNumber', header: t('Guía'), cell: (p) => p.guideNumber ?? '' },
      { id: 'name', header: t('Nombre'), primary: true, cell: (p) => p.name },
      { id: 'serviceType', header: t('Servicio'), cell: (p) => serviceTypeLabel(p.serviceType, t) },
      { id: 'address', header: t('Dirección'), cell: (p) => p.address },
      { id: 'status', header: t('Estado'), cell: (p) => packageStatusLabel(p.status, t) },
      { id: 'location', header: t('Latitud / longitud'), cell: (p) => formatPackageLocation(p, lang) },
    ],
    [t, lang]
  );

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange([...next]);
  };
  const total = selectedIds.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          variant="outlined"
          disabled={list.status !== 'ready'}
          onClick={() => {
            const next = new Set(selected);
            list.rows.filter((p) => p.status === PENDING).forEach((p) => next.add(p.id));
            onChange([...next]);
          }}
        >
          {t('Seleccionar todos los pendientes')}
        </Button>
        <Button variant="text" disabled={total === 0} onClick={() => onChange([])}>
          {t('Quitar la selección')}
        </Button>
        <span role="status" className="font-medium">
          {total === 0
            ? t('Ningún paquete seleccionado')
            : total === 1
              ? t('1 paquete seleccionado')
              : t('{0} paquetes seleccionados', [total])}
        </span>
      </div>
      <DataTable<Package>
        list={list}
        columns={columns}
        entityPlural={t('paquetes')}
        emptyMessage={t('Todavía no hay paquetes')}
        searchPlaceholder={t('Buscar por guía, nombre o dirección')}
        rowActions={(row) => (
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={selected.has(row.id)}
              onChange={(event) => toggle(row.id, event.target.checked)}
              aria-label={t('Seleccionar paquete ') + packageLabel(row)}
              className="size-5 cursor-pointer accent-primary"
            />
          </label>
        )}
      />
    </div>
  );
}
