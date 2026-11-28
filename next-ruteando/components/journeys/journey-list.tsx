'use client';

import { RiEyeLine } from '@remixicon/react';
import { useCallback, useMemo } from 'react';

import { EntityList } from '@/components/page/entity-list';
import { IconLink } from '@/components/ui/icon-link';
import type { Journey } from '@/lib/api/models';
import { useCrud } from '@/lib/hooks/use-crud';
import { useFormat } from '@/lib/hooks/use-format';
import { useT } from '@/lib/i18n/client';
import { journeyStatusLabel, journeyStatusOrder } from '@/lib/journeys/labels';
import type { Column, Facet } from '@/lib/list/list-logic';
import { statusTone } from '@/lib/status-tone';

/** Listado de jornadas con chips de estado. */
export function JourneyList() {
  const t = useT();
  const format = useFormat();
  const api = useCrud<Journey, never>('journeys');

  const columns = useMemo<Column<Journey>[]>(
    () => [
      {
        id: 'name',
        header: t('Nombre'),
        cell: (j) => j.name,
        link: (j) => `/journeys/${encodeURIComponent(j.id)}`,
        primary: true,
      },
      {
        id: 'status',
        header: t('Estado'),
        cell: (j) => journeyStatusLabel(j.status, t),
        tone: (j) => statusTone('journey', j.status),
      },
      { id: 'settings', header: t('Configuración'), cell: (j) => j.settings?.name ?? '' },
      {
        id: 'services',
        header: t('Servicios'),
        cell: (j) => (j.totalServices === null ? '' : format.count(j.totalServices)),
      },
      {
        id: 'resources',
        header: t('Vehículos'),
        cell: (j) => (j.totalResources === null ? '' : format.count(j.totalResources)),
      },
      { id: 'createdAt', header: t('Creada'), cell: (j) => format.dateTime(j.createdAt) },
    ],
    [t, format]
  );
  const facet = useCallback(
    (rows: readonly Journey[]): Facet<Journey> => ({
      label: t('Estado'),
      of: (j) => j.status,
      options: journeyStatusOrder(rows).map((key) => ({ key, label: journeyStatusLabel(key, t) })),
    }),
    [t]
  );

  return (
    <EntityList<Journey>
      title={t('Jornadas')}
      singular={t('jornada')}
      plural={t('jornadas')}
      fetchPage={api.list}
      columns={columns}
      facet={facet}
      newHref="/journeys/new"
      newLabel={t('Planificar jornada')}
      emptyMessage={t('Todavía no hay jornadas')}
      emptyActionLabel={t('Planificar la primera jornada')}
      searchPlaceholder={t('Buscar por nombre o configuración')}
      rowLabel={(j) => j.name}
      remove={(j, messages) => api.remove(j.id, messages)}
      extraActions={(j) => (
        <IconLink
          href={`/journeys/${encodeURIComponent(j.id)}`}
          icon={RiEyeLine}
          label={t('Ver la jornada ') + j.name}
        />
      )}
    />
  );
}
