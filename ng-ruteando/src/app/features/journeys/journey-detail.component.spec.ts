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

import { JourneyDetailComponent } from './journey-detail.component';

import get from '../../../testing/fixtures/gateway/get__journeys__id.json';
import plan from '../../../testing/fixtures/gateway/post__journeys__plan.json';

const fx = (f: unknown) => f as Fixture;
const listed = fx(get).response.body as { id: string };
const planned = fx(plan).response.body as { id: string; routes: { waypoints: unknown[] }[] };

describe('JourneyDetailComponent', () => {
  let fixture: ComponentFixture<JourneyDetailComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent!.replace(/\s+/g, ' ');
  /** Pares etiqueta → valor del resumen. */
  const summary = (): Record<string, string> =>
    Object.fromEntries(Array.from(root().querySelectorAll('dl.summary > div')).map((d) => [d.querySelector('dt')!.textContent!.trim(), d.querySelector('dd')!.textContent!.trim()]));
  const cells = (row: Element) => Array.from(row.querySelectorAll('td, th')).map((c) => c.textContent!.trim());

  function setup(id: string, body?: unknown, error?: { status: number }): void {
    TestBed.configureTestingModule({
      imports: [JourneyDetailComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(JourneyDetailComponent);
    fixture.detectChanges();
    const req = http.expectOne(`/gateway/journeys/${id}`);
    if (error) {
      req.flush({ message: 'nf' }, { status: error.status, statusText: 'x' });
    } else {
      req.flush(body as object);
    }
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('muestra el resumen del ejemplo planificado con los tiempos formateados', () => {
    setup(planned.id, fx(plan).response.body);
    expect(root().querySelector('h1')?.textContent).toBe('Capture timed probe');
    expect(summary()).toEqual(
      jasmine.objectContaining({
        Estado: 'Completada',
        'Configuración': 'Capture settings 20',
        Servicios: '2',
        'Vehículos': '1',
        'Tiempo mínimo': '8 min',
        'Tiempo medio': '8 min',
        'Tiempo máximo': '8 min',
      }),
    );
  });

  it('una jornada sin estadísticas ni totales muestra «—»', () => {
    setup(listed.id, fx(get).response.body);
    expect(summary()).toEqual(jasmine.objectContaining({ Estado: 'Planificada', Servicios: '—', 'Tiempo medio': '—' }));
  });

  it('la tabla de rutas muestra nombre, vehículo, paradas, distancia, duración y usos', () => {
    setup(listed.id, fx(get).response.body);
    // [botón, ruta, vehículo, paradas, distancia, duración, peso, volumen, inicio, fin]
    expect(cells(root().querySelector('tr.route')!).slice(1)).toEqual(['Postman route', 'Postman resource', '0', '1,0 km', '10 min', '—', '—', '—', '—', 'Ver en el mapa', 'Ver ruta']);
  });

  it('las paradas se abren y se cierran, en orden y con el tipo en español', () => {
    setup(planned.id, fx(plan).response.body);
    const toggle = root().querySelector('tr.route button') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(root().querySelector('tr.stops')).toBeNull();

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const stops = Array.from(root().querySelectorAll('tr.stops tbody tr')).map(cells);
    expect(stops.every((s) => s[5] === 'Ver en el mapa')).toBeTrue();
    expect(stops.length).toBe(planned.routes[0].waypoints.length);
    const orders = stops.map((s) => Number(s[0]));
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(stops.some((s) => s[1] === 'Servicio')).toBeTrue();
    expect(stops.every((s) => /^-?\d+,\d{5} \/ -?\d+,\d{5}$/.test(s[2]))).toBeTrue();

    toggle.click();
    fixture.detectChanges();
    expect(root().querySelector('tr.stops')).toBeNull();
  });

  it('una ruta sin paradas lo dice al abrirla', () => {
    setup(listed.id, fx(get).response.body);
    (root().querySelector('tr.route button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root().querySelector('tr.stops')?.textContent).toContain('Esta ruta no tiene paradas');
  });

  it('cada ruta enlaza a su detalle con un nombre accesible', () => {
    setup(listed.id, fx(get).response.body);
    const link = root().querySelector('tr.route a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(`/jornadas/${listed.id}/rutas/0`);
    expect(link.getAttribute('aria-label')).toBe('Ver la ruta Postman route');
    expect(link.textContent).toContain('Ver ruta');
  });

  it('el botón de paradas nombra la ruta', () => {
    setup(listed.id, fx(get).response.body);
    expect(root().querySelector('tr.route button')?.getAttribute('aria-label')).toBe('Ver las paradas de Postman route');
  });

  it('una jornada sin rutas lo explica', () => {
    setup(listed.id, { ...(fx(get).response.body as object), routes: [] });
    expect(text()).toContain('Esta jornada no tiene rutas');
    expect(root().querySelector('table')).toBeNull();
  });

  it('lista los paquetes no planificables con enlace a su ficha', () => {
    setup(listed.id, { ...(fx(get).response.body as object), invalidPackageIds: ['p1', 'p2'] });
    const links = Array.from(root().querySelectorAll('#invalid-title ~ ul a')) as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/paquetes/p1', '/paquetes/p2']);
    expect(text()).toContain('Paquetes que no se pudieron planificar');
  });

  it('sin paquetes no planificables no muestra esa sección', () => {
    setup(listed.id, fx(get).response.body);
    expect(root().querySelector('#invalid-title')).toBeNull();
  });

  it('un identificador inexistente (404) enlaza al listado', () => {
    setup('no-existe', undefined, { status: 404 });
    expect(text()).toContain('El registro ya no existe');
    expect(root().querySelector('a[href="/jornadas"]')).not.toBeNull();
  });

  it('otro error se muestra con su mensaje', () => {
    setup('x', undefined, { status: 500 });
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('El servicio no está disponible');
  });

  describe('mapa de las rutas', () => {
    const mapComponent = () => root().querySelector('app-routes-map');
    const waitForMap = async () => {
      for (let i = 0; i < 100 && !root().querySelector('.ol-viewport'); i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      fixture.detectChanges();
    };

    it('con rutas aparece entre el resumen y la tabla de rutas', async () => {
      setup(planned.id, fx(plan).response.body);
      await waitForMap();
      const order = Array.from(root().querySelectorAll('h2')).map((h) => h.textContent!.trim());
      expect(order).toEqual(['Resumen', 'Mapa de las rutas', 'Rutas']);
      expect(mapComponent()).not.toBeNull();
      expect(root().querySelector('.ol-viewport')).not.toBeNull();
    });

    it('sin rutas no hay mapa', () => {
      setup(listed.id, { ...(fx(get).response.body as object), routes: [] });
      expect(mapComponent()).toBeNull();
    });

    it('«Ver en el mapa» en una ruta la resalta en el mapa, en la leyenda y en la tabla', async () => {
      setup(planned.id, fx(plan).response.body);
      await waitForMap();
      const button = root().querySelector('tr.route button[aria-label^="Ver la ruta"]') as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe('Ver la ruta Capture vehicle en el mapa');
      button.click();
      fixture.detectChanges();

      expect(root().querySelector('.legend .item')?.getAttribute('aria-pressed')).toBe('true');
      expect(root().querySelector('tr.route')?.classList.contains('focused')).toBeTrue();
      expect(root().textContent).toContain('Ruta enfocada: Capture vehicle');
    });

    it('«Ver en el mapa» en una parada abre su ficha y marca la ruta', async () => {
      setup(planned.id, fx(plan).response.body);
      await waitForMap();
      (root().querySelector('tr.route button[aria-expanded]') as HTMLButtonElement).click();
      fixture.detectChanges();
      const stopButton = root().querySelector('tr.stops button[aria-label^="Ver la parada 1"]') as HTMLButtonElement;
      expect(stopButton.getAttribute('aria-label')).toBe('Ver la parada 1 de Capture vehicle en el mapa');
      stopButton.focus();
      stopButton.click();
      fixture.detectChanges();

      const card = root().querySelector('app-routes-map .card');
      expect(card?.textContent).toContain('Parada 1');
      expect(card?.textContent).toContain('Servicio');
      expect(root().querySelector('.legend .item')?.getAttribute('aria-pressed')).toBe('true');

      (root().querySelector('button[aria-label="Cerrar la ficha de la parada"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(document.activeElement).toBe(stopButton);
    });

    it('«Ver todas» en el mapa quita el enfoque de la tabla', async () => {
      setup(planned.id, fx(plan).response.body);
      await waitForMap();
      (root().querySelector('tr.route button[aria-label^="Ver la ruta"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      (Array.from(root().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Ver todas'))!.click();
      fixture.detectChanges();
      expect(root().querySelector('tr.route')?.classList.contains('focused')).toBeFalse();
    });
  });
});
