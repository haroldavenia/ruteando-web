import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { iconButtonsWithoutTitle } from '../../../testing/icon-button-titles';
import { Fixture, respondWith } from '../../../testing/api-testing';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';

import { formatRelativeTime } from '../../shared/format';

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

  it('las acciones de fila, que son solo un icono, llevan título con lo que hacen', () => {
    load();
    expect(root().querySelectorAll('.mat-mdc-icon-button').length).toBeGreaterThan(1);
    expect(iconButtonsWithoutTitle(root())).toEqual([]);
  });

  it('bajo el título dice cuántos hay y crear es la acción principal de la pantalla', () => {
    load();
    expect(root().querySelector('app-page-header .subtitle')?.textContent?.trim()).toMatch(/^\d+ (paquete|paquetes)$/);
    expect(root().querySelectorAll('app-page-header .primary-action').length).toBe(1);
  });

  it('muestra guía, nombre, dirección, tipo, estado y cuándo se actualizó, con etiquetas en español', () => {
    load();
    const row = root().querySelector('tr.mat-mdc-row')!.textContent!;
    expect(row).toContain('Postman package');
    expect(row).toContain('Entrega');
    expect(row).toContain('Fixture address');
    expect(row).toContain('Pendiente');
    expect(row).toContain(formatRelativeTime((fx(list).response.body as { content: { updatedAt: string }[] }).content[0].updatedAt));
  });

  it('pide los paquetes de 100 en 100 para tenerlos todos en la tabla', () => {
    const req = http.expectOne((r) => r.url === '/gateway/packages');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('100');
    req.flush(fx(list).response.body as object);
  });

  it('el estado se muestra como etiqueta con icono y texto, de tono neutro para «Pendiente»', () => {
    load();
    const badge = root().querySelector('tr.mat-mdc-row app-status-badge') as HTMLElement;
    expect(badge.querySelector('span')?.textContent).toBe('Pendiente');
    expect(badge.getAttribute('data-tone')).toBe('neutral');
    expect(badge.querySelector('mat-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('un estado desconocido sale como etiqueta neutra con su clave', () => {
    const body = JSON.parse(JSON.stringify(fx(list).response.body));
    body.content[0].status = 'inventado';
    load(body);
    const badge = root().querySelector('tr.mat-mdc-row app-status-badge') as HTMLElement;
    expect(badge.querySelector('span')?.textContent).toBe('inventado');
    expect(badge.getAttribute('data-tone')).toBe('neutral');
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

  describe('chips de estado y selección', () => {
    const base = (fx(list).response.body as { content: object[] }).content[0];
    /** Una página con un paquete por estado indicado (de «P0» en adelante). */
    const withStatuses = (statuses: string[]) => ({
      content: statuses.map((status, i) => ({ ...base, id: 'p' + i, name: 'P' + i, guideNumber: 'G' + i, status })),
      totalElements: statuses.length,
      totalPages: 1,
      page: 0,
      size: 100,
    });
    const chips = () => Array.from(root().querySelectorAll('.chips .chip')).map((c) => c.textContent!.replace(/\s+/g, ' ').trim());
    const pick = (row: number) => {
      (root().querySelectorAll('tbody tr.mat-mdc-row')[row].querySelector('mat-checkbox input') as HTMLInputElement).click();
      fixture.detectChanges();
    };
    const bar = () => root().querySelector('.selbar') as HTMLElement;
    const barButton = (text: string) => (Array.from(bar().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes(text))!;

    it('ofrece un chip por estado con su recuento y, al elegirlo, filtra todos los paquetes', () => {
      load(withStatuses(['pending', 'attended', 'attended', 'cancelled']));
      expect(chips()).toEqual(['Todos 4', 'Pendiente 1', 'Atendido 2', 'Cancelado 1']);

      (Array.from(root().querySelectorAll('.chips .chip')) as HTMLButtonElement[])[2].click();
      fixture.detectChanges();

      const rows = Array.from(root().querySelectorAll('tbody tr.mat-mdc-row')).map((r) => r.textContent!);
      expect(rows.length).toBe(2);
      expect(rows[0]).toContain('P1');
      expect(rows[1]).toContain('P2');
    });

    it('un estado que la aplicación no conoce también tiene su chip, con su clave', () => {
      load(withStatuses(['pending', 'inventado']));

      expect(chips()).toEqual(['Todos 2', 'Pendiente 1', 'inventado 1']);
    });

    it('busca por guía, nombre o dirección en todos los paquetes', () => {
      load(withStatuses(['pending', 'attended', 'cancelled']));
      const input = root().querySelector('input[type="search"]') as HTMLInputElement;
      input.value = 'g2';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(root().querySelectorAll('tbody tr.mat-mdc-row').length).toBe(1);
      expect(input.placeholder).toBe('Buscar por guía, nombre o dirección');
    });

    it('elegir paquetes muestra la barra con cuántos hay y las acciones sobre ellos', () => {
      load(withStatuses(['pending', 'attended', 'cancelled']));
      expect(bar()).toBeNull();

      pick(0);
      pick(2);

      expect(bar().querySelector('.count')?.textContent?.trim()).toBe('2 seleccionados');
      expect(bar().textContent).toContain('Cambiar estado');
      expect(bar().textContent).toContain('Exportar');
      expect(iconButtonsWithoutTitle(root())).toEqual([]);
    });

    it('cambia el estado de los elegidos, uno por petición, y recarga todos los paquetes', async () => {
      load(withStatuses(['pending', 'pending', 'cancelled']));
      pick(0);
      pick(1);
      barButton('Cambiar estado').click();
      fixture.detectChanges();
      await wait();
      overlayButton('Atendido').click();
      await wait();

      const patches = http.match((r) => r.method === 'PATCH' && r.url.endsWith('/status/attended'));
      expect(patches.map((p) => p.request.url).sort()).toEqual(['/gateway/packages/p0/status/attended', '/gateway/packages/p1/status/attended']);
      patches.forEach((p) => respondWith(p, fx(setStatus)));
      fixture.detectChanges();

      expect(root().textContent).toContain('El estado de 2 paquetes ahora es «Atendido»');
      expect(bar()).toBeNull();
      reloadAnswer(withStatuses(['attended', 'attended', 'cancelled']));
    });

    it('si el gateway rechaza alguno, lo dice con su nombre y cambia los demás', async () => {
      load(withStatuses(['pending', 'pending']));
      pick(0);
      pick(1);
      barButton('Cambiar estado').click();
      fixture.detectChanges();
      await wait();
      overlayButton('No atendido').click();
      await wait();

      const [first, second] = http.match((r) => r.method === 'PATCH');
      respondWith(first, fx(setStatus));
      second.flush({ message: 'no' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(root().textContent).toContain('El estado de 1 paquete ahora es «No atendido»');
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se pudo cambiar el estado de 1 paquete');
      reloadAnswer(withStatuses(['unattended', 'pending']));
    });

    it('exporta solo los elegidos, sin volver a pedirlos', async () => {
      const downloads: string[] = [];
      const blobs: Blob[] = [];
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        downloads.push(this.download);
      });
      spyOn(URL, 'createObjectURL').and.callFake((b: Blob | MediaSource) => {
        blobs.push(b as Blob);
        return 'blob:prueba';
      });
      load(withStatuses(['pending', 'attended', 'cancelled']));
      pick(1);
      barButton('Exportar').click();
      fixture.detectChanges();

      expect(downloads).toEqual(['paquetes.csv']);
      const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await blobs[0].arrayBuffer());
      expect(text.trimEnd().split('\r\n').length).toBe(1 + 1);
      expect(text).toContain('G1');
      expect(root().textContent).toContain('Se exportaron 1 paquete elegido a paquetes.csv');
      http.expectNone((r) => r.method === 'GET');
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

    /** Responde las páginas de 100 que pide la lista para tener los `total` paquetes. */
    const loadAll = (total: number) => {
      for (let page = 0; page * 100 < total; page++) {
        http
          .expectOne((r) => r.method === 'GET' && r.url === '/gateway/packages' && r.params.get('page') === String(page) && r.params.get('size') === '100')
          .flush({ ...withTotal(Math.min(100, total - page * 100), total), page });
      }
      fixture.detectChanges();
    };

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
      loadAll(201);
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
      loadAll(201);
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
      loadAll(201);
      exportButton().click();
      const pending = http.expectOne((r) => r.params.get('size') === '200');
      fixture.destroy();
      expect(pending.cancelled).toBeTrue();
    });
  });
});
