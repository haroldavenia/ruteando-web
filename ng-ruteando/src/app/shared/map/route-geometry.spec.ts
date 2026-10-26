import { DomainRoute, DomainWaypoint } from '../../core/api/models';
import { toPlannedJourney } from '../../core/api/journey-mapper';
import { Journey } from '../../core/api/models';

import { lonLatBounds, routeCoordinates, routeLine, routeStops } from './route-geometry';

import plan from '../../../testing/fixtures/gateway/post__journeys__plan.json';

const fixtureRoute = toPlannedJourney(plan.response.body as unknown as Journey).routes[0];

const stop = (sequence: number, lat: number | null, lng = -74): DomainWaypoint =>
  ({ sequence, stopType: 'service', packageId: null, position: lat === null ? null : { lat, lng } }) as DomainWaypoint;
const route = (over: Partial<DomainRoute>): DomainRoute => ({ routeIndex: 0, name: 'R', geometry: [], waypoints: [], ...over }) as DomainRoute;

describe('route-geometry', () => {
  describe('routeLine', () => {
    it('usa la geometría del gateway como línea continua en orden [lon, lat]', () => {
      const line = routeLine(fixtureRoute)!;
      expect(line.dashed).toBeFalse();
      expect(line.coordinates.length).toBe(fixtureRoute.geometry.length);
      expect(line.coordinates[0]).toEqual([fixtureRoute.geometry[0].lng, fixtureRoute.geometry[0].lat]);
    });

    it('sin geometría y con dos o más paradas, las une en orden con línea discontinua', () => {
      const line = routeLine(route({ waypoints: [stop(2, 4.7), stop(1, 4.6), stop(3, 4.8)] }))!;
      expect(line.dashed).toBeTrue();
      expect(line.coordinates.map(([, lat]) => lat)).toEqual([4.6, 4.7, 4.8]);
    });

    it('sin geometría y con una sola parada no hay línea', () => {
      expect(routeLine(route({ waypoints: [stop(1, 4.6)] }))).toBeNull();
    });

    it('sin geometría ni paradas no hay línea', () => {
      expect(routeLine(route({}))).toBeNull();
    });

    it('descarta puntos no válidos de la geometría', () => {
      const line = routeLine(route({ geometry: [{ lat: 4.6, lng: -74 }, { lat: 95, lng: -74 }, { lat: 4.7, lng: -74 }] }))!;
      expect(line.coordinates.length).toBe(2);
    });

    it('si tras descartar quedan menos de dos puntos usa las paradas', () => {
      const line = routeLine(route({ geometry: [{ lat: 4.6, lng: -74 }, { lat: 95, lng: -74 }], waypoints: [stop(1, 4.6), stop(2, 4.7)] }))!;
      expect(line.dashed).toBeTrue();
    });
  });

  describe('routeStops', () => {
    it('deja las paradas con posición válida, en orden de secuencia', () => {
      const stops = routeStops(route({ waypoints: [stop(3, 4.8), stop(1, 4.6), stop(2, null), stop(4, 120)] }));
      expect(stops.map((s) => s.waypoint.sequence)).toEqual([1, 3]);
      expect(stops[0].coordinate).toEqual([-74, 4.6]);
    });

    it('las paradas del fixture real están todas', () => {
      expect(routeStops(fixtureRoute).length).toBe(fixtureRoute.waypoints.length);
    });
  });

  describe('lonLatBounds', () => {
    it('devuelve la caja de las coordenadas', () => {
      expect(lonLatBounds([[-74.1, 4.6], [-74.0, 4.8], [-74.2, 4.7]])).toEqual([-74.2, 4.6, -74.0, 4.8]);
    });

    it('un solo punto da una caja de tamaño nulo', () => {
      expect(lonLatBounds([[-74, 4.6]])).toEqual([-74, 4.6, -74, 4.6]);
    });

    it('sin coordenadas da null', () => {
      expect(lonLatBounds([])).toBeNull();
    });

    it('contiene todas las líneas y paradas del fixture real', () => {
      const coordinates = routeCoordinates([fixtureRoute]);
      const [west, south, east, north] = lonLatBounds(coordinates)!;
      expect(coordinates.length).toBeGreaterThan(fixtureRoute.waypoints.length);
      for (const [lon, lat] of coordinates) {
        expect(lon >= west && lon <= east && lat >= south && lat <= north).toBeTrue();
      }
      expect(east).toBeGreaterThan(west);
      expect(north).toBeGreaterThan(south);
    });
  });
});
