'use client';

import { useMemo } from 'react';

import { EntityList } from '@/components/page/entity-list';
import type { Settings, SettingsInput } from '@/lib/api/models';
import { useCrud } from '@/lib/hooks/use-crud';
import { useT } from '@/lib/i18n/client';
import type { Column } from '@/lib/list/list-logic';
import { restrictionTypeLabel, routeTopologyLabel } from '@/lib/settings/labels';

/** Listado de configuraciones de planificación (solo administradores). */
export function SettingsList() {
  const t = useT();
  const api = useCrud<Settings, SettingsInput>('settings');
  const inUse = t('No se puede eliminar: la configuración se usa en una jornada');

  const columns = useMemo<Column<Settings>[]>(
    () => [
      { id: 'description', header: t('Descripción'), cell: (s) => s.description, kind: 'strong', primary: true },
      { id: 'routeTopology', header: t('Topología'), cell: (s) => routeTopologyLabel(s.routeTopology, t) },
      { id: 'restrictionType', header: t('Restricción'), cell: (s) => restrictionTypeLabel(s.restrictionType, t) },
      { id: 'placeStart', header: t('Salida'), cell: (s) => s.placeStart?.name ?? '' },
      { id: 'resources', header: t('Vehículos'), cell: (s) => String(s.resourceIds?.length ?? 0) },
      { id: 'active', header: t('Estado'), cell: (s) => (s.active ? t('Activa') : t('Inactiva')) },
    ],
    [t]
  );

  return (
    <EntityList<Settings>
      title={t('Configuraciones')}
      singular={t('configuración')}
      plural={t('configuraciones')}
      fetchPage={api.list}
      columns={columns}
      newHref="/settings/new"
      newLabel={t('Nueva configuración')}
      emptyMessage={t('Todavía no hay configuraciones')}
      emptyActionLabel={t('Crear la primera configuración')}
      searchPlaceholder={t('Buscar')}
      rowLabel={(s) => s.description}
      editHref={(s) => `/settings/${encodeURIComponent(s.id)}`}
      editLabel={(s) => t('Editar configuración ') + s.description}
      remove={(s, messages) => api.remove(s.id, messages)}
      byStatus={{ 400: inUse, 409: inUse }}
    />
  );
}
