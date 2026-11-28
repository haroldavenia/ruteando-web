'use client';

import { useMemo } from 'react';

import { EntityList } from '@/components/page/entity-list';
import { arrayPage } from '@/lib/api/array-page';
import type { Zone } from '@/lib/api/models';
import { useZonesApi } from '@/lib/hooks/use-zones-api';
import { useT } from '@/lib/i18n/client';
import type { Column } from '@/lib/list/list-logic';
import { verticesFromRing } from '@/lib/map/polygon-geometry';
import { colorName } from '@/lib/map/route-colors';

/** Listado de zonas (solo administradores). */
export function ZoneList({ tenantId }: { tenantId: string }) {
  const t = useT();
  const api = useZonesApi(tenantId);
  const fetchPage = useMemo(() => arrayPage(api.list), [api]);
  const inUse = t('No se puede eliminar: la zona se usa en lugares, paquetes o configuraciones');

  const columns = useMemo<Column<Zone>[]>(
    () => [
      { id: 'color', header: t('Color'), cell: (z) => colorName(z.color, t), swatch: (z) => z.color },
      { id: 'name', header: t('Nombre'), cell: (z) => z.name, kind: 'strong', primary: true },
      { id: 'code', header: t('Código'), cell: (z) => z.code },
      {
        id: 'vertices',
        header: t('Vértices'),
        cell: (z) => String(verticesFromRing(z.boundary?.coordinates?.[0]).length),
      },
      { id: 'active', header: t('Estado'), cell: (z) => (z.active ? t('Activa') : t('Inactiva')) },
    ],
    [t]
  );

  return (
    <EntityList<Zone>
      title={t('Zonas')}
      singular={t('zona')}
      plural={t('zonas')}
      fetchPage={fetchPage}
      columns={columns}
      newHref="/zones/new"
      newLabel={t('Nueva zona')}
      emptyMessage={t('Todavía no hay zonas')}
      emptyActionLabel={t('Crear la primera zona')}
      searchPlaceholder={t('Buscar')}
      rowLabel={(z) => z.name}
      editHref={(z) => `/zones/${encodeURIComponent(z.id)}`}
      editLabel={(z) => t('Editar zona ') + z.name}
      remove={(z, messages) => api.remove(z.id, messages)}
      byStatus={{ 400: inUse, 409: inUse }}
    />
  );
}
