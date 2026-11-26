import { readAssignment } from '../../core/api/data/assigned-services-contract';
import { AssignedService, DomainRoute, PlannedJourney } from '../../core/api/models';

export interface AssignedRoutes {
  /** Las rutas asignadas, listas para el mapa: cada una con un `routeIndex` propio y el nombre de su jornada. */
  routes: DomainRoute[];
  /** Servicios cuya ruta no se pudo dibujar (la jornada no se leyó, ya no tiene esa ruta o el servicio no dice cuál es). */
  missing: number;
}

/**
 * Las rutas de los servicios asignados, para verlas juntas en un mapa. Las rutas de jornadas distintas comparten `routeIndex`
 * (0, 1…), y el mapa identifica y colorea cada ruta por ese número, así que se renumeran en orden y se nombran con su jornada.
 * Un mismo servicio repetido o dos servicios de la misma ruta dibujan la ruta una sola vez.
 */
export function assignedRoutes(
  services: readonly AssignedService[],
  journeys: ReadonlyMap<string, PlannedJourney>
): AssignedRoutes {
  const routes: DomainRoute[] = [];
  const seen = new Set<string>();
  let missing = 0;
  for (const service of services) {
    const { journeyId, routeIndex } = readAssignment(service);
    const journey = journeyId ? journeys.get(journeyId) : undefined;
    const route = journey?.routes.find((r) => r.routeIndex === routeIndex);
    if (!journey || !route) {
      missing++;
      continue;
    }
    const key = `${journey.id}/${route.routeIndex}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    routes.push({ ...route, routeIndex: routes.length, name: `${journey.name} · ${route.name}` });
  }
  return { routes, missing };
}
