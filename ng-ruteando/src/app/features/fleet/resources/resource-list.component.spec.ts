import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { iconButtonsWithoutTitle } from '../../../../testing/icon-button-titles';
import { Fixture, respondWith } from '../../../../testing/api-testing';
import { API_BASE_URL } from '../../../core/api/api-config';
import { errorInterceptor } from '../../../core/api/error.interceptor';
import { OUTLINED_FIELDS_PROVIDER } from '../../../shared/form/outlined-fields';

import { ResourceListComponent } from './resource-list.component';

import list from '../../../../testing/fixtures/gateway/get__resources.json';
import assign from '../../../../testing/fixtures/gateway/put__resources__id__driver__driverId.json';
import unassign from '../../../../testing/fixtures/gateway/delete__resources__id__driver.json';
import remove from '../../../../testing/fixtures/gateway/delete__resources__id.json';
import drivers from '../../../../testing/fixtures/gateway/get__users__drivers.json';

describe('ResourceListComponent', () => {
  let fixture: ComponentFixture<ResourceListComponent>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 60));
  const fx = (f: unknown) => f as Fixture;
  const resource = fx(list).response.body as { content: { id: string; name: string; driverId: string | null }[] };
  const vehicle = resource.content[0];
  const driver = (fx(drivers).response.body as { id: string }[])[0];
  const overlayButton = (text: string) =>
    (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;

  /** Lista el fixture con o sin conductor asignado. */
  function loadWith(assigned: boolean): void {
    const body = JSON.parse(JSON.stringify(fx(list).response.body));
    if (assigned) {
      body.content[0].driverId = driver.id;
      body.content[0].assignedUser = { id: driver.id, firstName: 'Postman', lastName: 'Driver', email: 'driver@example.invalid' };
    }
    http.expectOne((r) => r.url === '/gateway/resources').flush(body);
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.removeItem('ruteando-list-view');
    TestBed.configureTestingModule({
      imports: [ResourceListComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        OUTLINED_FIELDS_PROVIDER,
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(ResourceListComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  async function click(label: string): Promise<void> {
    (root().querySelector(`[aria-label="${label}"]`) as HTMLButtonElement).click();
    TestBed.inject(ApplicationRef).tick();
    await wait();
  }

  it('las acciones de fila, que son solo un icono, llevan título con lo que hacen', () => {
    loadWith(true);
    expect(root().querySelectorAll('.mat-mdc-icon-button').length).toBeGreaterThan(1);
    expect(iconButtonsWithoutTitle(root())).toEqual([]);
  });

  it('bajo el título dice cuántos hay y crear es la acción principal de la pantalla', () => {
    loadWith(false);
    expect(root().querySelector('app-page-header .subtitle')?.textContent?.trim()).toMatch(/^\d+ (vehículo|vehículos)$/);
    expect(root().querySelectorAll('app-page-header .primary-action').length).toBe(1);
  });

  it('lleva las pestañas de la flota bajo la cabecera', () => {
    loadWith(false);
    const tabs = Array.from(root().querySelectorAll('app-fleet-tabs nav a')).map((a) => a.textContent?.trim());

    expect(tabs).toEqual(['Vehículos', 'Tipos de vehículo', 'Conductores']);
    expect(root().querySelector('app-page-header + app-fleet-tabs')).not.toBeNull();
  });

  /** Cambia de las tarjetas (la vista por defecto) a la tabla. */
  function showTable(): void {
    (root().querySelector('button[aria-label="Ver como tabla"]') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('por defecto muestra una tarjeta por vehículo con su nombre, tipo, matrícula y conductor', () => {
    loadWith(true);
    const card = root().querySelector('.card-grid article.vehicle')!;

    expect(root().querySelector('table')).toBeNull();
    expect(card.querySelector('h3')?.textContent?.trim()).toBe('Postman resource');
    expect(card.textContent).toContain('Postman van');
    expect(card.querySelector('.avatar')?.textContent?.trim()).toBe('PD');
    expect(card.querySelector('.driver-name')?.textContent).toContain('Postman Driver');
    expect(card.querySelector('.driver-name')?.textContent).toContain('driver@example.invalid');
  });

  it('una tarjeta sin conductor lo dice y ofrece «Asignar»', () => {
    loadWith(false);
    const card = root().querySelector('.card-grid article.vehicle')!;

    expect(card.querySelector('.driver-name')?.textContent?.trim()).toBe('Sin conductor');
    expect(card.querySelector('button[aria-label="Asignar conductor al vehículo Postman resource"]')?.textContent?.trim()).toBe('Asignar');
    expect(card.querySelector('[aria-label^="Retirar conductor"]')).toBeNull();
  });

  it('la tarjeta con conductor ofrece retirarlo y cambiarlo, además de editar y eliminar', () => {
    loadWith(true);
    const labels = Array.from(root().querySelectorAll('.card-grid article.vehicle footer [aria-label]')).map((e) => e.getAttribute('aria-label'));

    expect(labels).toEqual([
      'Editar vehículo Postman resource',
      'Retirar conductor del vehículo Postman resource',
      'Cambiar conductor del vehículo Postman resource',
      'Eliminar vehículo Postman resource',
    ]);
  });

  it('la tabla sigue disponible con el alternador y no pierde las acciones de cada fila', () => {
    loadWith(true);
    showTable();

    expect(root().querySelector('.card-grid')).toBeNull();
    expect(root().querySelectorAll('tbody tr.mat-mdc-row').length).toBe(1);
    expect(root().querySelector('tbody [aria-label="Eliminar vehículo Postman resource"]')).not.toBeNull();
  });

  it('pide los vehículos de 100 en 100 y busca por nombre, matrícula o conductor', () => {
    const req = http.expectOne((r) => r.url === '/gateway/resources');
    expect(req.request.params.get('size')).toBe('100');
    req.flush(fx(list).response.body as object);
    fixture.detectChanges();

    expect((root().querySelector('input[type="search"]') as HTMLInputElement).placeholder).toBe('Buscar por nombre, matrícula o conductor');
  });

  it('muestra nombre, matrícula, tipo y "Sin conductor" cuando no tiene', () => {
    loadWith(false);
    showTable();
    const row = root().querySelector('tr.mat-mdc-row')!.textContent!;
    expect(row).toContain('Postman resource');
    expect(row).toContain('Postman van');
    expect(row).toContain('Sin conductor');
  });

  it('muestra el conductor asignado con nombre y correo', () => {
    loadWith(true);
    showTable();
    expect(root().querySelector('tr.mat-mdc-row')!.textContent).toContain('Postman Driver (driver@example.invalid)');
  });

  it('las acciones nombran el vehículo por su nombre si no tiene matrícula', () => {
    loadWith(false);
    expect(root().querySelector('[aria-label="Eliminar vehículo Postman resource"]')).not.toBeNull();
    expect(root().querySelector('[aria-label="Asignar conductor al vehículo Postman resource"]')).not.toBeNull();
    expect(root().querySelector('[aria-label^="Retirar conductor"]')).toBeNull();
  });

  it('asigna el conductor elegido y recarga el listado', async () => {
    loadWith(false);
    await click('Asignar conductor al vehículo Postman resource');
    respondWith(http.expectOne('/gateway/users/drivers'), fx(drivers));
    TestBed.inject(ApplicationRef).tick();
    await wait();

    (overlay.querySelector('mat-select') as HTMLElement).click();
    await wait();
    (overlay.querySelector('mat-option') as HTMLElement).click();
    await wait();
    overlayButton('Asignar').click();
    await wait();

    const req = http.expectOne((r) => r.method === 'PUT' && r.url === `/gateway/resources/${vehicle.id}/driver/${driver.id}`);
    respondWith(req, fx(assign));
    fixture.detectChanges();
    expect(root().textContent).toContain('Conductor asignado al vehículo');
    http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/resources').flush(fx(list).response.body as object);
  });

  it('con el selector abierto, la etiqueta flotante del diálogo no queda recortada por su contenido', async () => {
    loadWith(false);
    await click('Asignar conductor al vehículo Postman resource');
    respondWith(http.expectOne('/gateway/users/drivers'), fx(drivers));
    TestBed.inject(ApplicationRef).tick();
    await wait();

    (overlay.querySelector('mat-select') as HTMLElement).click();
    await wait();
    const label = overlay.querySelector('mat-dialog-content .mdc-floating-label') as HTMLElement;
    const content = overlay.querySelector('mat-dialog-content') as HTMLElement;

    expect(label.classList).toContain('mdc-floating-label--float-above');
    expect(label.getBoundingClientRect().top).toBeGreaterThanOrEqual(content.getBoundingClientRect().top);
  });

  it('sin conductores el diálogo lo explica y enlaza a /flota/conductores', async () => {
    loadWith(false);
    await click('Asignar conductor al vehículo Postman resource');
    http.expectOne('/gateway/users/drivers').flush([]);
    TestBed.inject(ApplicationRef).tick();
    await wait();

    expect(overlay.textContent).toContain('No hay conductores creados');
    expect(overlay.querySelector('a[href="/flota/conductores"]')).not.toBeNull();
    expect(overlayButton('Asignar').disabled).toBeTrue();
  });

  it('retira el conductor tras confirmar', async () => {
    loadWith(true);
    await click('Retirar conductor del vehículo Postman resource');
    overlayButton('Retirar').click();
    await wait();
    respondWith(http.expectOne((r) => r.method === 'DELETE' && r.url === `/gateway/resources/${vehicle.id}/driver`), fx(unassign));
    fixture.detectChanges();

    expect(root().textContent).toContain('ya no tiene conductor');
    http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/resources').flush(fx(list).response.body as object);
  });

  it('cancelar el retiro no envía nada', async () => {
    loadWith(true);
    await click('Retirar conductor del vehículo Postman resource');
    overlayButton('Cancelar').click();
    await wait();
    http.expectNone((r) => r.method === 'DELETE');
  });

  it('borra el vehículo tras confirmar', async () => {
    loadWith(false);
    await click('Eliminar vehículo Postman resource');
    overlayButton('Eliminar').click();
    await wait();
    respondWith(http.expectOne((r) => r.method === 'DELETE' && r.url === `/gateway/resources/${vehicle.id}`), fx(remove));
    fixture.detectChanges();

    expect(root().textContent).toContain('Se eliminó vehículo «Postman resource»');
    http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/resources').flush(fx(list).response.body as object);
  });
});
