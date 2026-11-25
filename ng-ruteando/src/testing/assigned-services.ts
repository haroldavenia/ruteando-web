import { HttpTestingController } from '@angular/common/http/testing';

import { AssignedService, Journey, Resource, User } from '../app/core/api/models';

/** Datos ficticios mínimos para probar los servicios asignados (el gateway real no documenta los objetos anidados). */
export const JOURNEY = { id: 'j1', name: 'Reparto norte' } as Journey;
export const VEHICLE = { id: 'v1', name: 'Furgón 1', licensePlate: 'ABC123', driverId: 'd1' } as Resource;
export const OTHER_VEHICLE = { id: 'v2', name: 'Moto', licensePlate: null, driverId: null } as Resource;
export const DRIVER = { id: 'd1', firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.invalid' } as User;

export const SERVICE: AssignedService = {
  id: 's1',
  state: 'ACTIVO',
  executionDate: '2026-11-25',
  route: { journeyId: 'j1', routeIndex: 1 },
  vehicle: { id: 'v1' },
  driver: { id: 'd1' },
};

const page = <T>(content: T[]) => ({ content, page: 0, size: 100, totalElements: content.length, totalPages: 1 });

/** Responde las tres peticiones de nombres (jornadas, vehículos y conductores); `null` hace fallar esa petición. */
export function flushLookups(
  http: HttpTestingController,
  data: { journeys?: Journey[] | null; resources?: Resource[] | null; drivers?: User[] | null } = {}
): void {
  const { journeys = [JOURNEY], resources = [VEHICLE, OTHER_VEHICLE], drivers = [DRIVER] } = data;
  const answer = (url: RegExp, body: unknown) => {
    const req = http.expectOne((r) => r.method === 'GET' && url.test(r.url));
    if (body === null) {
      req.flush({ message: 'no' }, { status: 403, statusText: 'Forbidden' });
    } else {
      req.flush(body as object);
    }
  };
  answer(/\/gateway\/journeys$/, journeys === null ? null : page(journeys));
  answer(/\/gateway\/resources$/, resources === null ? null : page(resources));
  answer(/\/gateway\/users\/drivers$/, drivers);
}
