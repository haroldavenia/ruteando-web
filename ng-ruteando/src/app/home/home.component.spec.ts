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
import { navItemsFor } from '../layout/nav-items';

import { HomeComponent } from './home.component';

const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}T10:00:00Z`;
const journey = (n: number, status = 'planned') => ({ id: `j${n}`, name: `Jornada ${n}`, status, createdAt: day(n) });
const page = (content: unknown[], total = content.length) => ({ content, page: 0, size: 5, totalElements: total, totalPages: Math.max(1, Math.ceil(total / 5)) });

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent!.replace(/\s+/g, ' ');
  const links = () => Array.from(root().querySelectorAll('a.area'));
  const names = () => links().map((a) => a.querySelector('span')!.textContent!.trim());
  const journeyLinks = () => Array.from(root().querySelectorAll('.journeys li a')) as HTMLAnchorElement[];
  const journeyRequests = () => http.match((r) => r.method === 'GET' && r.url === '/gateway/journeys');

  /** Abre la home; `answer` contesta la petición de jornadas (por defecto, una lista vacía). */
  function open(role: UserRole, answer: unknown | null = page([]), platform = 'browser'): void {
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
      fixture.detectChanges();
    }
  }

  afterEach(() => http.verify());

  describe('accesos', () => {
    it('tiene un único h1 «Ruteando» y la sección «Áreas» con su h2', () => {
      open('tenant_admin');
      expect(root().querySelectorAll('h1').length).toBe(1);
      expect(root().querySelector('h1')?.textContent).toBe('Ruteando');
      expect(root().querySelector('section[aria-labelledby="areas-title"] h2#areas-title')?.textContent).toBe('Áreas');
    });

    for (const role of ['tenant_admin', 'super_admin'] as const) {
      it(`${role} ve accesos a Flota, Lugares, Zonas, Paquetes, Jornadas y Configuraciones`, () => {
        open(role);
        expect(names()).toEqual(['Vehículos', 'Tipos de vehículo', 'Conductores', 'Lugares', 'Zonas', 'Paquetes', 'Jornadas', 'Configuraciones']);
        expect(links().map((a) => a.getAttribute('href'))).toEqual([
          '/flota/vehiculos',
          '/flota/tipos',
          '/flota/conductores',
          '/lugares',
          '/zonas',
          '/paquetes',
          '/jornadas',
          '/configuraciones',
        ]);
      });
    }

    it('el agente ve solo Paquetes y Jornadas', () => {
      open('agent');
      expect(names()).toEqual(['Paquetes', 'Jornadas']);
    });

    it('el conductor ve un mensaje y ningún acceso', () => {
      open('driver', null);
      expect(links().length).toBe(0);
      expect(text()).toContain('Tu rol no tiene áreas disponibles en la aplicación web');
    });

    it('los accesos coinciden con las áreas del menú lateral para cada rol', () => {
      for (const role of ['tenant_admin', 'agent'] as const) {
        TestBed.resetTestingModule();
        open(role);
        const menu = navItemsFor(role)
          .filter((item) => item.link !== '/')
          .flatMap((item) => item.children ?? [item])
          .map((item) => item.label);
        expect(names()).toEqual(menu);
      }
    });

    it('los accesos son enlaces con texto, operables con teclado', () => {
      open('tenant_admin');
      expect(links().every((a) => a.tagName === 'A' && a.getAttribute('href'))).toBeTrue();
      expect(root().querySelectorAll('.area mat-icon[aria-hidden="true"]').length).toBe(links().length);
    });
  });

  describe('últimas jornadas', () => {
    it('pide cinco jornadas a quien opera jornadas y las muestra con nombre, estado, fecha y enlace', () => {
      open('agent', null);
      const req = http.expectOne((r) => r.url === '/gateway/journeys');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('5');
      req.flush(page([journey(3, 'completed'), journey(2), journey(1)]));
      fixture.detectChanges();

      expect(root().querySelector('section[aria-labelledby="journeys-title"] h2#journeys-title')?.textContent).toBe('Últimas jornadas');
      expect(journeyLinks().map((a) => a.textContent)).toEqual(['Jornada 3', 'Jornada 2', 'Jornada 1']);
      expect(journeyLinks().map((a) => a.getAttribute('href'))).toEqual(['/jornadas/j3', '/jornadas/j2', '/jornadas/j1']);
      const first = root().querySelector('.journeys li')!.textContent!;
      expect(first).toContain('Completada');
      expect(first).not.toContain('2026-10-03T');
    });

    it('muestra las más recientes primero aunque el gateway las entregue al revés', () => {
      open('tenant_admin', page([journey(1), journey(2), journey(3)]));
      expect(journeyLinks().map((a) => a.textContent)).toEqual(['Jornada 3', 'Jornada 2', 'Jornada 1']);
    });

    it('ofrece «Ver todas las jornadas», que lleva a /jornadas', () => {
      open('tenant_admin', page([journey(1)], 12));
      const all = Array.from(root().querySelectorAll('a')).find((a) => a.textContent?.includes('Ver todas las jornadas'))!;
      expect(all.getAttribute('href')).toBe('/jornadas');
    });

    it('sin jornadas lo explica y enlaza a planificar la primera', () => {
      open('agent', page([]));
      expect(text()).toContain('Todavía no hay jornadas');
      const link = Array.from(root().querySelectorAll('a')).find((a) => a.textContent?.includes('Planificar la primera jornada'))!;
      expect(link.getAttribute('href')).toBe('/jornadas/nueva');
      expect(journeyLinks().length).toBe(0);
    });

    it('mientras carga muestra un indicador accesible y los accesos ya están', () => {
      open('agent', null);
      expect(root().querySelector('mat-progress-bar')?.getAttribute('aria-label')).toBe('Cargando las últimas jornadas');
      expect(names()).toEqual(['Paquetes', 'Jornadas']);
      http.expectOne((r) => r.url === '/gateway/journeys').flush(page([]));
    });

    it('ante un error muestra el mensaje y «Reintentar» vuelve a pedirlas, con los accesos intactos', () => {
      open('agent', null);
      http.expectOne((r) => r.url === '/gateway/journeys').flush({ message: 'caído' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(root().querySelector('[role="alert"]')?.textContent?.trim()).toBeTruthy();
      expect(names()).toEqual(['Paquetes', 'Jornadas']);

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
      expect(names().length).toBe(8);
    });

    it('sus enlaces son operables con teclado: son enlaces con texto', () => {
      open('agent', page([journey(1)]));
      expect(journeyLinks().every((a) => a.tagName === 'A' && !!a.getAttribute('href') && !!a.textContent?.trim())).toBeTrue();
    });
  });
});
