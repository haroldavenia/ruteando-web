import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import { readAssignment } from '../../core/api/data/assigned-services-contract';
import { JourneysApi } from '../../core/api/data/journeys.api';
import { ResourcesApi } from '../../core/api/data/resources.api';
import { UsersApi } from '../../core/api/data/users.api';
import { AssignedService, Journey, Resource, User } from '../../core/api/models';
import { locale, t } from '../../core/i18n/i18n';
import { toCsv } from '../../shared/data/csv';
import { driverName, vehicleLabel } from '../fleet/fleet-labels';

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
 * Jornadas, vehículos y conductores a la vez. Si una petición falla (por ejemplo, un rol sin permiso sobre los conductores)
 * esa lista queda vacía: es mejor ver «—» que perder todo el listado.
 */
export function loadLookups(
  journeys: JourneysApi,
  resources: ResourcesApi,
  users: UsersApi
): Observable<AssignmentLookups> {
  const page = { page: 0, size: LOOKUP_SIZE };
  return forkJoin({
    journeys: journeys.list(page).pipe(
      map((p) => p.content),
      catchError(() => of([] as Journey[]))
    ),
    resources: resources.list(page).pipe(
      map((p) => p.content),
      catchError(() => of([] as Resource[]))
    ),
    drivers: users.drivers().pipe(catchError(() => of([] as User[]))),
  });
}

export const journeyLabel = (lookups: AssignmentLookups, id: string | null): string =>
  lookups.journeys.find((j) => j.id === id)?.name ?? NONE;

/** «Ruta 2» (el índice del gateway empieza en 0). */
export const routeNumberLabel = (routeIndex: number): string => t('Ruta {0}', [routeIndex + 1]);

export function vehicleName(lookups: AssignmentLookups, id: string | null): string {
  const resource = lookups.resources.find((r) => r.id === id);
  return resource ? vehicleLabel(resource) : NONE;
}

export function driverLabel(lookups: AssignmentLookups, id: string | null): string {
  const driver = lookups.drivers.find((d) => d.id === id);
  return driver ? driverName(driver) : NONE;
}

/** «Reparto norte · Ruta 2»; sin jornada o ruta conocida, «—». */
export function assignedRouteLabel(lookups: AssignmentLookups, service: AssignedService): string {
  const { journeyId, routeIndex } = readAssignment(service);
  if (routeIndex === null) {
    return NONE;
  }
  return `${journeyLabel(lookups, journeyId)} · ${routeNumberLabel(routeIndex)}`;
}

export const stateLabel = (state: string): string => (state === 'ACTIVO' ? t('Activo') : state);

export function assignedServicesToCsv(lookups: AssignmentLookups, rows: readonly AssignedService[]): string {
  return toCsv(
    [t('Ruta'), t('Vehículo'), t('Conductor'), t('Fecha'), t('Estado')],
    rows.map((row) => {
      const refs = readAssignment(row);
      return [
        assignedRouteLabel(lookups, row),
        vehicleName(lookups, refs.vehicleId),
        driverLabel(lookups, refs.driverId),
        refs.executionDate ?? '',
        stateLabel(row.state),
      ];
    })
  );
}

/** La fecha `AAAA-MM-DD` en el formato local; se lee en UTC para que ninguna zona horaria la corra de día. */
const DATE = new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeZone: 'UTC' });
export const dateLabel = (date: string | null): string => (date ? DATE.format(new Date(`${date}T00:00:00Z`)) : NONE);
