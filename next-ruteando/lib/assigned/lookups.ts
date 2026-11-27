import type { AssignedService, Journey, Resource, User } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { toCsv } from '@/lib/csv';
import { driverName, vehicleLabel } from '@/lib/fleet/labels';
import type { TFunction } from '@/lib/i18n/core';
import type { Page } from '@/lib/list/fetch-all';

import { readAssignment } from './contract';

/** Cuántas jornadas y vehículos se piden para poner nombre a un servicio asignado (una sola página). */
export const LOOKUP_SIZE = 100;
const NONE = '—';

/** Lo necesario para nombrar los ids de un servicio asignado. Lo que no se pueda leer queda vacío y se muestra «—». */
export interface AssignmentLookups {
  journeys: readonly Journey[];
  resources: readonly Resource[];
  drivers: readonly User[];
}

export const EMPTY_LOOKUPS: AssignmentLookups = { journeys: [], resources: [], drivers: [] };

/**
 * Jornadas, vehículos y conductores a la vez. Si una petición falla (por ejemplo, un rol sin permiso sobre los conductores) esa lista
 * queda vacía: es mejor ver «—» que perder todo el listado.
 */
export async function loadLookups(t: TFunction): Promise<AssignmentLookups> {
  const query = `?page=0&size=${LOOKUP_SIZE}`;
  const [journeys, resources, drivers] = await Promise.all([
    getData<Page<Journey>>(`journeys${query}`, t).then(
      (p) => p.content,
      () => [] as Journey[]
    ),
    getData<Page<Resource>>(`resources${query}`, t).then(
      (p) => p.content,
      () => [] as Resource[]
    ),
    getData<User[]>('users/drivers', t).catch(() => [] as User[]),
  ]);
  return { journeys, resources, drivers };
}

export const journeyLabel = (lookups: AssignmentLookups, id: string | null): string =>
  lookups.journeys.find((j) => j.id === id)?.name ?? NONE;

/** «Ruta 2» (el índice del gateway empieza en 0). */
export const routeNumberLabel = (routeIndex: number, t: TFunction): string => t('Ruta {0}', [routeIndex + 1]);

export function vehicleName(lookups: AssignmentLookups, id: string | null): string {
  const resource = lookups.resources.find((r) => r.id === id);
  return resource ? vehicleLabel(resource) : NONE;
}

export function driverLabel(lookups: AssignmentLookups, id: string | null): string {
  const driver = lookups.drivers.find((d) => d.id === id);
  return driver ? driverName(driver) : NONE;
}

/** «Reparto norte · Ruta 2»; sin jornada o ruta conocida, «—». */
export function assignedRouteLabel(lookups: AssignmentLookups, service: AssignedService, t: TFunction): string {
  const { journeyId, routeIndex } = readAssignment(service);
  if (routeIndex === null) return NONE;
  return `${journeyLabel(lookups, journeyId)} · ${routeNumberLabel(routeIndex, t)}`;
}

export const stateLabel = (state: string, t: TFunction): string => (state === 'ACTIVO' ? t('Activo') : state);

export function assignedServicesToCsv(
  lookups: AssignmentLookups,
  rows: readonly AssignedService[],
  t: TFunction
): string {
  return toCsv(
    [t('Ruta'), t('Vehículo'), t('Conductor'), t('Fecha'), t('Estado')],
    rows.map((row) => {
      const refs = readAssignment(row);
      return [
        assignedRouteLabel(lookups, row, t),
        vehicleName(lookups, refs.vehicleId),
        driverLabel(lookups, refs.driverId),
        refs.executionDate ?? '',
        stateLabel(row.state, t),
      ];
    })
  );
}

/** La fecha `AAAA-MM-DD` en el formato local; se lee en UTC para que ninguna zona horaria la corra de día. */
export function dateLabel(date: string | null, lang: string): string {
  return date
    ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
    : NONE;
}
