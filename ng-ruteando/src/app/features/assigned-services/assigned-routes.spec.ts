import { AssignedService, DomainRoute, PlannedJourney } from '../../core/api/models';
import { assignedRoutes } from './assigned-routes';

const route = (routeIndex: number, name: string): DomainRoute =>
  ({ routeIndex, name, waypoints: [] }) as unknown as DomainRoute;
const journey = (id: string, name: string, ...routes: DomainRoute[]): PlannedJourney =>
  ({ id, name, routes }) as unknown as PlannedJourney;
const service = (journeyId: string | null, routeIndex: number | null): AssignedService =>
  ({
    id: `${journeyId}-${routeIndex}`,
    state: 'ACTIVO',
    executionDate: null,
    vehicle: null,
    driver: null,
    route: journeyId === null ? null : { journeyId, routeIndex },
  }) as AssignedService;

describe('assignedRoutes', () => {
  const journeys = new Map([
    ['j1', journey('j1', 'Norte', route(0, 'Ruta 1'), route(1, 'Ruta 2'))],
    ['j2', journey('j2', 'Sur', route(0, 'Ruta 1'))],
  ]);

  it('renumera las rutas y las nombra con su jornada, porque jornadas distintas repiten el índice', () => {
    const { routes, missing } = assignedRoutes([service('j1', 0), service('j2', 0), service('j1', 1)], journeys);
    expect(routes.map((r) => [r.routeIndex, r.name])).toEqual([
      [0, 'Norte · Ruta 1'],
      [1, 'Sur · Ruta 1'],
      [2, 'Norte · Ruta 2'],
    ]);
    expect(missing).toBe(0);
  });

  it('la misma ruta asignada dos veces se dibuja una sola vez', () => {
    expect(assignedRoutes([service('j1', 0), service('j1', 0)], journeys).routes.length).toBe(1);
  });

  it('cuenta lo que no se puede dibujar: jornada sin leer, ruta que ya no existe o servicio sin ruta', () => {
    const { routes, missing } = assignedRoutes(
      [service('j9', 0), service('j1', 7), service(null, null), service('j1', 0)],
      journeys
    );
    expect(routes.length).toBe(1);
    expect(missing).toBe(3);
  });

  it('no modifica la ruta original', () => {
    const original = journeys.get('j2')!.routes[0];
    assignedRoutes([service('j2', 0)], journeys);
    expect(original.name).toBe('Ruta 1');
    expect(original.routeIndex).toBe(0);
  });
});
