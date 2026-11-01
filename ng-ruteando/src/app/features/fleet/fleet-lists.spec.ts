import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { driver, fleetPage, resource, resourceType } from '../../../testing/fleet';
import { iconButtonsWithoutTitle } from '../../../testing/icon-button-titles';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';

import { DriverListComponent } from './drivers/driver-list.component';
import { ResourceTypeListComponent } from './resource-types/resource-type-list.component';
import { ResourceListComponent } from './resources/resource-list.component';

/**
 * Lo que comparten los tres listados de flota: carga completa, selección, borrado en lote, exportación a CSV y las columnas nuevas.
 */
describe('Listados de flota', () => {
  let fixture: ComponentFixture<unknown>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const tick = () => TestBed.inject(ApplicationRef).tick();
  const bar = () => root().querySelector('.selbar') as HTMLElement;
  const barButton = (text: string) => (Array.from(bar().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes(text))!;
  const overlayButton = (text: string) => (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;
  const rowText = (index: number) => root().querySelectorAll('tbody tr.mat-mdc-row')[index].textContent ?? '';

  function mount<T>(component: Type<T>): void {
    TestBed.configureTestingModule({
      imports: [component],
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
    fixture = TestBed.createComponent(component) as ComponentFixture<unknown>;
    fixture.detectChanges();
  }

  /** Marca la fila `row` de la tabla (la vista de tabla es la que tiene casillas por fila). */
  function pickRow(row: number): void {
    (root().querySelectorAll('tbody tr.mat-mdc-row')[row].querySelector('mat-checkbox input') as HTMLInputElement).click();
    fixture.detectChanges();
  }

  /** Captura lo que se descarga: el nombre del archivo y el texto del CSV. */
  function captureDownloads(): { names: string[]; blobs: Blob[] } {
    const captured = { names: [] as string[], blobs: [] as Blob[] };
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      captured.names.push(this.download);
    });
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob | MediaSource) => {
      captured.blobs.push(blob as Blob);
      return 'blob:prueba';
    });
    return captured;
  }
  /** El CSV empieza con un BOM para que Excel lo abra en UTF-8; aquí se quita para comparar el contenido. */
  const csvText = async (blob: Blob) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(await blob.arrayBuffer()).replace(/^\uFEFF/, '');

  afterEach(() => http.verify());

  describe('conductores', () => {
    const many = Array.from({ length: 130 }, (_, i) => driver({ firstName: 'Conductor', lastName: String(i + 1), email: `c${i + 1}@example.com` }));

    it('trae a todos con una sola petición y busca entre todos, no solo en la primera página', () => {
      mount(DriverListComponent);
      http.expectOne('/gateway/users/drivers').flush(many);
      fixture.detectChanges();

      expect(root().querySelector('app-page-header .subtitle')?.textContent?.trim()).toBe('130 conductores');
      const search = root().querySelector('input[type="search"]') as HTMLInputElement;
      expect(search.placeholder).toBe('Buscar por nombre, correo o documento');
      search.value = 'Conductor 125';
      search.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(root().querySelectorAll('tbody tr.mat-mdc-row').length).toBe(1);
      expect(rowText(0)).toContain('Conductor 125');
      http.expectNone((r) => r.url.startsWith('/gateway/users'));
    });

    it('muestra el documento con la etiqueta del tipo', () => {
      mount(DriverListComponent);
      http.expectOne('/gateway/users/drivers').flush([driver({ identifierType: 'citizen_id', identifierValue: '1020304050' }), driver({ identifierType: null, identifierValue: null })]);
      fixture.detectChanges();

      expect(rowText(0)).toContain('Documento de identidad 1020304050');
      expect(root().querySelector('thead')?.textContent).toContain('Documento');
    });

    it('elegir conductores muestra la barra con cuántos hay, eliminar y exportar', () => {
      mount(DriverListComponent);
      http.expectOne('/gateway/users/drivers').flush(many.slice(0, 5));
      fixture.detectChanges();
      expect(bar()).toBeNull();

      pickRow(0);
      pickRow(3);

      expect(bar().querySelector('.count')?.textContent?.trim()).toBe('2 seleccionados');
      expect(barButton('Eliminar')).toBeDefined();
      expect(barButton('Exportar')).toBeDefined();
      expect(iconButtonsWithoutTitle(root())).toEqual([]);
    });

    it('borra los elegidos con una sola confirmación y explica el que no se puede borrar', async () => {
      mount(DriverListComponent);
      const rows = many.slice(0, 4);
      http.expectOne('/gateway/users/drivers').flush(rows);
      fixture.detectChanges();
      pickRow(0);
      pickRow(1);
      pickRow(2);

      barButton('Eliminar').click();
      tick();
      await wait();
      expect(overlay.textContent).toContain('los 3 conductores elegidos');
      overlayButton('Eliminar').click();
      await wait();

      const deletes = http.match((r) => r.method === 'DELETE');
      expect(deletes.map((d) => d.request.url).sort()).toEqual(rows.slice(0, 3).map((r) => `/gateway/users/${r.id}`).sort());
      deletes[0].flush(null, { status: 204, statusText: 'No Content' });
      deletes[1].flush({ message: 'assigned' }, { status: 409, statusText: 'Conflict' });
      deletes[2].flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();

      expect(root().querySelector('[role="status"]')?.textContent).toContain('Se eliminaron 2 de 3 conductores');
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se pudo eliminar 1 conductor');
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('el conductor está asignado a un vehículo');
      // Se vuelve a pedir la lista completa (no la guardada)
      http.expectOne('/gateway/users/drivers').flush(rows.slice(1));
      fixture.detectChanges();
      expect(bar()).toBeNull();
    });

    it('si se cancela la confirmación no se borra nada y la selección sigue', async () => {
      mount(DriverListComponent);
      http.expectOne('/gateway/users/drivers').flush(many.slice(0, 3));
      fixture.detectChanges();
      pickRow(0);

      barButton('Eliminar').click();
      tick();
      await wait();
      overlayButton('Cancelar').click();
      await wait();

      http.expectNone((r) => r.method === 'DELETE');
      expect(bar().querySelector('.count')?.textContent?.trim()).toBe('1 seleccionado');
    });

    it('exporta solo los elegidos, con la fecha en el nombre y sin volver a pedirlos', async () => {
      const downloads = captureDownloads();
      mount(DriverListComponent);
      http.expectOne('/gateway/users/drivers').flush([driver({ firstName: 'Ana', lastName: 'Pérez', identifierType: 'citizen_id', identifierValue: '77' }), ...many.slice(0, 2)]);
      fixture.detectChanges();
      pickRow(0);
      barButton('Exportar').click();
      fixture.detectChanges();

      expect(downloads.names[0]).toMatch(/^conductores-\d{4}-\d{2}-\d{2}\.csv$/);
      const lines = (await csvText(downloads.blobs[0])).trimEnd().split('\r\n');
      expect(lines.length).toBe(2);
      expect(lines[0]).toBe('Nombre;Apellidos;Correo;Teléfono;Tipo de documento;Documento;Estado');
      expect(lines[1]).toContain('Ana;Pérez');
      expect(lines[1]).toContain('Documento de identidad;77;Activo');
      expect(root().textContent).toContain('Se exportó 1 conductor a conductores-');
    });

    it('«Exportar CSV» de la cabecera exporta lo que deja la búsqueda', async () => {
      const downloads = captureDownloads();
      mount(DriverListComponent);
      http.expectOne('/gateway/users/drivers').flush(many);
      fixture.detectChanges();
      const search = root().querySelector('input[type="search"]') as HTMLInputElement;
      search.value = 'Conductor 12';
      search.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      const matching = root().querySelector('app-page-header')!;
      (Array.from(matching.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Exportar CSV'))!.click();

      const lines = (await csvText(downloads.blobs[0])).trimEnd().split('\r\n');
      // «Conductor 12», «Conductor 120» … «Conductor 129»: 11 conductores más la cabecera
      expect(lines.length).toBe(1 + 11);
    });

    it('pinta como texto lo que trae el gateway: un nombre con HTML no crea elementos', () => {
      mount(DriverListComponent);
      http.expectOne('/gateway/users/drivers').flush([driver({ firstName: '<img src=x onerror=alert(1)>', lastName: '<b>Gómez</b>', identifierType: 'citizen_id', identifierValue: '<script>1</script>' })]);
      fixture.detectChanges();

      const row = root().querySelector('tbody tr.mat-mdc-row')!;
      expect(row.querySelector('img, b, script')).toBeNull();
      expect(row.textContent).toContain('<img src=x onerror=alert(1)>');
      expect(row.textContent).toContain('<b>Gómez</b>');
      expect(row.textContent).toContain('<script>1</script>');
    });

    it('con la lista vacía deshabilita «Exportar CSV»', () => {
      mount(DriverListComponent);
      http.expectOne('/gateway/users/drivers').flush([]);
      fixture.detectChanges();
      const button = (Array.from(root().querySelectorAll('app-page-header button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Exportar CSV'))!;
      expect(button.disabled).toBeTrue();
    });
  });

  describe('tipos de vehículo', () => {
    const types = [
      resourceType({ name: 'Camión', capacity: { weight: 500, volume: 12_000_000 } }),
      resourceType({ name: 'Camioneta', capacity: null }),
      resourceType({ name: 'Moto', capacity: { weight: 25, volume: 90_000 } }),
    ];

    it('muestra la capacidad resumida o «Sin capacidad»', () => {
      mount(ResourceTypeListComponent);
      http.expectOne((r) => r.url === '/gateway/resource-types').flush(fleetPage(types));
      fixture.detectChanges();

      expect(root().querySelector('thead')?.textContent).toContain('Capacidad');
      expect(rowText(0)).toContain('500 kg · 12 m³');
      expect(rowText(1)).toContain('Sin capacidad');
      expect(rowText(2)).toContain('25 kg · 0,09 m³');
    });

    it('trae todos los tipos, no solo una página', () => {
      mount(ResourceTypeListComponent);
      const page0 = http.expectOne((r) => r.url === '/gateway/resource-types');
      expect(page0.request.params.get('size')).toBe('100');
      page0.flush(fleetPage(Array.from({ length: 100 }, () => resourceType()), 130));
      const page1 = http.expectOne((r) => r.url === '/gateway/resource-types' && r.params.get('page') === '1');
      page1.flush(fleetPage(Array.from({ length: 30 }, () => resourceType()), 130, 1));
      fixture.detectChanges();
      expect(root().querySelector('app-page-header .subtitle')?.textContent?.trim()).toBe('130 tipos');
    });

    it('borra los elegidos y explica el que tiene vehículos', async () => {
      mount(ResourceTypeListComponent);
      http.expectOne((r) => r.url === '/gateway/resource-types').flush(fleetPage(types));
      fixture.detectChanges();
      pickRow(0);
      pickRow(1);
      barButton('Eliminar').click();
      tick();
      await wait();
      overlayButton('Eliminar').click();
      await wait();

      const deletes = http.match((r) => r.method === 'DELETE');
      expect(deletes.length).toBe(2);
      deletes[0].flush({ message: 'in use' }, { status: 409, statusText: 'Conflict' });
      deletes[1].flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();

      expect(root().querySelector('[role="status"]')?.textContent).toContain('Se eliminaron 1 de 2 tipos');
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se puede eliminar: hay vehículos de este tipo');
      http.expectOne((r) => r.url === '/gateway/resource-types').flush(fleetPage(types.slice(0, 1)));
    });

    it('exporta el peso en kg y el volumen en m³', async () => {
      const downloads = captureDownloads();
      mount(ResourceTypeListComponent);
      http.expectOne((r) => r.url === '/gateway/resource-types').flush(fleetPage(types));
      fixture.detectChanges();
      pickRow(0);
      barButton('Exportar').click();

      const lines = (await csvText(downloads.blobs[0])).trimEnd().split('\r\n');
      expect(downloads.names[0]).toMatch(/^tipos-de-vehiculo-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(lines[0]).toBe('Nombre;Categoría;Perfil de ruteo;Peso (kg);Volumen (m³);Consumo de combustible');
      expect(lines[1]).toContain(';500;12;');
    });
  });

  describe('vehículos', () => {
    const vehicles = [resource({ name: 'Furgón', licensePlate: 'ABC-1' }), resource({ name: 'Moto', licensePlate: null }), resource({ name: 'Camión', licensePlate: 'XYZ-9' })];

    function open(): void {
      mount(ResourceListComponent);
      http.expectOne((r) => r.url === '/gateway/resources').flush(fleetPage(vehicles));
      fixture.detectChanges();
    }

    it('en la vista de tarjetas cada una tiene su casilla y elegirla muestra la barra', () => {
      open();
      const boxes = root().querySelectorAll('.card-grid article.vehicle mat-checkbox input');
      expect(boxes.length).toBe(3);
      expect((boxes[0] as HTMLInputElement).getAttribute('aria-label')).toBe('Elegir vehículo ABC-1');

      (boxes[0] as HTMLInputElement).click();
      (boxes[2] as HTMLInputElement).click();
      fixture.detectChanges();

      expect(bar().querySelector('.count')?.textContent?.trim()).toBe('2 seleccionados');
      expect(root().querySelectorAll('article.vehicle.selected').length).toBe(2);
    });

    it('borra los vehículos elegidos desde las tarjetas con una sola confirmación', async () => {
      open();
      const boxes = root().querySelectorAll('.card-grid article.vehicle mat-checkbox input');
      (boxes[0] as HTMLInputElement).click();
      (boxes[1] as HTMLInputElement).click();
      fixture.detectChanges();

      barButton('Eliminar').click();
      tick();
      await wait();
      overlayButton('Eliminar').click();
      await wait();

      const deletes = http.match((r) => r.method === 'DELETE');
      expect(deletes.length).toBe(2);
      deletes.forEach((d) => d.flush(null, { status: 204, statusText: 'No Content' }));
      fixture.detectChanges();

      expect(root().querySelector('[role="status"]')?.textContent).toContain('Se eliminaron 2 vehículos');
      http.expectOne((r) => r.url === '/gateway/resources').flush(fleetPage(vehicles.slice(2)));
    });

    it('«Exportar CSV» exporta todos los vehículos filtrados', async () => {
      const downloads = captureDownloads();
      open();
      (Array.from(root().querySelectorAll('app-page-header button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Exportar CSV'))!.click();

      const lines = (await csvText(downloads.blobs[0])).trimEnd().split('\r\n');
      expect(downloads.names[0]).toMatch(/^vehiculos-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(lines.length).toBe(1 + 3);
      expect(lines[0]).toBe('Nombre;Matrícula;Tipo;Conductor;Correo del conductor;Cantidad;Estado');
    });

    it('pinta como texto el nombre y la matrícula: con HTML no crea elementos, ni en tarjetas ni en el CSV', async () => {
      const downloads = captureDownloads();
      mount(ResourceListComponent);
      http.expectOne((r) => r.url === '/gateway/resources').flush(fleetPage([resource({ name: '<img src=x onerror=alert(1)>', licensePlate: '=HYPERLINK("x")' })]));
      fixture.detectChanges();

      const card = root().querySelector('.card-grid article.vehicle')!;
      expect(card.querySelector('img')).toBeNull();
      expect(card.textContent).toContain('<img src=x onerror=alert(1)>');

      (Array.from(root().querySelectorAll('app-page-header button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Exportar CSV'))!.click();
      const csv = await csvText(downloads.blobs[0]);
      expect(csv).toContain(`'=HYPERLINK`);
      expect(csv).not.toMatch(/;=HYPERLINK/);
    });

    it('las casillas y los botones nuevos llevan título', () => {
      open();
      expect(iconButtonsWithoutTitle(root())).toEqual([]);
    });
  });
});
