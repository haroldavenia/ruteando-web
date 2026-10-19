import { HttpTestingController } from '@angular/common/http/testing';

import { Fixture, expectSameContract, firstResult, respondWith, setupApi } from '../../../../testing/api-testing';
import { toPlannedJourney } from '../journey-mapper';
import { Journey } from '../models';
import { JourneysApi } from './journeys.api';

import list from '../../../../testing/fixtures/gateway/get__journeys.json';
import get from '../../../../testing/fixtures/gateway/get__journeys__id.json';
import plan from '../../../../testing/fixtures/gateway/post__journeys__plan.json';
import remove from '../../../../testing/fixtures/gateway/delete__journeys__id.json';
import metrics from '../../../../testing/fixtures/gateway/get__journeys__journeyId__metrics.json';
import navigations from '../../../../testing/fixtures/gateway/get__journeys__journeyId__navigations.json';
import navigation from '../../../../testing/fixtures/gateway/get__journeys__journeyId__navigations__routeIndex.json';

const fx = (f: unknown) => f as unknown as Fixture;

describe('JourneysApi', () => {
  let api: JourneysApi;
  let controller: HttpTestingController;

  beforeEach(() => ({ api, controller } = setupApi(JourneysApi)));
  afterEach(() => controller.verify());

  it('list pide una página y las jornadas del listado no traen rutas', async () => {
    const result = firstResult(api.list({ page: 0, size: 20 }));
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/journeys?page=0&size=20' }), fx(list));

    const page = await result;
    expect(page.content.length).toBe(1);
    expect(page.content[0].routes).toBeNull();
    expect(page.totalElements).toBe(1);
  });

  it('plan envía settingsId, packageIds y name, y entrega la jornada con rutas en el modelo de dominio', async () => {
    const result = firstResult(api.plan(plan.request.body as never));
    const req = controller.expectOne({ method: 'POST', url: '/gateway/journeys/plan' });
    expectSameContract(req, fx(plan));
    respondWith(req, fx(plan));

    const journey = await result;
    expect(journey.status).toBe('completed');
    expect(journey.routes.length).toBe(1);
    expect(journey.routes[0].geometry.length).toBeGreaterThan(100);
    expect(journey.routes[0].geometry[0].lat).toBeCloseTo(4.61016, 5);
    expect(journey.routes[0].geometry[0].lng).toBeCloseTo(-74.08235, 5);
  });

  it('get entrega la jornada con sus rutas en el modelo de dominio', async () => {
    const result = firstResult(api.get('j1'));
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/journeys/j1' }), fx(get));

    const journey = await result;
    expect(journey.routes.length).toBe(1);
    expect(journey.routes[0].geometry).toEqual([]); // la ruta de ejemplo no tiene geometría
  });

  it('remove borra la jornada y metrics, navigations y navigation leen sus datos', async () => {
    const del = firstResult(api.remove('j1'));
    respondWith(controller.expectOne({ method: 'DELETE', url: '/gateway/journeys/j1' }), fx(remove));
    await del;

    const m = firstResult(api.metrics('j1'));
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/journeys/j1/metrics' }), fx(metrics));
    expect((await m).totalServices).toBe(0);

    const all = firstResult(api.navigations('j1'));
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/journeys/j1/navigations' }), fx(navigations));
    expect((await all)[0].routeIndex).toBe(0);

    const one = firstResult(api.navigation('j1', 0));
    respondWith(controller.expectOne({ method: 'GET', url: '/gateway/journeys/j1/navigations/0' }), fx(navigation));
    expect((await one).routeIndex).toBe(0);
  });
});

describe('toPlannedJourney (conversión al modelo de dominio)', () => {
  const wire = plan.response.body as unknown as Journey;

  it('la geometría decodificada se expone como `geometry` y desaparece `geoJson`', () => {
    const route = toPlannedJourney(wire).routes[0] as unknown as Record<string, unknown>;

    expect(route['geometry']).toBeDefined();
    expect('geoJson' in route).toBeFalse();
  });

  it('las paradas pasan de [lon, lat] a LatLng con nombre', () => {
    const waypoints = toPlannedJourney(wire).routes[0].waypoints;
    const wireWaypoint = wire.routes![0].waypoints[0];

    expect(waypoints[0].position).toEqual({ lat: wireWaypoint.coordinates[1], lng: wireWaypoint.coordinates[0] });
    expect(waypoints[0].stopType).toBe('depot');
    expect('coordinates' in (waypoints[0] as unknown as Record<string, unknown>)).toBeFalse();
  });

  it('conserva el resto de campos de la jornada y de la ruta', () => {
    const planned = toPlannedJourney(wire);

    expect(planned.id).toBe(wire.id);
    expect(planned.totalServices).toBe(2);
    expect(planned.routes[0].distanceTraveled).toBe(5928.5);
    expect(planned.routes[0].routeIndex).toBe(0);
  });

  it('una parada con coordenadas inválidas queda con posición nula', () => {
    const broken: Journey = JSON.parse(JSON.stringify(wire));
    broken.routes![0].waypoints[0].coordinates = [-74, 95];

    expect(toPlannedJourney(broken).routes[0].waypoints[0].position).toBeNull();
  });

  it('una jornada sin rutas (listado) da una lista de rutas vacía', () => {
    expect(toPlannedJourney({ ...wire, routes: null }).routes).toEqual([]);
  });

  it('una ruta sin geometría ni paradas no falla', () => {
    const empty: Journey = JSON.parse(JSON.stringify(wire));
    empty.routes![0].geoJson = null;
    empty.routes![0].waypoints = null as never;

    const route = toPlannedJourney(empty).routes[0];
    expect(route.geometry).toEqual([]);
    expect(route.waypoints).toEqual([]);
  });
});
