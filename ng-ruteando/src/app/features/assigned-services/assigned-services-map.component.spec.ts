import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { Fixture } from '../../../testing/api-testing';
import { SERVICE } from '../../../testing/assigned-services';
import journeyFixture from '../../../testing/fixtures/gateway/get__journeys__id.json';
import { TEST_MAP_CONFIG } from '../../../testing/map';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { MAP_CONFIG } from '../../shared/map/map-config';
import { AssignedServicesMapComponent } from './assigned-services-map.component';

const base = (journeyFixture as unknown as Fixture).response.body as { routes: Record<string, unknown>[] };
const journey = (id: string, name: string) => ({
  ...(base as object),
  id,
  name,
  routes: [
    { ...base.routes[0], routeIndex: 0, name: 'Ruta A' },
    { ...base.routes[0], routeIndex: 1, name: 'Ruta B' },
  ],
});

describe('AssignedServicesMapComponent', () => {
  let fixture: ComponentFixture<AssignedServicesMapComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AssignedServicesMapComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssignedServicesMapComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lee cada jornada una sola vez y dibuja las rutas asignadas con la leyenda', () => {
    http
      .expectOne('/gateway/assigned-services')
      .flush([SERVICE, { ...SERVICE, id: 's2', route: { journeyId: 'j1', routeIndex: 0 } }]);
    http.expectOne('/gateway/journeys/j1').flush(journey('j1', 'Reparto norte'));
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush([]));
    fixture.detectChanges();
    expect(root().querySelector('app-routes-map')).not.toBeNull();
    const legend = Array.from(root().querySelectorAll('.legend .item')).map((b) => b.textContent!.replace(/\s+/g, ' '));
    expect(legend.length).toBe(2);
    expect(legend[0]).toContain('Reparto norte · Ruta B');
    expect(legend[1]).toContain('Reparto norte · Ruta A');
  });

  it('si una jornada no se puede leer, dibuja el resto y avisa de cuántos servicios quedaron fuera', () => {
    http
      .expectOne('/gateway/assigned-services')
      .flush([SERVICE, { ...SERVICE, id: 's2', route: { journeyId: 'j2', routeIndex: 0 } }]);
    http.expectOne('/gateway/journeys/j1').flush(journey('j1', 'Reparto norte'));
    http.expectOne('/gateway/journeys/j2').flush({ message: 'x' }, { status: 500, statusText: 'x' });
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush([]));
    fixture.detectChanges();
    expect(root().textContent).toContain('1 servicio no se dibuja porque no se pudo leer su ruta.');
    expect(root().querySelectorAll('.legend .item').length).toBe(1);
  });

  it('sin servicios asignados lo dice y ofrece asignar una ruta', () => {
    http.expectOne('/gateway/assigned-services').flush([]);
    fixture.detectChanges();
    expect(root().textContent).toContain('Todavía no hay rutas asignadas que dibujar.');
    expect(root().querySelector('app-routes-map')).toBeNull();
    expect(root().querySelector('a[href="/assigned-services/new"]')).not.toBeNull();
  });

  it('si falla la lista de servicios muestra el error y la vuelta al listado', () => {
    http.expectOne('/gateway/assigned-services').flush({ message: 'x' }, { status: 500, statusText: 'x' });
    fixture.detectChanges();
    expect(root().querySelector('[role="alert"]')).not.toBeNull();
    expect(root().querySelector('a[href="/assigned-services"]')).not.toBeNull();
  });
});
