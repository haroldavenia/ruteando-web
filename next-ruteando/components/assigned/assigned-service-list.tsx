'use client';

import { RiMapLine } from '@remixicon/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { EntityList } from '@/components/page/entity-list';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { arrayPage } from '@/lib/api/array-page';
import type { AssignedService, AssignedServiceInput } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { readAssignment } from '@/lib/assigned/contract';
import {
  assignedRouteLabel,
  assignedServicesToCsv,
  type AssignmentLookups,
  dateLabel,
  driverLabel,
  EMPTY_LOOKUPS,
  loadLookups,
  stateLabel,
  vehicleName,
} from '@/lib/assigned/lookups';
import { useCrud } from '@/lib/hooks/use-crud';
import { useLang, useT } from '@/lib/i18n/client';
import type { Column } from '@/lib/list/list-logic';
import { statusTone } from '@/lib/status-tone';

/**
 * Listado de servicios asignados (una ruta de una jornada con su vehículo, su conductor y una fecha). Se piden primero las jornadas, los
 * vehículos y los conductores para pintar nombres, y luego los servicios.
 */
export function AssignedServiceList() {
  const t = useT();
  const lang = useLang();
  const api = useCrud<AssignedService, AssignedServiceInput>('assigned-services');
  const [lookups, setLookups] = useState<AssignmentLookups | null>(null);

  useEffect(() => {
    let current = true;
    void loadLookups(t).then((found) => current && setLookups(found));
    return () => {
      current = false;
    };
  }, [t]);

  const names = lookups ?? EMPTY_LOOKUPS;
  const label = (service: AssignedService) => assignedRouteLabel(names, service, t);
  // Las filas se piden cuando ya están los nombres (otra función de carga = se vuelve a pedir)
  const fetchPage = useMemo(
    () =>
      arrayPage(() =>
        lookups ? getData<AssignedService[]>('assigned-services', t) : new Promise<AssignedService[]>(() => {})
      ),
    [lookups, t]
  );

  const columns = useMemo<Column<AssignedService>[]>(
    () => [
      { id: 'route', header: t('Ruta'), cell: (s) => assignedRouteLabel(names, s, t), kind: 'strong', primary: true },
      { id: 'vehicle', header: t('Vehículo'), cell: (s) => vehicleName(names, readAssignment(s).vehicleId) },
      { id: 'driver', header: t('Conductor'), cell: (s) => driverLabel(names, readAssignment(s).driverId) },
      { id: 'date', header: t('Fecha'), cell: (s) => dateLabel(readAssignment(s).executionDate, lang) },
      {
        id: 'state',
        header: t('Estado'),
        cell: (s) => stateLabel(s.state, t),
        tone: (s) => statusTone('assigned', s.state),
      },
    ],
    [t, lang, names]
  );

  return (
    <EntityList<AssignedService>
      selectable
      title={t('Servicios asignados')}
      singular={t('servicio asignado')}
      plural={t('servicios asignados')}
      fetchPage={fetchPage}
      columns={columns}
      headActions={
        <Link href="/assigned-services/map" className={buttonVariants({ variant: 'outlined' })}>
          <Icon icon={RiMapLine} size={20} />
          {t('Ver en el mapa')}
        </Link>
      }
      newHref="/assigned-services/new"
      newLabel={t('Asignar ruta')}
      emptyMessage={t('Todavía no hay servicios asignados')}
      emptyActionLabel={t('Asignar la primera ruta')}
      searchPlaceholder={t('Buscar por ruta, vehículo o conductor')}
      rowLabel={label}
      editHref={(s) => `/assigned-services/${encodeURIComponent(s.id)}`}
      editLabel={(s) => t('Editar servicio asignado ') + label(s)}
      remove={(s, messages) => api.remove(s.id, messages)}
      fileBase="servicios-asignados"
      csv={(rows) => assignedServicesToCsv(names, rows, t)}
    />
  );
}
