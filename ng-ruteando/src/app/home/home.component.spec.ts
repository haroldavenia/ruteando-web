import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { makeUser } from '../../testing/session';
import { API_BASE_URL } from '../core/api/api-config';
import { errorInterceptor } from '../core/api/error.interceptor';
import { CurrentUser } from '../core/auth/current-user';
import { UserRole } from '../core/auth/session.model';

import { HomeComponent } from './home.component';

const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}T10:00:00Z`;
const journey = (n: number, status = 'planned') => ({ id: `j${n}`, name: `Jornada ${n}`, status, createdAt: day(n) });
const page = (content: unknown[], total = content.length) => ({ content, page: 0, size: 5, totalElements: total, totalPages: Math.max(1, Math.ceil(total / 5)) });

/** Un paquete mínimo: las cifras solo miran su estado. */
const pack = (status: string, n = 0) => ({ id: `p${n}`, name: `Paquete ${n}`, status });
const packagePage = (statuses: string[], total = statuses.length) => ({
  content: statuses.map(pack),
  page: 0,
  size: 100,
  totalElements: total,
  totalPages: Math.max(1, Math.ceil(total / 100)),
});

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent!.replace(/\s+/g, ' ');
  const journeyLinks = () => Array.from(root().querySelectorAll('.journeys li a')) as HTMLAnchorElement[];
  const journeyRequests = () => http.match((r) => r.method === 'GET' && r.url === '/gateway/journeys');
  const packageRequests = () => http.match((r) => r.method === 'GET' && r.url === '/gateway/packages');

  /**
   * Abre la home; `answer` contesta la petición de jornadas (por defecto, una lista vacía) y `packages` la de paquetes de las cifras
   * (por defecto, sin paquetes; `null` la deja pendiente).
   */
  function open(role: UserRole, answer: unknown | null = page([]), platform = 'browser', packages: unknown | null = packagePage([])): void {
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: PLATFORM_ID, useValue: platform },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(CurrentUser).set(makeUser({ role }));
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    if (answer !== null) {
      journeyRequests().forEach((req) => req.flush(answer as object));
    }
    if (packages !== null) {
      packageRequests().forEach((req) => req.flush(packages as object));
    }
    fixture.detectChanges();
  }

  // Lo que una prueba deje pendiente a propósito se contesta al terminar, para que `verify` solo vea peticiones inesperadas
  afterEach(() => {
    packageRequests().forEach((req) => req.flush(packagePage([])));
    http.verify();
  });

  describe('saludo y fecha', () => {
    /** Abre la home con el reloj en una hora local concreta. */
    function openAt(hour: number, role: UserRole = 'agent'): void {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2026, 9, 30, hour, 15));
      try {
        open(role);
      } finally {
        jasmine.clock().uninstall();
      }
    }

    it('saluda según la hora, con el nombre de la persona', () => {
      openAt(9);
      expect(root().querySelector('h1')?.textContent).toBe('Buenos días, Prueba');
      TestBed.resetTestingModule();
      openAt(15);
      expect(root().querySelector('h1')?.textContent).toBe('Buenas tardes, Prueba');
      TestBed.resetTestingModule();
      openAt(21);
      expect(root().querySelector('h1')?.textContent).toBe('Buenas noches, Prueba');
    });

    it('sin nombre saluda con el correo', () => {
      TestBed.configureTestingModule({
        imports: [HomeComponent],
        providers: [provideRouter([]), { provide: API_BASE_URL, useValue: '/gateway' }, provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
      });
      http = TestBed.inject(HttpTestingController);
      TestBed.inject(CurrentUser).set(makeUser({ role: 'driver', firstName: null, lastName: null, email: 'zoe@example.invalid' }));
      const nameless = TestBed.createComponent(HomeComponent);
      nameless.detectChanges();
      expect((nameless.nativeElement as HTMLElement).querySelector('h1')?.textContent).toMatch(/^Buen[oa]s (días|tardes|noches), zoe@example\.invalid$/);
    });

    it('tiene un único h1, el saludo, y los títulos de sus tarjetas son h2', () => {
      open('agent');
      expect(root().querySelectorAll('h1').length).toBe(1);
      expect(Array.from(root().querySelectorAll('h2')).map((h) => h.textContent)).toEqual(['Paquetes atendidos', 'Últimas jornadas']);
    });

    it('muestra la fecha de hoy con el día de la semana, sin coma: «viernes 30 de octubre»', () => {
      openAt(9);
      expect(root().querySelector('.date')?.textContent).toBe('viernes 30 de octubre');
    });

    it('la fecha va en mayúsculas con espaciado entre letras, solo con estilos', () => {
      open('agent');
      const style = getComputedStyle(root().querySelector('.date')!);
      expect(style.textTransform).toBe('uppercase');
      expect(parseFloat(style.letterSpacing)).toBeGreaterThan(0);
    });
  });

  describe('resumen bajo el saludo', () => {
    const summary = () => root().querySelector('.greeting')?.textContent;

    it('sin datos, la frase de siempre', () => {
      open('driver', null);
      expect(summary()).toBe('Planificación de rutas.');
    });

    it('con jornadas en curso y paquetes pendientes los dice con lo que ya se sabe', () => {
      open('agent', page([journey(3, 'in_progress'), journey(2, 'in_progress'), journey(1)]), 'browser', packagePage(['pending', 'pending', 'pending', 'attended']));
      expect(summary()).toBe('2 de las últimas jornadas están en curso y hay 3 paquetes esperando ruta.');
    });

    it('en singular concuerda', () => {
      open('agent', page([journey(1, 'in_progress')]), 'browser', packagePage(['pending']));
      expect(summary()).toBe('1 de las últimas jornadas está en curso y hay 1 paquete esperando ruta.');
    });

    it('si solo hay paquetes pendientes, dice solo eso', () => {
      open('agent', page([journey(1)]), 'browser', packagePage(['pending', 'pending']));
      expect(summary()).toBe('Hay 2 paquetes esperando ruta.');
    });

    it('si los paquetes son solo los más recientes, lo aclara', () => {
      open('agent', page([]), 'browser', packagePage(['pending', 'attended'], 250));
      expect(summary()).toBe('Hay 1 paquete esperando ruta entre los más recientes.');
    });

    it('sin paquetes pendientes ni jornadas en curso vuelve a la frase de siempre', () => {
      open('agent', page([journey(1, 'completed')]), 'browser', packagePage(['attended']));
      expect(summary()).toBe('Planificación de rutas.');
    });
  });

  describe('áreas', () => {
    it('no hay rejilla de accesos: el riel y la búsqueda de la barra ya llevan a cada área', () => {
      open('tenant_admin');
      expect(root().querySelector('.tile-grid, a.tile')).toBeNull();
      expect(root().querySelector('#areas-title')).toBeNull();
    });

    it('el conductor lee que su rol no tiene áreas, y los demás roles no ven ese mensaje', () => {
      open('driver', null);
      expect(root().querySelector('.no-areas')?.textContent).toContain('Tu rol no tiene áreas disponibles en la aplicación web');
      TestBed.resetTestingModule();
      open('agent');
      expect(root().querySelector('.no-areas')).toBeNull();
      expect(text()).not.toContain('Tu rol no tiene áreas');
    });
  });

  describe('cabecera', () => {
    const actions = () => Array.from(root().querySelectorAll('.hero-actions a')) as HTMLAnchorElement[];

    for (const role of ['tenant_admin', 'super_admin', 'agent'] as const) {
      it(`${role} puede planificar una jornada e importar paquetes desde la cabecera`, () => {
        open(role);
        expect(actions().map((a) => a.textContent?.trim())).toEqual(['addPlanificar jornada', 'Importar paquetes']);
        expect(actions().map((a) => a.getAttribute('href'))).toEqual(['/jornadas/nueva', '/paquetes/importar']);
        expect(root().querySelectorAll('.hero-actions mat-icon[aria-hidden="true"]').length).toBe(1);
      });
    }

    it('el conductor no ve las acciones: su rol no puede abrir jornadas ni paquetes', () => {
      open('driver', null);
      expect(root().querySelector('.hero-actions')).toBeNull();
      expect(root().querySelector('h1')?.textContent).toMatch(/^Buen/);
    });

    it('las acciones miden 48px de alto y tienen las esquinas de las pantallas de acceso', () => {
      open('agent');
      for (const action of actions()) {
        expect(Math.round(action.getBoundingClientRect().height)).toBe(48);
        expect(getComputedStyle(action).borderTopLeftRadius).toBe('12px');
      }
    });

    it('la acción principal lleva el degradado de la marca y la secundaria, solo contorno', () => {
      open('agent');
      expect(getComputedStyle(actions()[0]).backgroundImage).toContain('linear-gradient');
      expect(getComputedStyle(actions()[1]).backgroundImage).toBe('none');
    });

    it('el mapa de la ciudad es decorativo: oculto a lectores, sin nada enfocable', () => {
      open('tenant_admin');
      const map = root().querySelector('.hero-art app-city-map') as HTMLElement;
      expect(map.getAttribute('aria-hidden')).toBe('true');
      expect(map.querySelectorAll('a, button, [tabindex]').length).toBe(0);
    });

    it('la fecha, el saludo y las acciones van antes que el mapa en el orden de lectura', () => {
      open('agent');
      const header = root().querySelector('header.hero')!;
      expect(header.children[0].classList.contains('hero-copy')).toBeTrue();
      expect(header.children[1].classList.contains('hero-art')).toBeTrue();
    });

    it('el titular lleva Manrope, con peso 800', () => {
      open('agent');
      const style = getComputedStyle(root().querySelector('h1')!);
      expect(style.fontFamily).toContain('Manrope');
      expect(style.fontWeight).toBe('800');
    });
  });

  describe('presentación', () => {
    it('con el tema oscuro del sistema las tarjetas cambian de fondo', () => {
      open('agent', page([journey(1)]));
      const card = root().querySelector('section.card') as HTMLElement;
      root().style.colorScheme = 'light';
      document.body.appendChild(root());
      const light = getComputedStyle(card).backgroundColor;
      root().style.colorScheme = 'dark';
      const dark = getComputedStyle(card).backgroundColor;
      root().remove();
      expect(dark).not.toBe(light);
    });
  });

  describe('cifras de paquetes', () => {
    const card = () => root().querySelector('section.figures') as HTMLElement;
    const kpis = () => Array.from(root().querySelectorAll('.kpis .kpi')) as HTMLElement[];
    const mixed = ['attended', 'attended', 'attended', 'pending', 'pending', 'unattended', 'cancelled', 'returned'];

    it('pide una sola página de los 100 paquetes más recientes, sin recorrer todas, y solo a quien opera', () => {
      open('agent', page([]), 'browser', null);
      const req = http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/packages');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('100');
      req.flush(packagePage([]));
    });

    it('muestra el porcentaje de atendidos en el anillo y la frase «N de M paquetes»', () => {
      open('tenant_admin', page([]), 'browser', packagePage(mixed));
      expect(card().querySelector('#figures-title')?.textContent).toBe('Paquetes atendidos');
      expect(card().querySelector('app-progress-ring .value')?.textContent?.trim()).toBe('38%');
      expect(card().querySelector('.summary')?.textContent).toBe('3 de 8 paquetes');
    });

    it('el anillo mide 168px', () => {
      open('agent', page([]), 'browser', packagePage(mixed));
      const ring = card().querySelector('app-progress-ring') as HTMLElement;
      expect(Math.round(ring.getBoundingClientRect().width)).toBe(168);
    });

    it('la leyenda dice cuántos hay pendientes y sin atender, con un punto de color que no es la única señal', () => {
      open('agent', page([]), 'browser', packagePage(mixed));
      expect(Array.from(card().querySelectorAll('.legend li')).map((li) => li.textContent?.trim())).toEqual(['2 pendientes', '1 sin atender']);
      expect(card().querySelectorAll('.legend .dot[aria-hidden="true"]').length).toBe(2);
    });

    it('si hay más paquetes que los pedidos, la frase aclara que son los más recientes y de cuántos', () => {
      open('agent', page([]), 'browser', packagePage(mixed, 250));
      expect(card().querySelector('.summary')?.textContent).toBe('3 de 8 paquetes (los más recientes de 250)');
    });

    it('muestra las cifras de pendientes y sin atender, con la de aviso diferenciada', () => {
      open('agent', page([]), 'browser', packagePage(mixed));
      expect(kpis().map((kpi) => [kpi.querySelector('mat-icon')?.textContent?.trim(), kpi.querySelector('.num')?.textContent, kpi.querySelector('.lbl')?.textContent])).toEqual([
        ['schedule', '2', 'Pendientes de ruta'],
        ['warning', '1', 'Sin atender'],
      ]);
      expect(kpis().map((kpi) => kpi.classList.contains('warn'))).toEqual([false, true]);
      expect(root().querySelector('.kpis')?.getAttribute('aria-label')).toBe('Paquetes por atender');
      expect(root().querySelectorAll('.kpi mat-icon[aria-hidden="true"]').length).toBe(2);
    });

    it('las cifras llevan Manrope con peso 800', () => {
      open('agent', page([]), 'browser', packagePage(mixed));
      const style = getComputedStyle(root().querySelector('.kpi .num')!);
      expect(style.fontFamily).toContain('Manrope');
      expect(style.fontWeight).toBe('800');
    });

    it('sin paquetes lo dice, ofrece crear el primero y no muestra cifras sueltas', () => {
      open('agent', page([]), 'browser', packagePage([]));
      expect(card().textContent).toContain('Todavía no hay paquetes');
      const create = Array.from(card().querySelectorAll('a')).find((a) => a.textContent?.includes('Crear el primer paquete'))!;
      expect(create.getAttribute('href')).toBe('/paquetes/nuevo');
      expect(card().querySelector('app-progress-ring')).toBeNull();
      expect(kpis().length).toBe(0);
    });

    it('mientras llegan muestra un indicador accesible y las jornadas siguen su curso', () => {
      open('agent', page([journey(1)]), 'browser', null);
      expect(card().querySelector('mat-progress-bar')?.getAttribute('aria-label')).toBe('Cargando las cifras de paquetes');
      expect(journeyLinks().length).toBe(1);
      expect(kpis().length).toBe(0);
    });

    it('ante un error muestra el mensaje y «Reintentar» vuelve a pedirlas, sin afectar a las jornadas', () => {
      open('agent', page([journey(1)]), 'browser', null);
      http.expectOne((r) => r.url === '/gateway/packages').flush({ message: 'caído' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(card().querySelector('[role="alert"]')?.textContent?.trim()).toBeTruthy();
      expect(journeyLinks().length).toBe(1);
      expect(root().querySelectorAll('section.card[aria-labelledby="journeys-title"] [role="alert"]').length).toBe(0);

      (Array.from(card().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Reintentar') as HTMLButtonElement).click();
      fixture.detectChanges();
      http.expectOne((r) => r.url === '/gateway/packages').flush(packagePage(mixed));
      fixture.detectChanges();
      expect(card().querySelector('[role="alert"]')).toBeNull();
      expect(card().querySelector('.summary')?.textContent).toBe('3 de 8 paquetes');
    });

    it('un error en las jornadas no oculta las cifras', () => {
      open('agent', null, 'browser', packagePage(mixed));
      http.expectOne((r) => r.url === '/gateway/journeys').flush({ message: 'caído' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(card().querySelector('.summary')?.textContent).toBe('3 de 8 paquetes');
      expect(kpis().length).toBe(2);
    });

    it('el conductor y el render del servidor no piden paquetes ni muestran la tarjeta', () => {
      open('driver', null, 'browser', null);
      http.expectNone((r) => r.url.startsWith('/gateway/packages'));
      expect(card()).toBeNull();
      TestBed.resetTestingModule();
      open('tenant_admin', null, 'server', null);
      http.expectNone((r) => r.url.startsWith('/gateway/packages'));
      expect(card()).toBeNull();
    });

    it('el título es un h2 de su propia sección y el anillo no añade un segundo h1', () => {
      open('agent', page([]), 'browser', packagePage(mixed));
      expect(card().getAttribute('aria-labelledby')).toBe('figures-title');
      expect(root().querySelectorAll('h1').length).toBe(1);
    });
  });

  describe('últimas jornadas', () => {
    const row = (n: number) => root().querySelectorAll('.journeys li')[n] as HTMLElement;

    it('pide cinco jornadas a quien opera jornadas y las muestra con nombre, detalle, estado y enlace', () => {
      open('agent', null);
      const req = http.expectOne((r) => r.url === '/gateway/journeys');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('5');
      req.flush(page([journey(3, 'completed'), journey(2), journey(1)]));
      fixture.detectChanges();

      expect(root().querySelector('section[aria-labelledby="journeys-title"] h2#journeys-title')?.textContent).toBe('Últimas jornadas');
      expect(journeyLinks().map((a) => a.textContent)).toEqual(['Jornada 3', 'Jornada 2', 'Jornada 1']);
      expect(journeyLinks().map((a) => a.getAttribute('href'))).toEqual(['/jornadas/j3', '/jornadas/j2', '/jornadas/j1']);
      const first = row(0).textContent!;
      expect(first).toContain('Completada');
      expect(row(0).querySelector('app-status-badge')?.getAttribute('data-tone')).toBe('success');
      expect(first).not.toContain('2026-10-03T');
    });

    it('en cada fila el nombre y su detalle van uno bajo el otro y la etiqueta de estado a la derecha', () => {
      open('agent', page([journey(1)]));
      const main = row(0).querySelector('.row-main') as HTMLElement;
      const link = main.querySelector('a') as HTMLElement;
      const meta = main.querySelector('.meta') as HTMLElement;
      const badge = row(0).querySelector('app-status-badge') as HTMLElement;
      expect(meta.getBoundingClientRect().top).toBeGreaterThanOrEqual(link.getBoundingClientRect().bottom - 8);
      expect(badge.getBoundingClientRect().left).toBeGreaterThan(main.getBoundingClientRect().left);
    });

    it('muestra las más recientes primero aunque el gateway las entregue al revés', () => {
      open('tenant_admin', page([journey(1), journey(2), journey(3)]));
      expect(journeyLinks().map((a) => a.textContent)).toEqual(['Jornada 3', 'Jornada 2', 'Jornada 1']);
    });

    it('la cabecera de la tarjeta tiene «Ver todas», con el nombre accesible completo, que lleva a /jornadas', () => {
      open('tenant_admin', page([journey(1)], 12));
      const all = root().querySelector('.card-head a') as HTMLAnchorElement;
      expect(all.textContent?.trim()).toBe('Ver todas');
      expect(all.getAttribute('aria-label')).toBe('Ver todas las jornadas');
      expect(all.getAttribute('href')).toBe('/jornadas');
      expect(Math.round(all.getBoundingClientRect().height)).toBe(48);
      expect(getComputedStyle(all).borderTopLeftRadius).toBe('12px');
    });

    it('sin jornadas lo explica y enlaza a planificar la primera, con botón de 48px', () => {
      open('agent', page([]));
      expect(text()).toContain('Todavía no hay jornadas');
      const link = Array.from(root().querySelectorAll('a')).find((a) => a.textContent?.includes('Planificar la primera jornada'))!;
      expect(link.getAttribute('href')).toBe('/jornadas/nueva');
      expect(Math.round(link.getBoundingClientRect().height)).toBe(48);
      expect(journeyLinks().length).toBe(0);
    });

    it('mientras carga muestra un indicador accesible', () => {
      open('agent', null);
      const bars = Array.from(root().querySelectorAll('mat-progress-bar')).map((bar) => bar.getAttribute('aria-label'));
      expect(bars).toEqual(['Cargando las últimas jornadas']);
      http.expectOne((r) => r.url === '/gateway/journeys').flush(page([]));
    });

    it('ante un error muestra el mensaje y «Reintentar» vuelve a pedirlas', () => {
      open('agent', null);
      http.expectOne((r) => r.url === '/gateway/journeys').flush({ message: 'caído' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(root().querySelector('[role="alert"]')?.textContent?.trim()).toBeTruthy();

      (Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Reintentar') as HTMLButtonElement).click();
      fixture.detectChanges();
      http.expectOne((r) => r.url === '/gateway/journeys').flush(page([journey(1)]));
      fixture.detectChanges();
      expect(journeyLinks().length).toBe(1);
      expect(root().querySelector('[role="alert"]')).toBeNull();
    });

    it('el conductor no pide jornadas ni ve la sección', () => {
      open('driver', null);
      http.expectNone((r) => r.url.startsWith('/gateway/journeys'));
      expect(root().querySelector('#journeys-title')).toBeNull();
    });

    it('en el servidor no pide jornadas ni muestra la sección', () => {
      open('tenant_admin', null, 'server');
      http.expectNone((r) => r.url.startsWith('/gateway/journeys'));
      expect(root().querySelector('#journeys-title')).toBeNull();
    });

    it('sus enlaces son operables con teclado: son enlaces con texto', () => {
      open('agent', page([journey(1)]));
      expect(journeyLinks().every((a) => a.tagName === 'A' && !!a.getAttribute('href') && !!a.textContent?.trim())).toBeTrue();
    });

    it('muestra servicios y vehículos, en singular o plural, antes de la fecha', () => {
      open('agent', page([{ ...journey(3), totalServices: 1, totalResources: 3 }, { ...journey(2), totalServices: 12, totalResources: 1 }]));
      expect(row(0).querySelector('.meta')?.textContent).toContain('1 servicio · 3 vehículos · ');
      expect(row(1).querySelector('.meta')?.textContent).toContain('12 servicios · 1 vehículo · ');
    });

    it('un cero también se informa', () => {
      open('agent', page([{ ...journey(1), totalServices: 0, totalResources: 0 }]));
      expect(row(0).querySelector('.meta')?.textContent).toContain('0 servicios · 0 vehículos · ');
    });

    it('si el gateway no informa los totales, la línea es solo la fecha', () => {
      open('agent', page([{ ...journey(1), totalServices: null, totalResources: null }, journey(2)]));
      for (const n of [0, 1]) {
        const meta = row(n).querySelector('.meta')!.textContent!;
        expect(meta).not.toContain('servicio');
        expect(meta).not.toContain('vehículo');
        expect(meta).not.toContain('·');
        expect(meta.trim().length).toBeGreaterThan(0);
      }
    });

    it('el nombre de la jornada es un enlace de 44px de alto con peso 700 y Manrope', () => {
      open('agent', page([journey(1)]));
      const link = journeyLinks()[0];
      expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(getComputedStyle(link).fontWeight).toBe('700');
      expect(getComputedStyle(link).fontFamily).toContain('Manrope');
    });

    it('la etiqueta de estado usa el color de su significado: una jornada completada es verde, no violeta', () => {
      open('agent', page([journey(3, 'completed')]));
      const badge = root().querySelector('.journeys li app-status-badge') as HTMLElement;
      const probe = document.createElement('span');
      probe.style.backgroundColor = 'var(--app-success-container)';
      root().appendChild(probe);
      const success = getComputedStyle(probe).backgroundColor;
      probe.remove();
      expect(getComputedStyle(badge).backgroundColor).toBe(success);
    });
  });
});
