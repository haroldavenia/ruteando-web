import { AssignedService, AssignedServiceInput } from '../models';

/**
 * Contrato de `/assigned-services`.
 *
 * HIPÓTESIS SIN VERIFICAR: la colección Postman solo muestra `state` y los objetos anidados (`route`, `vehicle`,
 * `driver`) en `null`. Aquí se supone `route: { journeyId, routeIndex }` (las rutas del gateway no tienen id propio),
 * `vehicle: { id }` y `driver: { id }`. Todo lo que dependa de eso está en este fichero y la lectura es tolerante: si
 * el gateway real responde distinto, solo hay que corregirlo aquí.
 */

/** Estado con el que se crea un servicio asignado (el gateway lo escribe en español). */
export const ASSIGNED_ACTIVE = 'ACTIVO';

export interface Assignment {
  journeyId: string;
  routeIndex: number;
  vehicleId: string;
  driverId: string;
  /** Fecha `AAAA-MM-DD`. */
  executionDate: string;
}

/** Lo que se sabe de un servicio asignado; lo que el gateway no devuelva queda en `null`. */
export interface AssignmentRefs {
  journeyId: string | null;
  routeIndex: number | null;
  vehicleId: string | null;
  driverId: string | null;
  executionDate: string | null;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
};

const asIndex = (value: unknown): number | null => {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : null;
};

/** `YYYY-MM-DD` de una fecha ISO (con o sin hora); cualquier otra cosa es `null`. */
export function dateOnly(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

export function readAssignment(service: AssignedService): AssignmentRefs {
  const route = asRecord(service.route);
  const journey = asRecord(route?.['journey']);
  return {
    journeyId: asId(route?.['journeyId']) ?? asId(journey?.['id']),
    routeIndex: asIndex(route?.['routeIndex']),
    vehicleId: asId(asRecord(service.vehicle)?.['id']),
    driverId: asId(asRecord(service.driver)?.['id']),
    executionDate: dateOnly(service.executionDate),
  };
}

/**
 * Cuerpo para crear o actualizar. Al editar se reenvía el estado que el servicio ya tenía (la pantalla no lo expone).
 */
export function assignmentBody(assignment: Assignment, state: string = ASSIGNED_ACTIVE): AssignedServiceInput {
  return {
    state,
    route: { journeyId: assignment.journeyId, routeIndex: assignment.routeIndex },
    vehicle: { id: assignment.vehicleId },
    driver: { id: assignment.driverId },
    executionDate: assignment.executionDate,
  };
}

/** ¿El servicio asignado es de esta ruta de esta jornada? */
export function isForRoute(service: AssignedService, journeyId: string, routeIndex: number): boolean {
  const refs = readAssignment(service);
  return refs.journeyId === journeyId && refs.routeIndex === routeIndex;
}
