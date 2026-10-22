import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { Fixture, respondWith } from '../../../testing/api-testing';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';

import { SettingsListComponent } from './settings-list.component';

import list from '../../../testing/fixtures/gateway/get__settings.json';
import remove from '../../../testing/fixtures/gateway/delete__settings__id.json';

const fx = (f: unknown) => f as Fixture;

describe('SettingsListComponent', () => {
  let fixture: ComponentFixture<SettingsListComponent>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const item = (fx(list).response.body as { content: { id: string; description: string }[] }).content[0];
  const overlayButton = (text: string) =>
    (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SettingsListComponent],
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
    fixture = TestBed.createComponent(SettingsListComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const load = (body: unknown = fx(list).response.body) => {
    http.expectOne((r) => r.url === '/gateway/settings').flush(body as object);
    fixture.detectChanges();
  };

  it('muestra descripción, topología, restricción, salida, vehículos y estado (fixture real)', () => {
    load();
    const row = root().querySelector('tr.mat-mdc-row')!.textContent!;
    expect(row).toContain('Postman settings');
    expect(row).toContain('Ida y vuelta');
    expect(row).toContain('Rutas fijas');
    expect(row).toContain('Postman depot');
    expect(row).toContain('1');
    expect(row).toContain('Activa');
  });

  it('una configuración inactiva y valores desconocidos se muestran con claridad', () => {
    const body = JSON.parse(JSON.stringify(fx(list).response.body));
    body.content[0].active = false;
    body.content[0].routeTopology = 'teleport';
    load(body);
    const row = root().querySelector('tr.mat-mdc-row')!.textContent!;
    expect(row).toContain('Inactiva');
    expect(row).toContain('teleport');
  });

  it('con la lista vacía ofrece crear la primera', () => {
    load({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
    expect(root().textContent).toContain('Todavía no hay configuraciones');
    expect(root().querySelector('a[href="/configuraciones/nuevo"][empty-action]')).not.toBeNull();
  });

  describe('borrado', () => {
    async function confirm(): Promise<void> {
      load();
      (root().querySelector(`[aria-label="Eliminar configuración ${item.description}"]`) as HTMLButtonElement).click();
      TestBed.inject(ApplicationRef).tick();
      await wait();
      overlayButton('Eliminar').click();
      await wait();
    }
    const reloadAnswer = () => http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/settings').flush(fx(list).response.body as object);

    it('borra tras confirmar y recarga', async () => {
      await confirm();
      respondWith(http.expectOne((r) => r.method === 'DELETE' && r.url === `/gateway/settings/${item.id}`), fx(remove));
      fixture.detectChanges();
      expect(root().textContent).toContain('Se eliminó configuración «Postman settings»');
      reloadAnswer();
    });

    for (const status of [409, 400]) {
      it(`una configuración usada por una jornada (${status}) explica por qué no se puede eliminar`, async () => {
        await confirm();
        http.expectOne((r) => r.method === 'DELETE').flush({ message: 'in use' }, { status, statusText: 'x' });
        fixture.detectChanges();
        expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se puede eliminar: la configuración se usa en una jornada');
        expect(root().textContent).toContain('Postman settings');
      });
    }

    it('si ya no existe (404) avisa y recarga', async () => {
      await confirm();
      http.expectOne((r) => r.method === 'DELETE').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root().textContent).toContain('El registro ya no existe');
      reloadAnswer();
    });
  });
});
