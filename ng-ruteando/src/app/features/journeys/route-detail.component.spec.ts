import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { Fixture } from '../../../testing/api-testing';
import { TEST_MAP_CONFIG } from '../../../testing/map';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { MAP_CONFIG } from '../../shared/map/map-config';

import { RouteDetailComponent } from './route-detail.component';

import plan from '../../../testing/fixtures/gateway/post__journeys__plan.json';

const journey = (plan as unknown as Fixture).response.body as { id: string; name: string; routes: { routeIndex: number; name: string; waypoints: unknown[] }[] };

describe('RouteDetailComponent', () => {
  let fixture: ComponentFixture<RouteDetailComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent!.replace(/\s+/g, ' ');
  const summary = (): Record<string, string> =>
    Object.fromEntries(Array.from(root().querySelectorAll('dl.summary > div')).map((d) => [d.querySelector('dt')!.textContent!.trim(), d.querySelector('dd')!.textContent!.trim()]));

  function setup(routeIndex: string, body?: unknown, error?: { status: number }): void {
    TestBed.configureTestingModule({
      imports: [RouteDetailComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: journey.id, routeIndex }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RouteDetailComponent);
    fixture.detectChanges();
    const req = http.expectOne(`/gateway/journeys/${journey.id}`);
    if (error) {
      req.flush({ message: 'nf' }, { status: error.status, statusText: 'x' });
    } else {
      req.flush((body ?? journey) as object);
    }
    fixture.detectChanges();
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush([]));
  }

  afterEach(() => http.verify());

  it('muestra el nombre de la ruta y su resumen', () => {
    setup('0');
    expect(root().querySelector('h1')?.textContent).toBe('Capture vehicle');
    expect(Object.keys(summary())).toEqual(['Vehículo', 'Paradas', 'Distancia', 'Duración', 'Uso de peso', 'Uso de volumen', 'Inicio', 'Fin']);
    expect(summary()['Paradas']).toBe(String(journey.routes[0].waypoints.length));
  });

  it('un dato que el gateway no informa se muestra como «—»', () => {
    const body = { ...journey, routes: [{ ...journey.routes[0], distanceTraveled: null, duration: null, weightUsagePercent: null }] };
    setup('0', body);
    expect(summary()).toEqual(jasmine.objectContaining({ Distancia: '—', 'Duración': '—', 'Uso de peso': '—' }));
  });

  it('enlaza de vuelta a la jornada', () => {
    setup('0');
    const back = root().querySelector('a[href^="/jornadas/"]') as HTMLAnchorElement;
    expect(back.getAttribute('href')).toBe(`/jornadas/${journey.id}`);
    expect(back.textContent).toContain(journey.name);
  });

  it('muestra solo esa ruta en el mapa', () => {
    const second = { ...journey.routes[0], routeIndex: 1, name: 'Otra ruta' };
    setup('1', { ...journey, routes: [journey.routes[0], second] });
    expect(root().querySelector('h1')?.textContent).toBe('Otra ruta');
    const legend = Array.from(root().querySelectorAll('app-routes-map li')).map((li) => li.textContent);
    expect(legend.join(' ')).toContain('Otra ruta');
    expect(legend.join(' ')).not.toContain('Capture vehicle');
  });

  it('muestra las visitas de la ruta con el estado de sus paquetes', () => {
    const waypoints = [{ ...(journey.routes[0].waypoints[1] as object), packageId: 'pk1' }];
    setup('0', { ...journey, routes: [{ ...journey.routes[0], waypoints }] });
    http
      .expectOne('/gateway/packages/pk1')
      .flush({ id: 'pk1', name: 'Paquete uno', guideNumber: null, address: 'Calle 1', standardizedAddress: null, status: 'attended' });
    fixture.detectChanges();
    expect(text()).toContain('1 de 1 visita atendida');
    expect(text()).toContain('Paquete uno');
  });

  it('una ruta sin paradas lo explica', () => {
    setup('0', { ...journey, routes: [{ ...journey.routes[0], waypoints: [] }] });
    expect(text()).toContain('Esta ruta no tiene paradas');
  });

  for (const index of ['7', '-1', 'abc', '1.5', '']) {
    it(`el índice «${index}» que no corresponde a una ruta muestra «El registro ya no existe» con enlace a la jornada`, () => {
      setup(index);
      expect(text()).toContain('El registro ya no existe');
      expect(root().querySelector('a[href^="/jornadas/"]')?.getAttribute('href')).toBe(`/jornadas/${journey.id}`);
      expect(root().querySelector('app-routes-map')).toBeNull();
    });
  }

  it('una jornada inexistente (404) enlaza al listado', () => {
    setup('0', undefined, { status: 404 });
    expect(text()).toContain('El registro ya no existe');
    expect(root().querySelector('a[href="/jornadas"]')).not.toBeNull();
  });

  it('un fallo de red muestra el error y permite volver al listado', () => {
    setup('0', undefined, { status: 500 });
    expect(root().querySelector('[role="alert"]')?.textContent?.trim()).toBeTruthy();
    expect(root().querySelector('a[href="/jornadas"]')).not.toBeNull();
  });

  describe('presentación', () => {
    it('el resumen, el mapa y las paradas van en tarjetas, con el resumen como rejilla de datos', () => {
      setup('0');
      const ids = Array.from(root().querySelectorAll('section.card')).map((s) => s.getAttribute('aria-labelledby'));
      expect(ids).toEqual(['summary-title', 'map-title', 'stops-title']);
      const grid = root().querySelector('dl.summary.stat-grid') as HTMLElement;
      expect(getComputedStyle(grid).display).toBe('grid');
    });

    it('el enlace de vuelta a la jornada va sobre el título', () => {
      setup('0');
      const head = root().querySelector('.page-head') as HTMLElement;
      expect(head.firstElementChild?.tagName).toBe('A');
      expect(head.querySelector('h1')?.textContent).toBe('Capture vehicle');
    });
  });
});
