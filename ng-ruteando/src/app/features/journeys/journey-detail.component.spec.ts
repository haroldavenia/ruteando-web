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
  /** Pares nombre → valor de las cifras de una tarjeta de ruta. */
  const figures = (route: Element): Record<string, string> =>
    Object.fromEntries(Array.from(route.querySelectorAll('dl.figures > div')).map((d) => [d.querySelector('dt')!.textContent!.trim(), d.querySelector('dd')!.textContent!.trim()]));

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

  it('cada ruta es una tarjeta con su nombre, su vehículo y sus paradas, distancia, duración y usos', () => {
    setup(listed.id, fx(get).response.body);
    const route = root().querySelector('li.route')!;

    expect(route.querySelector('h3')?.textContent?.trim()).toBe('Postman route');
    expect(route.querySelector('.vehicle')?.textContent?.trim()).toBe('Postman resource');
    expect(figures(route)).toEqual({ Paradas: '0', Distancia: '1,0 km', 'Duración': '10 min', Peso: '—', Volumen: '—', Inicio: '—', Fin: '—' });
    expect(Array.from(route.querySelectorAll('.actions > *')).map((a) => a.textContent?.trim())).toEqual(['Ver en el mapa', 'Ver ruta']);
  });

  it('las paradas se abren y se cierran, en orden y con el tipo en español', () => {
    setup(planned.id, fx(plan).response.body);
    const toggle = root().querySelector('li.route button[aria-expanded]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(root().querySelector('li.route .stops')).toBeNull();

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root().querySelector('li.route .stops')?.id).toBe(toggle.getAttribute('aria-controls')!);
    const stops = Array.from(root().querySelectorAll('li.route .stops tbody tr')).map(cells);
    expect(stops.every((s) => s[5] === 'Ver en el mapa')).toBeTrue();
    expect(stops.length).toBe(planned.routes[0].waypoints.length);
    const orders = stops.map((s) => Number(s[0]));
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(stops.some((s) => s[1] === 'Servicio')).toBeTrue();
    expect(stops.every((s) => /^-?\d+,\d{5} \/ -?\d+,\d{5}$/.test(s[2]))).toBeTrue();

    toggle.click();
    fixture.detectChanges();
    expect(root().querySelector('li.route .stops')).toBeNull();
  });

  it('las paradas se apilan en una caja estrecha: cada celda lleva su etiqueta y la tabla no se desplaza', () => {
    setup(planned.id, fx(plan).response.body);
    (root().querySelector('li.route button[aria-expanded]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const row = root().querySelector('li.route .stops tbody tr') as HTMLElement;

    expect(Array.from(row.querySelectorAll('td')).map((td) => td.getAttribute('data-label'))).toEqual([null, 'Tipo', 'Latitud / longitud', 'Llegada', 'Salida', null]);
    expect(row.querySelector('td')?.classList).toContain('primary-cell');

    root().style.display = 'block';
    root().style.width = '360px';
    const box = root().querySelector('li.route .stops .stack-scope') as HTMLElement;
    expect(getComputedStyle(row).display).toBe('grid');
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
  });

  it('una ruta sin paradas lo dice al abrirla', () => {
    setup(listed.id, fx(get).response.body);
    (root().querySelector('li.route button[aria-expanded]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root().querySelector('li.route .stops')?.textContent).toContain('Esta ruta no tiene paradas');
  });

  it('cada ruta enlaza a su detalle con un nombre accesible', () => {
    setup(listed.id, fx(get).response.body);
    const link = root().querySelector('li.route a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(`/jornadas/${listed.id}/rutas/0`);
    expect(link.getAttribute('aria-label')).toBe('Ver la ruta Postman route');
    expect(link.textContent).toContain('Ver ruta');
  });

  it('el botón de paradas nombra la ruta', () => {
    setup(listed.id, fx(get).response.body);
    expect(root().querySelector('li.route button[aria-expanded]')?.getAttribute('aria-label')).toBe('Ver las paradas de Postman route');
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

    it('con rutas aparece entre el resumen y la lista de rutas', async () => {
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

    it('«Ver en el mapa» en una ruta la resalta en el mapa, en la leyenda y en su tarjeta', async () => {
      setup(planned.id, fx(plan).response.body);
      await waitForMap();
      const button = root().querySelector('li.route .actions button[aria-label^="Ver la ruta"]') as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe('Ver la ruta Capture vehicle en el mapa');
      button.click();
      fixture.detectChanges();

      expect(root().querySelector('.legend .item')?.getAttribute('aria-pressed')).toBe('true');
      expect(root().querySelector('li.route')?.classList.contains('focused')).toBeTrue();
      expect(root().textContent).toContain('Ruta enfocada: Capture vehicle');
    });

    it('«Ver en el mapa» en una parada abre su ficha y marca la ruta', async () => {
      setup(planned.id, fx(plan).response.body);
      await waitForMap();
      (root().querySelector('li.route button[aria-expanded]') as HTMLButtonElement).click();
      fixture.detectChanges();
      const stopButton = root().querySelector('li.route .stops button[aria-label^="Ver la parada 1"]') as HTMLButtonElement;
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

    it('«Ver todas» en el mapa quita el enfoque de la tarjeta', async () => {
      setup(planned.id, fx(plan).response.body);
      await waitForMap();
      (root().querySelector('li.route .actions button[aria-label^="Ver la ruta"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      (Array.from(root().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Ver todas'))!.click();
      fixture.detectChanges();
      expect(root().querySelector('li.route')?.classList.contains('focused')).toBeFalse();
    });
  });

  describe('tarjetas de ruta y vista dividida', () => {
    const colorOf = (route: Element) => (route as HTMLElement).style.getPropertyValue('--route-color');

    it('cada tarjeta lleva la franja del color que su ruta tiene en el mapa, y el nombre sigue siendo lo que la identifica', () => {
      setup(planned.id, fx(plan).response.body);
      const route = root().querySelector('li.route')!;

      expect(colorOf(route)).toMatch(/^#[0-9a-f]{6}$/i);
      expect(getComputedStyle(route).borderInlineStartWidth).toBe('6px');
      expect(route.querySelector('h3')?.textContent?.trim().length).toBeGreaterThan(0);
    });

    it('el uso de peso y de volumen se ve también como una barra decorativa, además del porcentaje', () => {
      const body = fx(plan).response.body as { routes: object[] };
      setup(planned.id, { ...body, routes: [{ ...body.routes[0], weightUsagePercent: 68, volumeUsagePercent: 140 }] });
      const bars = Array.from(root().querySelectorAll('li.route .bar')) as HTMLElement[];
      const fill = (bar: HTMLElement) => (bar.querySelector('i') as HTMLElement).style.width;

      expect(bars.length).toBe(2);
      expect(bars.every((b) => b.getAttribute('aria-hidden') === 'true')).toBeTrue();
      expect(figures(root().querySelector('li.route')!)['Peso']).toBe('68 %');
      expect(fill(bars[0])).toBe('68%');
      // Un uso por encima del 100 % no desborda la barra
      expect(fill(bars[1])).toBe('100%');
    });

    it('sin dato de uso la barra queda vacía', () => {
      setup(listed.id, fx(get).response.body);

      expect(Array.from(root().querySelectorAll('li.route .bar i')).map((i) => (i as HTMLElement).style.width)).toEqual(['0%', '0%']);
    });

    it('con rutas el mapa y la lista van en una vista dividida, con el mapa fijo; sin rutas no hay vista dividida', () => {
      setup(planned.id, fx(plan).response.body);
      const split = root().querySelector('.split-view') as HTMLElement;

      expect(split.querySelector(':scope > section.sticky')?.getAttribute('aria-labelledby')).toBe('map-title');
      expect(split.querySelector(':scope > section:not(.sticky)')?.getAttribute('aria-labelledby')).toBe('routes-title');
      fixture.destroy();
      TestBed.resetTestingModule();

      setup(listed.id, { ...(fx(get).response.body as object), routes: [] });
      expect(root().querySelector('.split-view')).toBeNull();
    });

    it('por debajo de 1100px el mapa va sobre la lista; desde 1100px, a su izquierda y fijo', () => {
      setup(planned.id, fx(plan).response.body);
      const map = (root().querySelector('.split-view > .sticky') as HTMLElement).getBoundingClientRect();
      const list = (root().querySelector('.split-view > section:not(.sticky)') as HTMLElement).getBoundingClientRect();

      if (window.matchMedia('(min-width: 1100px)').matches) {
        expect(list.left).toBeGreaterThanOrEqual(map.right);
        expect(getComputedStyle(root().querySelector('.split-view > .sticky')!).position).toBe('sticky');
      } else {
        expect(list.top).toBeGreaterThanOrEqual(map.bottom);
        expect(getComputedStyle(root().querySelector('.split-view > .sticky')!).position).not.toBe('sticky');
      }
    });

    it('el enlace de vuelta ofrece volver a las jornadas', () => {
      setup(planned.id, fx(plan).response.body);

      expect(root().querySelector('app-form-head a.back')?.getAttribute('href')).toBe('/jornadas');
      expect(root().querySelector('app-form-head a.back')?.textContent?.trim()).toBe('Jornadas');
    });
  });

  describe('presentación', () => {
    const ownStyles = () => ((JourneyDetailComponent as unknown as { ɵcmp: { styles?: string[] } }).ɵcmp.styles ?? []).join('\n');

    it('el resumen, el mapa, las rutas y los paquetes no planificables van en tarjetas', () => {
      setup(planned.id, { ...(fx(plan).response.body as object), invalidPackageIds: ['p1'] });
      const ids = Array.from(root().querySelectorAll('section.card')).map((s) => s.getAttribute('aria-labelledby'));
      expect(ids).toEqual(['summary-title', 'map-title', 'routes-title', 'invalid-title']);
    });

    it('el resumen es una rejilla de datos con el marcado dl > div > dt y dd, y el estado como etiqueta', () => {
      setup(planned.id, fx(plan).response.body);
      const grid = root().querySelector('dl.summary.stat-grid') as HTMLElement;
      expect(getComputedStyle(grid).display).toBe('grid');
      expect(grid.querySelector('div > dt')).not.toBeNull();
      const badge = grid.querySelector('dd app-status-badge') as HTMLElement;
      expect(badge.querySelector('span')?.textContent).toBe('Completada');
      expect(badge.getAttribute('data-tone')).toBe('success');
    });

    it('el enlace de vuelta va sobre el título, en la cabecera de la pantalla', () => {
      setup(planned.id, fx(plan).response.body);
      const head = root().querySelector('.page-head') as HTMLElement;
      expect(head.firstElementChild?.tagName).toBe('A');
      expect(head.querySelector('h1')?.textContent).toBe('Capture timed probe');
    });

    it('no declara estilos propios de título, de resumen ni de sección', () => {
      expect(ownStyles()).not.toMatch(/h1|h2|summary|dt|dd/);
    });
  });
});
