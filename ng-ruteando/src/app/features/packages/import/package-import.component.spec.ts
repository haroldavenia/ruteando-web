import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { Fixture, respondWith } from '../../../../testing/api-testing';
import { API_BASE_URL } from '../../../core/api/api-config';
import { errorInterceptor } from '../../../core/api/error.interceptor';
import { parseCsv } from '../../../shared/data/csv';

import { MAX_DATA_ROWS, MAX_FILE_BYTES, PackageImportComponent } from './package-import.component';
import { packageTemplateCsv } from './package-rows';

import create from '../../../../testing/fixtures/gateway/post__packages.json';

const HEADER = 'ID_GUIA;DIRECCION;LONGITUD;LATITUD';
const csvOf = (...lines: string[]) => [HEADER, ...lines].join('\n');
const wait = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

describe('PackageImportComponent', () => {
  let fixture: ComponentFixture<PackageImportComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent!.replace(/\s+/g, ' ');
  const resultSummary = () => root().querySelector('section[aria-labelledby="result-title"] .summary')?.textContent;
  const button = (label: string) => (Array.from(root().querySelectorAll('button, a')) as HTMLElement[]).find((b) => b.textContent?.includes(label)) as HTMLButtonElement | undefined;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PackageImportComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PackageImportComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  async function choose(content: string | BlobPart, name = 'paquetes.csv'): Promise<void> {
    const input = root().querySelector('input[type="file"]') as HTMLInputElement;
    const transfer = new DataTransfer();
    transfer.items.add(new File([content], name, { type: 'text/csv' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await wait(40);
    fixture.detectChanges();
  }

  /** Responde a las altas pendientes con `reply` hasta que no quede ninguna y la importación acabe. */
  async function serve(reply: (req: TestRequest, index: number) => void): Promise<void> {
    let served = 0;
    for (let round = 0; round < 50; round++) {
      await wait(5);
      const pending = http.match((r) => r.method === 'POST' && r.url === '/gateway/packages');
      pending.forEach((req) => reply(req, served++));
      fixture.detectChanges();
      if (root().querySelector('#result-title')) {
        return;
      }
    }
  }
  const created = (req: TestRequest) => respondWith(req, create as unknown as Fixture);

  describe('elegir y leer el archivo', () => {
    it('explica las columnas y avisa de que se necesitan las coordenadas', () => {
      expect(text()).toContain('La aplicación no calcula la ubicación a partir de la dirección');
      const headers = Array.from(root().querySelectorAll('tbody th')).map((th) => th.textContent!.trim());
      expect(headers).toEqual(jasmine.arrayContaining(['DIRECCION', 'LONGITUD', 'LATITUD', 'ID_GUIA', 'PESO']));
      expect(root().querySelector('table caption')?.textContent).toContain('Columnas del archivo');
    });

    it('«Descargar plantilla» descarga plantilla-paquetes.csv', () => {
      let download = '';
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        download = this.download;
      });
      spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
      button('Descargar plantilla')!.click();
      expect(download).toBe('plantilla-paquetes.csv');
    });

    it('el control de archivo tiene etiqueta', () => {
      const input = root().querySelector('input[type="file"]') as HTMLInputElement;
      expect(root().querySelector(`label[for="${input.id}"]`)?.textContent).toContain('Archivo CSV');
    });

    it('un archivo que no es .csv se rechaza', async () => {
      await choose('a,b', 'datos.xlsx');
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('El archivo debe ser un CSV');
      expect(root().querySelector('#preview-title')).toBeNull();
    });

    it('un archivo vacío se rechaza', async () => {
      await choose('');
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('El archivo está vacío');
    });

    it('un archivo de más de 2 MB se rechaza sin leerlo', async () => {
      await choose(new Uint8Array(MAX_FILE_BYTES + 1));
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('supera los 2 MB');
    });

    it('un archivo con más de 2000 filas se rechaza', async () => {
      const lines = Array.from({ length: MAX_DATA_ROWS + 1 }, (_, i) => `G${i};Calle ${i};-74;4.6`);
      await choose(csvOf(...lines));
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('más de 2000 filas');
    });

    it('con exactamente 2000 filas se acepta', async () => {
      const lines = Array.from({ length: MAX_DATA_ROWS }, (_, i) => `G${i};Calle ${i};-74;4.6`);
      await choose(csvOf(...lines));
      expect(root().querySelector('[role="alert"]')).toBeNull();
      expect(text()).toContain('2000 filas leídas: 2000 válidas');
    });

    it('sin las columnas obligatorias dice cuáles faltan y no muestra la vista previa', async () => {
      await choose('NOMBRE;DIRECCION\nAna;Calle 1');
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('Faltan columnas obligatorias: LONGITUD, LATITUD');
      expect(root().querySelector('#preview-title')).toBeNull();
    });

    it('un archivo con solo la cabecera se rechaza', async () => {
      await choose(HEADER);
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('no tiene filas de datos');
    });

    it('al leer no se hace ninguna petición al gateway', async () => {
      await choose(csvOf('G-1;Calle 1;-74;4.6'));
      http.expectNone(() => true);
      expect(root().querySelector('#preview-title')).not.toBeNull();
    });

    it('avisa de los caracteres de sustitución y de las columnas ignoradas', async () => {
      await choose(`${HEADER};COLOR\nG-1;Direcci�n;-74;4.6;rojo`);
      expect(text()).toContain('probablemente no está en UTF-8');
      expect(text()).toContain('Se ignoran las columnas: COLOR');
    });

    it('avisa de una comilla sin cerrar', async () => {
      await choose(`${HEADER}\nG-1;"Calle 1;-74;4.6`);
      expect(text()).toContain('comilla sin cerrar');
    });

    it('quitar el archivo y elegir otro descartan la vista previa anterior', async () => {
      await choose(csvOf('G-1;Calle 1;-74;4.6'));
      expect(text()).toContain('1 filas leídas');
      button('Quitar archivo')!.click();
      fixture.detectChanges();
      expect(root().querySelector('#preview-title')).toBeNull();

      await choose(csvOf('G-2;Calle 2;-74;4.6', 'G-3;Calle 3;-74;4.6'));
      expect(text()).toContain('2 filas leídas');
      await choose('NOMBRE\nx');
      expect(root().querySelector('#preview-title')).toBeNull();
    });

    it('la plantilla descargada se puede volver a cargar sin errores', async () => {
      await choose(packageTemplateCsv());
      expect(text()).toContain('1 filas leídas: 1 válidas y 0 rechazadas');
      expect(root().querySelector('[role="alert"]')).toBeNull();
    });
  });

  describe('vista previa', () => {
    const mixed = csvOf('G-1;Calle 1;-74;4.6', 'G-2;;-74;4.6', 'G-3;Calle 3;-200;4.6', 'G-4;Calle 4;-74;4.6');

    it('resume las filas leídas, válidas y rechazadas', async () => {
      await choose(mixed);
      expect(text()).toContain('4 filas leídas: 2 válidas y 2 rechazadas');
      expect(button('Importar 2 paquetes')).toBeDefined();
    });

    it('lista los errores por línea con campo y motivo, en tablas con título', async () => {
      await choose(mixed);
      const tables = Array.from(root().querySelectorAll('table caption')).map((c) => c.textContent!.trim());
      expect(tables).toEqual(jasmine.arrayContaining(['Filas rechazadas (no se importarán)']));
      const rows = Array.from(root().querySelectorAll('table'))
        .find((t) => t.querySelector('caption')?.textContent?.includes('rechazadas'))!
        .querySelectorAll('tbody tr');
      const cells = Array.from(rows).map((r) => Array.from(r.querySelectorAll('td')).map((c) => c.textContent!.trim()));
      expect(cells).toEqual([
        ['3', 'DIRECCION', 'La dirección es obligatoria'],
        ['4', 'LONGITUD', 'La longitud debe ser un número entre -180 y 180'],
      ]);
    });

    it('la tabla de muestra tiene como máximo 20 filas', async () => {
      const lines = Array.from({ length: 30 }, (_, i) => `G${i};Calle ${i};-74;4.6`);
      await choose(csvOf(...lines));
      const sample = Array.from(root().querySelectorAll('table')).find((t) => t.querySelector('caption')?.textContent?.includes('Primeras'))!;
      expect(sample.querySelectorAll('tbody tr').length).toBe(20);
      expect(text()).toContain('30 válidas');
      expect(button('Importar 30 paquetes')).toBeDefined();
    });

    it('con todo inválido desactiva el botón y explica por qué', async () => {
      await choose(csvOf(';;', 'G-2;;-74;4.6'));
      expect((button('Importar 0 paquetes') as HTMLButtonElement).disabled).toBeTrue();
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('Ninguna fila es válida');
    });

    it('el contenido hostil se muestra como texto y no se ejecuta', async () => {
      await choose(csvOf('G-1;<script>window.__pwned=1</script>;-74;4.6', 'G-2;=HYPERLINK("http://x");-74;4.6'));
      expect(root().querySelector('script')).toBeNull();
      expect(root().querySelector('img')).toBeNull();
      expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
      expect(text()).toContain('<script>window.__pwned=1</script>');
      expect(text()).toContain('=HYPERLINK("http://x")');
    });
  });

  describe('importación', () => {
    const three = csvOf('G-1;Calle 1;-74.07728;4.60872', 'G-2;Calle 2;-74;4.6', 'G-3;Calle 3;-74;4.6');

    it('crea cada paquete con su cuerpo y muestra el resumen final', async () => {
      await choose(three);
      const bodies: unknown[] = [];
      button('Importar 3 paquetes')!.click();
      fixture.detectChanges();
      expect(root().querySelector('input[type="file"]')?.hasAttribute('disabled')).toBeTrue();
      await serve((req) => {
        bodies.push(req.request.body);
        created(req);
      });

      expect(bodies[0]).toEqual({
        name: 'G-1',
        serviceType: 'delivery',
        address: 'Calle 1',
        location: { type: 'Point', coordinates: [-74.07728, 4.60872] },
        weight: 0,
        volume: 0,
        guideNumber: 'G-1',
      });
      expect(root().querySelector('#result-title')).not.toBeNull();
      expect(resultSummary()).toContain('3 creados, 0 ya existían, 0 fallidos y 0 sin procesar');
      expect(button('Ver los paquetes')?.getAttribute('href')).toBe('/paquetes');
    });

    it('muestra el progreso mientras importa y marca que hay cambios sin guardar', async () => {
      await choose(three);
      button('Importar 3 paquetes')!.click();
      fixture.detectChanges();
      await wait(5);
      const pending = http.match((r) => r.method === 'POST');
      expect(pending.length).toBe(3);
      expect(text()).toContain('Importando… 0 de 3');
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
      expect(fixture.componentInstance.leaveDialog().message).toContain('importación en curso');
      expect(fixture.componentInstance.leaveDialog().title).toBe('¿Salir de la importación?');
      pending.forEach(created);
      await wait(20);
      fixture.detectChanges();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    });

    it('lanza como máximo 4 peticiones a la vez', async () => {
      const lines = Array.from({ length: 10 }, (_, i) => `G${i};Calle ${i};-74;4.6`);
      await choose(csvOf(...lines));
      button('Importar 10 paquetes')!.click();
      await wait(5);
      const first = http.match((r) => r.method === 'POST');
      expect(first.length).toBe(4);
      first.forEach(created);
      await serve(created);
      expect(root().querySelector('#result-title')).not.toBeNull();
    });

    it('un 409 con guía cuenta como «ya existía» y un 500 como fallida, sin parar las demás', async () => {
      await choose(three);
      button('Importar 3 paquetes')!.click();
      await serve((req, i) => {
        if (i === 0) {
          req.flush({ message: 'dup' }, { status: 409, statusText: 'Conflict' });
        } else if (i === 1) {
          req.flush({ message: 'x' }, { status: 500, statusText: 'Server Error' });
        } else {
          created(req);
        }
      });
      expect(resultSummary()).toContain('1 creados, 1 ya existían, 1 fallidos y 0 sin procesar');
      const failed = Array.from(root().querySelectorAll('table')).find((t) => t.querySelector('caption')?.textContent?.includes('fallaron'))!;
      expect(failed.querySelectorAll('tbody tr').length).toBe(1);
      expect(failed.textContent).toContain('El servicio no está disponible');
    });

    it('«Reintentar las fallidas» vuelve a crear solo esas filas', async () => {
      await choose(three);
      button('Importar 3 paquetes')!.click();
      await serve((req, i) => (i === 1 ? req.flush({}, { status: 500, statusText: 'x' }) : created(req)));
      expect(button('Reintentar las fallidas')).toBeDefined();

      button('Reintentar las fallidas')!.click();
      await wait(5);
      const retried = http.match((r) => r.method === 'POST');
      expect(retried.length).toBe(1);
      expect(retried[0].request.body.address).toBe('Calle 2');
      created(retried[0]);
      await wait(20);
      fixture.detectChanges();
      expect(resultSummary()).toContain('3 creados, 0 ya existían, 0 fallidos');
      expect(button('Reintentar las fallidas')).toBeUndefined();
    });

    it('«Cancelar importación» deja las filas sin lanzar como sin procesar', async () => {
      const lines = Array.from({ length: 10 }, (_, i) => `G${i};Calle ${i};-74;4.6`);
      await choose(csvOf(...lines));
      button('Importar 10 paquetes')!.click();
      fixture.detectChanges();
      await wait(5);
      const first = http.match((r) => r.method === 'POST');
      button('Cancelar importación')!.click();
      fixture.detectChanges();
      expect(text()).toContain('Cancelando…');
      first.forEach(created);
      await wait(30);
      fixture.detectChanges();
      http.expectNone((r) => r.method === 'POST');
      expect(resultSummary()).toContain('4 creados, 0 ya existían, 0 fallidos y 6 sin procesar');
    });

    it('el informe de errores junta las filas rechazadas y las fallidas, con BOM y fórmulas protegidas', async () => {
      await choose(csvOf('G-1;=CMD();-74;4.6', 'G-2;;-74;4.6', 'G-3;Calle 3;-74;4.6'));
      button('Importar 2 paquetes')!.click();
      await serve((req, i) => (i === 0 ? req.flush({}, { status: 500, statusText: 'x' }) : created(req)));

      let blob: Blob | null = null;
      let download = '';
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        download = this.download;
      });
      spyOn(URL, 'createObjectURL').and.callFake((b: Blob | MediaSource) => {
        blob = b as Blob;
        return 'blob:x';
      });
      button('Descargar informe de errores')!.click();
      expect(download).toBe('errores-importacion.csv');
      const content = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await (blob as unknown as Blob).arrayBuffer());
      expect(content.charCodeAt(0)).toBe(0xfeff);
      const rows = parseCsv(content).rows;
      expect(rows[0]).toEqual(['LINEA', 'CAMPO', 'MOTIVO', 'FILA ORIGINAL']);
      expect(rows.slice(1).map((r) => r[0])).toEqual(['3', '2']);
      expect(rows[1][2]).toBe('La dirección es obligatoria');
      expect(rows[2][3]).toBe('G-1 | =CMD() | -74 | 4.6');
    });

    it('al salir de la pantalla con la importación en curso no se lanzan más peticiones', async () => {
      const lines = Array.from({ length: 10 }, (_, i) => `G${i};Calle ${i};-74;4.6`);
      await choose(csvOf(...lines));
      button('Importar 10 paquetes')!.click();
      await wait(5);
      const first = http.match((r) => r.method === 'POST');
      fixture.destroy();
      first.forEach((req) => (req.cancelled ? undefined : created(req)));
      await wait(30);
      expect(http.match((r) => r.method === 'POST').length).toBe(0);
    });
  });
});
