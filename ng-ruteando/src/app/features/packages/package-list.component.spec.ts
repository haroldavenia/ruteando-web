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

import { PackageListComponent } from './package-list.component';

import list from '../../../testing/fixtures/gateway/get__packages.json';
import setStatus from '../../../testing/fixtures/gateway/patch__packages__id__status__status.json';
import remove from '../../../testing/fixtures/gateway/delete__packages__id.json';

const fx = (f: unknown) => f as Fixture;

describe('PackageListComponent', () => {
  let fixture: ComponentFixture<PackageListComponent>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const item = (fx(list).response.body as { content: { id: string; name: string }[] }).content[0];
  const overlayButton = (text: string) =>
    (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PackageListComponent],
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
    fixture = TestBed.createComponent(PackageListComponent);
    fixture.detectChanges();
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush([]));
  });

  afterEach(() => http.verify());

  const load = (body: unknown = fx(list).response.body) => {
    http.expectOne((r) => r.url === '/gateway/packages').flush(body as object);
    fixture.detectChanges();
  };
  const reloadAnswer = (body: unknown = fx(list).response.body) =>
    http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/packages').flush(body as object);
  const label = `Postman package`;

  async function openStatusMenu(): Promise<void> {
    (root().querySelector(`[aria-label="Cambiar el estado del paquete ${label}"]`) as HTMLButtonElement).click();
    fixture.detectChanges();
    await wait();
  }

  it('muestra guía, nombre, tipo, dirección, estado y ubicación con etiquetas en español', () => {
    load();
    const row = root().querySelector('tr.mat-mdc-row')!.textContent!;
    expect(row).toContain('Postman package');
    expect(row).toContain('Entrega');
    expect(row).toContain('Fixture address');
    expect(row).toContain('Pendiente');
    expect(row).toContain('4,60872 / -74,07728');
  });

  it('con la lista vacía ofrece crear el primero', () => {
    load({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
    expect(root().textContent).toContain('Todavía no hay paquetes');
    expect(root().querySelector('[empty-action] a[href="/paquetes/nuevo"]')).not.toBeNull();
    expect(root().querySelector('[empty-action] a[href="/paquetes/importar"]')?.textContent).toContain('Importar un CSV');
  });

  it('el encabezado ofrece «Importar CSV», «Exportar CSV» y «Nuevo paquete»', () => {
    load();
    const header = root().querySelector('app-page-header')!;
    const labels = Array.from(header.querySelectorAll('a, button')).map((e) => e.textContent!.replace(/\s+/g, ' ').trim());
    expect(labels.some((l) => l.includes('Importar CSV'))).toBeTrue();
    expect(labels.some((l) => l.includes('Exportar CSV'))).toBeTrue();
    expect(labels.some((l) => l.includes('Nuevo paquete'))).toBeTrue();
    expect(header.querySelector('a[href="/paquetes/importar"]')).not.toBeNull();
  });

  it('un estado desconocido se muestra con su clave', () => {
    const body = JSON.parse(JSON.stringify(fx(list).response.body));
    body.content[0].status = 'demo_x';
    load(body);
    expect(root().querySelector('tr.mat-mdc-row')!.textContent).toContain('demo_x');
  });

  describe('estado', () => {
    it('sin catálogo ofrece los cuatro estados activos menos el actual, con su etiqueta en español', async () => {
      load();
      await openStatusMenu();
      const items = Array.from(overlay.querySelectorAll('[mat-menu-item]')).map((b) => b.textContent!.trim());
      expect(items).toEqual(['Atendido', 'No atendido', 'Cancelado']);
    });

    it('cambia el estado directamente y recarga la fila', async () => {
      load();
      await openStatusMenu();
      overlayButton('Atendido').click();
      await wait();

      const req = http.expectOne((r) => r.method === 'PATCH' && r.url === `/gateway/packages/${item.id}/status/attended`);
      respondWith(req, fx(setStatus));
      fixture.detectChanges();
      expect(root().textContent).toContain('ahora está atendido');
      reloadAnswer();
    });

    it('cancelar pide confirmación y solo cambia si se confirma', async () => {
      load();
      await openStatusMenu();
      overlayButton('Cancelado').click();
      TestBed.inject(ApplicationRef).tick();
      await wait();
      expect(overlay.textContent).toContain('¿Cancelar el paquete «Postman package»?');
      http.expectNone((r) => r.method === 'PATCH');

      overlayButton('Cancelar paquete').click();
      await wait();
      const req = http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/status/cancelled'));
      respondWith(req, fx(setStatus));
      reloadAnswer();
    });

    it('al volver atrás en la confirmación no se envía nada', async () => {
      load();
      await openStatusMenu();
      overlayButton('Cancelado').click();
      TestBed.inject(ApplicationRef).tick();
      await wait();
      overlayButton('Volver').click();
      await wait();
      http.expectNone((r) => r.method === 'PATCH');
    });

    it('un error del gateway se muestra y no recarga la fila', async () => {
      load();
      await openStatusMenu();
      overlayButton('Atendido').click();
      await wait();
      http.expectOne((r) => r.method === 'PATCH').flush({ message: 'no' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('La solicitud no es válida');
      expect(root().querySelector('tr.mat-mdc-row')!.textContent).toContain('Pendiente');
    });
  });

  describe('borrado', () => {
    async function confirm(): Promise<void> {
      load();
      (root().querySelector(`[aria-label="Eliminar paquete ${label}"]`) as HTMLButtonElement).click();
      TestBed.inject(ApplicationRef).tick();
      await wait();
      overlayButton('Eliminar').click();
      await wait();
    }

    it('borra tras confirmar y recarga', async () => {
      await confirm();
      respondWith(http.expectOne((r) => r.method === 'DELETE' && r.url === `/gateway/packages/${item.id}`), fx(remove));
      fixture.detectChanges();
      expect(root().textContent).toContain('Se eliminó paquete «Postman package»');
      reloadAnswer();
    });

    for (const status of [409, 400]) {
      it(`un paquete incluido en una jornada (${status}) explica por qué no se puede eliminar`, async () => {
        await confirm();
        http.expectOne((r) => r.method === 'DELETE').flush({ message: 'in use' }, { status, statusText: 'x' });
        fixture.detectChanges();
        expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se puede eliminar: el paquete está incluido en una jornada');
        expect(root().textContent).toContain('Postman package');
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

  describe('exportación a CSV', () => {
    let downloads: string[];
    let blobs: Blob[];
    const exportButton = () =>
      (Array.from(root().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Exportar CSV'))!;
    const withTotal = (items: number, total: number) => ({
      content: Array.from({ length: items }, (_, i) => ({ ...(fx(list).response.body as { content: object[] }).content[0], id: `i${i}`, name: `P${i}` })),
      totalElements: total,
      totalPages: Math.ceil(total / 200),
      page: 0,
      size: 20,
    });

    beforeEach(() => {
      downloads = [];
      blobs = [];
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        downloads.push(this.download);
      });
      spyOn(URL, 'createObjectURL').and.callFake((b: Blob | MediaSource) => {
        blobs.push(b as Blob);
        return 'blob:prueba';
      });
    });

    it('con paquetes recorre todas las páginas, muestra el progreso y descarga paquetes.csv', async () => {
      load(withTotal(1, 201));
      expect(exportButton().disabled).toBeFalse();
      exportButton().click();
      fixture.detectChanges();

      const firstPage = http.expectOne((r) => r.method === 'GET' && r.url === '/gateway/packages' && r.params.get('size') === '200');
      expect(firstPage.request.params.get('page')).toBe('0');
      firstPage.flush(withTotal(200, 201));
      fixture.detectChanges();
      expect(root().textContent).toContain('Exportando… 200 de 201');

      http.expectOne((r) => r.params.get('page') === '1' && r.params.get('size') === '200').flush({ ...withTotal(1, 201), page: 1 });
      fixture.detectChanges();

      expect(downloads).toEqual(['paquetes.csv']);
      const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await blobs[0].arrayBuffer());
      expect(text.startsWith('\uFEFFID_GUIA;LONGITUD;LATITUD')).toBeTrue();
      expect(text.trimEnd().split('\r\n').length).toBe(1 + 201);
      expect(root().textContent).toContain('Se exportaron 201 paquetes');
      expect(exportButton().disabled).toBeFalse();
    });

    it('si falla una página no descarga nada, avisa y permite reintentar', () => {
      load(withTotal(1, 201));
      exportButton().click();
      http.expectOne((r) => r.params.get('size') === '200').flush(withTotal(200, 201));
      http.expectOne((r) => r.params.get('page') === '1').flush({ message: 'x' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(downloads).toEqual([]);
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se pudo exportar');
      expect(exportButton().disabled).toBeFalse();
    });

    it('sin paquetes la acción está desactivada', () => {
      load({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
      expect(exportButton().disabled).toBeTrue();
    });

    it('al salir de la pantalla a mitad de la exportación se cortan las peticiones', () => {
      load(withTotal(1, 201));
      exportButton().click();
      const pending = http.expectOne((r) => r.params.get('size') === '200');
      fixture.destroy();
      expect(pending.cancelled).toBeTrue();
    });
  });
});
