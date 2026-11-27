'use client';

import { useMemo } from 'react';

import { EntityList } from '@/components/page/entity-list';
import type { ResourceType, ResourceTypeInput } from '@/lib/api/models';
import { typesToCsv } from '@/lib/fleet/export';
import { capacitySummary, profileLabel } from '@/lib/fleet/labels';
import { useCrud } from '@/lib/hooks/use-crud';
import { useLang, useT } from '@/lib/i18n/client';
import type { Column } from '@/lib/list/list-logic';

import { FleetTabs } from './fleet-tabs';

/** Listado de tipos de vehículo (solo administradores). */
export function ResourceTypeList() {
  const t = useT();
  const lang = useLang();
  const api = useCrud<ResourceType, ResourceTypeInput>('resource-types');
  const inUse = t('No se puede eliminar: hay vehículos de este tipo');
  const columns = useMemo<Column<ResourceType>[]>(
    () => [
      { id: 'name', header: t('Nombre'), cell: (r) => r.name, kind: 'strong', primary: true },
      { id: 'category', header: t('Categoría'), cell: (r) => r.category },
      { id: 'capacity', header: t('Capacidad'), cell: (r) => capacitySummary(r, t, lang) },
      { id: 'osrmProfile', header: t('Perfil de ruteo'), cell: (r) => profileLabel(r.osrmProfile, t) },
    ],
    [t, lang]
  );

  return (
    <EntityList<ResourceType>
      title={t('Tipos de vehículo')}
      singular={t('tipo')}
      plural={t('tipos')}
      fetchPage={api.list}
      above={<FleetTabs />}
      columns={columns}
      newHref="/fleet/types/new"
      newLabel={t('Nuevo tipo')}
      emptyMessage={t('Todavía no hay tipos de vehículo')}
      emptyActionLabel={t('Crear el primer tipo')}
      searchPlaceholder={t('Buscar por nombre o categoría')}
      rowLabel={(r) => r.name}
      editHref={(r) => `/fleet/types/${encodeURIComponent(r.id)}`}
      editLabel={(r) => t('Editar tipo ') + r.name}
      remove={(r, messages) => api.remove(r.id, messages)}
      byStatus={{ 400: inUse, 409: inUse }}
      fileBase="tipos-de-vehiculo"
      csv={(rows) => typesToCsv(rows, t)}
    />
  );
}
