import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { iconButtonsWithoutTitle } from '../../../../testing/icon-button-titles';
import { API_BASE_URL } from '../../../core/api/api-config';
import { errorInterceptor } from '../../../core/api/error.interceptor';
import { Fixture, respondWith } from '../../../../testing/api-testing';

import { ResourceTypeListComponent } from './resource-type-list.component';

import list from '../../../../testing/fixtures/gateway/get__resource-types.json';
import remove from '../../../../testing/fixtures/gateway/delete__resource-types__id.json';

describe('ResourceTypeListComponent', () => {
  let fixture: ComponentFixture<ResourceTypeListComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ResourceTypeListComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(ResourceTypeListComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function loadList(): void {
    respondWith(http.expectOne((r) => r.url === '/gateway/resource-types'), list as unknown as Fixture);
    fixture.detectChanges();
  }

  it('las acciones de fila, que son solo un icono, llevan título con lo que hacen', () => {
    loadList();
    expect(root().querySelectorAll('.mat-mdc-icon-button').length).toBeGreaterThan(1);
    expect(iconButtonsWithoutTitle(root())).toEqual([]);
  });

  it('bajo el título dice cuántos hay y crear es la acción principal de la pantalla', () => {
    loadList();
    expect(root().querySelector('app-page-header .subtitle')?.textContent?.trim()).toMatch(/^\d+ (tipo|tipos)$/);
    expect(root().querySelectorAll('app-page-header .primary-action').length).toBe(1);
  });

  it('lleva las pestañas de la flota bajo la cabecera', () => {
    loadList();
    const tabs = Array.from(root().querySelectorAll('app-fleet-tabs nav a')).map((a) => a.textContent?.trim());

    expect(tabs).toEqual(['Vehículos', 'Tipos de vehículo', 'Conductores']);
    expect(root().querySelector('app-page-header + app-fleet-tabs')).not.toBeNull();
  });

  it('muestra nombre, categoría y el perfil con su etiqueta en español', () => {
    loadList();
    const row = root().querySelector('tr.mat-mdc-row')!.textContent!;
    expect(row).toContain('Postman van');
    expect(row).toContain('van');
    expect(row).toContain('Conducción');
    expect(root().textContent).toContain('1 – 1 de 1');
  });

  it('trae todos los tipos de 100 en 100, empezando por la página 0', () => {
    const req = http.expectOne((r) => r.url === '/gateway/resource-types');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('100');
    respondWith(req, list as unknown as Fixture);
  });

  it('las acciones de fila nombran el tipo', () => {
    loadList();
    expect(root().querySelector('[aria-label="Editar tipo Postman van"]')).not.toBeNull();
    expect(root().querySelector('[aria-label="Eliminar tipo Postman van"]')).not.toBeNull();
  });

  describe('borrado', () => {
    let overlay: HTMLElement;
    const button = (text: string) =>
      (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;

    async function confirmDelete(): Promise<void> {
      loadList();
      (root().querySelector('[aria-label="Eliminar tipo Postman van"]') as HTMLButtonElement).click();
      TestBed.inject(ApplicationRef).tick();
      await wait();
      button('Eliminar').click();
      await wait();
    }

    beforeEach(() => (overlay = TestBed.inject(OverlayContainer).getContainerElement()));

    it('al confirmar borra, avisa y recarga la misma página', async () => {
      await confirmDelete();
      respondWith(http.expectOne((r) => r.method === 'DELETE' && r.url.startsWith('/gateway/resource-types/')), remove as unknown as Fixture);
      fixture.detectChanges();

      expect(root().textContent).toContain('Se eliminó tipo de vehículo «Postman van»');
      const reload = http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/resource-types');
      expect(reload.request.params.get('page')).toBe('0');
      respondWith(reload, list as unknown as Fixture);
    });

    it('con vehículos de ese tipo (409) explica por qué no se puede y no recarga', async () => {
      await confirmDelete();
      http.expectOne((r) => r.method === 'DELETE').flush({ message: 'in use' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se puede eliminar: hay vehículos de este tipo');
      expect(root().textContent).toContain('Postman van');
    });

    it('si ya no existe (404) avisa y recarga el listado', async () => {
      await confirmDelete();
      http.expectOne((r) => r.method === 'DELETE').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      expect(root().textContent).toContain('El registro ya no existe');
      respondWith(http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/resource-types'), list as unknown as Fixture);
    });
  });
});
