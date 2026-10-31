import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { iconButtonsWithoutTitle } from '../../../testing/icon-button-titles';
import { Fixture, respondWith } from '../../../testing/api-testing';
import { makeUser } from '../../../testing/session';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { CurrentUser } from '../../core/auth/current-user';

import { ZoneListComponent } from './zone-list.component';

import list from '../../../testing/fixtures/gateway/get__zones.json';
import remove from '../../../testing/fixtures/gateway/delete__zones__id.json';

const fx = (f: unknown) => f as Fixture;

describe('ZoneListComponent', () => {
  let fixture: ComponentFixture<ZoneListComponent>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const zone = (fx(list).response.body as { id: string; name: string }[])[0];
  const overlayButton = (text: string) =>
    (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;

  function setup(withUser = true): void {
    TestBed.configureTestingModule({
      imports: [ZoneListComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    if (withUser) {
      TestBed.inject(CurrentUser).set(makeUser());
    }
    fixture = TestBed.createComponent(ZoneListComponent);
    fixture.detectChanges();
  }
  const load = (body: unknown = fx(list).response.body) => {
    http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/zones').flush(body as object);
    fixture.detectChanges();
  };

  afterEach(() => http.verify());

  it('las acciones de fila, que son solo un icono, llevan título con lo que hacen', () => {
    setup();
    load();
    expect(root().querySelectorAll('.mat-mdc-icon-button').length).toBeGreaterThan(1);
    expect(iconButtonsWithoutTitle(root())).toEqual([]);
  });

  it('bajo el título dice cuántos hay y crear es la acción principal de la pantalla', () => {
    setup();
    load();
    expect(root().querySelector('app-page-header .subtitle')?.textContent?.trim()).toMatch(/^\d+ (zona|zonas)$/);
    expect(root().querySelectorAll('app-page-header .primary-action').length).toBe(1);
  });

  it('pide las zonas con el tenantId del usuario', () => {
    setup();
    const req = http.expectOne((r) => r.url === '/gateway/zones');
    expect(req.request.params.get('tenantId')).toBe('tenant-1');
    respondWith(req, fx(list));
  });

  it('muestra color («Sin color»), nombre, código, vértices y estado (fixture real)', () => {
    setup();
    load();
    const cells = Array.from(root().querySelector('tr.mat-mdc-row')!.querySelectorAll('td')).map((c) => c.textContent!.trim());
    expect(cells.slice(0, 5)).toEqual(['Sin color', 'Postman zone', 'PM', '4', 'Activa']);
    expect(root().querySelector('tr.mat-mdc-row .swatch')).toBeNull();
  });

  it('una zona con color muestra la muestra y el nombre del color', () => {
    setup();
    const body = JSON.parse(JSON.stringify(fx(list).response.body));
    body[0].color = '#0072B2';
    body[0].active = false;
    load(body);
    const row = root().querySelector('tr.mat-mdc-row')!;
    expect((row.querySelector('.swatch') as HTMLElement).style.background).toContain('rgb(0, 114, 178)');
    expect(row.textContent).toContain('Azul');
    expect(row.textContent).toContain('Inactiva');
  });

  it('con la lista vacía ofrece crear la primera zona', () => {
    setup();
    load([]);
    expect(root().textContent).toContain('Todavía no hay zonas');
    expect(root().querySelector('a[href="/zonas/nueva"][empty-action]')).not.toBeNull();
  });

  it('un listado de más de una página se pagina en el navegador', () => {
    setup();
    const many = Array.from({ length: 45 }, (_, i) => ({ ...(fx(list).response.body as object[])[0], id: `z${i}`, name: `Zona ${i}` }));
    load(many);
    expect(root().querySelectorAll('tr.mat-mdc-row').length).toBe(20);
    expect(root().textContent).toContain('1 – 20 de 45');
  });

  it('sin usuario con empresa muestra la sesión no válida, sin pedir nada, y se puede reintentar', () => {
    setup(false);
    http.expectNone(() => true);
    expect(root().querySelector('app-data-table [role="alert"]')?.textContent).toContain('Tu sesión no es válida o ha caducado');

    TestBed.inject(CurrentUser).set(makeUser());
    (Array.from(root().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Reintentar'))!.click();
    load();
    expect(root().textContent).toContain('Postman zone');
  });

  describe('borrado', () => {
    async function confirm(): Promise<void> {
      setup();
      load();
      (root().querySelector(`[aria-label="Eliminar zona ${zone.name}"]`) as HTMLButtonElement).click();
      TestBed.inject(ApplicationRef).tick();
      await wait();
      overlayButton('Eliminar').click();
      await wait();
    }
    const deleteRequest = () => http.expectOne((r) => r.method === 'DELETE');

    it('borra tras confirmar (con el tenantId) y vuelve a pedir la lista', async () => {
      await confirm();
      const req = deleteRequest();
      expect(req.request.url).toBe(`/gateway/zones/${zone.id}`);
      expect(req.request.params.get('tenantId')).toBe('tenant-1');
      respondWith(req, fx(remove));
      fixture.detectChanges();
      expect(root().textContent).toContain('Se eliminó zona «Postman zone»');
      load();
    });

    for (const status of [409, 400]) {
      it(`una zona en uso (${status}) explica por qué no se puede eliminar y permanece`, async () => {
        await confirm();
        deleteRequest().flush({ message: 'in use' }, { status, statusText: 'x' });
        fixture.detectChanges();
        expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se puede eliminar: la zona se usa en lugares, paquetes o configuraciones');
        expect(root().textContent).toContain('Postman zone');
      });
    }

    it('si ya no existe (404) avisa, recarga y la zona desaparece', async () => {
      await confirm();
      deleteRequest().flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root().textContent).toContain('El registro ya no existe');
      load([]);
      expect(root().querySelectorAll('tr.mat-mdc-row').length).toBe(0);
      expect(root().textContent).toContain('Todavía no hay zonas');
    });
  });
});
