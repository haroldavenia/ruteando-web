import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { Fixture, expectSameContract, respondWith } from '../../../testing/api-testing';
import { TEST_MAP_CONFIG } from '../../../testing/map';
import { makeUser } from '../../../testing/session';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { CurrentUser } from '../../core/auth/current-user';
import { LatLng } from '../../core/geo/lat-lng';
import { MAP_CONFIG } from '../../shared/map/map-config';

import { MAX_CODE_LENGTH, ZoneFormComponent, buildZoneUpdateBody } from './zone-form.component';
import { Zone } from '../../core/api/models';

import create from '../../../testing/fixtures/gateway/post__zones.json';
import get from '../../../testing/fixtures/gateway/get__zones__id.json';
import update from '../../../testing/fixtures/gateway/put__zones__id.json';

const fx = (f: unknown) => f as Fixture;
const SQUARE: LatLng[] = [
  { lat: 4.5, lng: -74.1 },
  { lat: 4.5, lng: -74.0 },
  { lat: 4.7, lng: -74.0 },
  { lat: 4.7, lng: -74.1 },
];
const BOWTIE: LatLng[] = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 1, lng: 0 }, { lat: 0, lng: 1 }];

describe('ZoneFormComponent', () => {
  let fixture: ComponentFixture<ZoneFormComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const input = (control: string) => root().querySelector(`[formcontrolname="${control}"]`) as HTMLInputElement;
  const vertices = () => (fixture.componentInstance as unknown as { vertices: WritableSignal<LatLng[]> }).vertices;

  function setup(id: string | null): void {
    TestBed.configureTestingModule({
      imports: [ZoneFormComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(CurrentUser).set(makeUser());
    fixture = TestBed.createComponent(ZoneFormComponent);
    fixture.detectChanges();
  }
  const type = (control: string, value: string) => {
    const el = input(control);
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = () => {
    (root().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const radio = (label: string) =>
    (Array.from(root().querySelectorAll('label.color')) as HTMLElement[]).find((l) => l.textContent!.trim() === label)!.querySelector('input') as HTMLInputElement;
  const fillValid = () => {
    type('name', 'Postman zone');
    type('code', 'PM');
    vertices().set(SQUARE);
    fixture.detectChanges();
  };

  afterEach(() => http.verify());

  describe('alta', () => {
    beforeEach(() => setup(null));

    it('la cabecera ofrece volver a las zonas y los campos van en dos secciones con icono', () => {
      expect(root().querySelector('app-form-head a.back')?.getAttribute('href')).toBe('/zonas');
      expect(Array.from(root().querySelectorAll('form section.form-section h2')).map((h) => h.textContent?.trim())).toEqual(['Datos de la zona', 'Polígono']);
      expect(root().querySelector('section[aria-labelledby="polygon-title"] h2#polygon-title')).not.toBeNull();
    });

    it('cada color es una pastilla de al menos 44px de alto que se puede pulsar entera, con el mismo radio de siempre', () => {
      const label = radio('Azul').closest('label') as HTMLElement;
      const target = radio('Azul').getBoundingClientRect();

      expect(label.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      // El radio nativo cubre toda la pastilla (invisible, dentro de su borde de 1px), así que el objetivo de pulsación es la pastilla
      // y no un círculo de 13px
      expect(label.getBoundingClientRect().width - target.width).toBeLessThanOrEqual(2);
      expect(label.getBoundingClientRect().height - target.height).toBeLessThanOrEqual(2);
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(radio('Azul').name).toBe('zone-color');
      expect(radio('Azul').type).toBe('radio');
      expect(getComputedStyle(radio('Azul')).opacity).toBe('0');
    });

    it('el color elegido se distingue por más que el tono: la pastilla cambia de borde y de fondo', () => {
      const label = (name: string) => radio(name).closest('label') as HTMLElement;
      const before = getComputedStyle(label('Azul')).borderTopColor;

      radio('Azul').click();
      fixture.detectChanges();

      expect(label('Azul').classList).toContain('selected');
      expect(getComputedStyle(label('Azul')).borderTopColor).not.toBe(before);
      expect(getComputedStyle(label('Azul')).backgroundColor).not.toBe(getComputedStyle(label('Bermellón')).backgroundColor);
    });

    it('con cambios sin guardar lo dice la barra de acciones', () => {
      type('name', 'Norte');

      expect(root().querySelector('app-form-actions [role="status"]')?.textContent).toContain('Cambios sin guardar');
    });

    it('el formulario no se limita a 880px: el mapa y los vértices necesitan sitio', () => {
      expect(getComputedStyle(root().querySelector('form.card')!).maxWidth).toBe('none');
    });

    it('sin nombre, código ni polígono no envía nada y muestra los errores', () => {
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Este campo es obligatorio');
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('Dibuja el polígono');
    });

    it('con un polígono de lados cruzados no envía nada y dice qué lados', () => {
      type('name', 'X');
      type('code', 'X1');
      vertices().set(BOWTIE);
      fixture.detectChanges();
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().querySelector('.error')?.textContent).toContain('Los lados 1 y 3 se cruzan');
    });

    it('con menos de tres vértices no envía nada', () => {
      type('name', 'X');
      type('code', 'X1');
      vertices().set(SQUARE.slice(0, 2));
      fixture.detectChanges();
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().querySelector('.error')?.textContent).toContain('al menos tres vértices');
    });

    it('un código con espacios o de más de 20 caracteres se rechaza', () => {
      fillValid();
      type('code', 'con espacio');
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('El código no puede llevar espacios');

      type('code', 'x'.repeat(MAX_CODE_LENGTH + 1));
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('como máximo 20 caracteres');
    });

    it('envía el cuerpo del ejemplo real (sin color) y recorta los espacios alrededor', () => {
      type('name', '  Postman zone ');
      type('code', ' PM ');
      vertices().set(SQUARE);
      fixture.detectChanges();
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();

      const req = http.expectOne((r) => r.method === 'POST' && r.url === '/gateway/zones');
      expect(req.request.params.get('tenantId')).toBe('tenant-1');
      expectSameContract(req, fx(create));
      expect('color' in req.request.body).toBeFalse();
      respondWith(req, fx(create));
    });

    it('un polígono horario se envía en sentido antihorario y cerrado', () => {
      fillValid();
      vertices().set([...SQUARE].reverse());
      fixture.detectChanges();
      submit();
      const req = http.expectOne((r) => r.method === 'POST');
      const ring = req.request.body.boundary.coordinates[0];
      expect(ring.length).toBe(5);
      expect(ring[0]).toEqual(ring[4]);
      expect(ring).toEqual((fx(create).request.body as { boundary: { coordinates: number[][][] } }).boundary.coordinates[0]);
      req.flush({});
    });

    it('con un color de la paleta lo envía como #RRGGBB', () => {
      fillValid();
      radio('Azul').click();
      fixture.detectChanges();
      submit();
      const req = http.expectOne((r) => r.method === 'POST');
      expect(req.request.body.color).toBe('#0072B2');
      req.flush({});
    });

    it('ofrece la paleta con nombres y «Sin color», que es la opción por defecto', () => {
      const labels = Array.from(root().querySelectorAll('label.color')).map((l) => l.textContent!.trim());
      expect(labels).toEqual(['Sin color', 'Azul', 'Bermellón', 'Verde', 'Rosa', 'Naranja', 'Celeste', 'Vino', 'Verde oscuro']);
      expect(radio('Sin color').checked).toBeTrue();
      expect(root().querySelector('fieldset legend')?.textContent).toContain('Color');
    });

    it('un código repetido (409) muestra el mensaje y conserva lo escrito', () => {
      fillValid();
      submit();
      http.expectOne((r) => r.method === 'POST').flush({ message: 'dup' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('Ya existe una zona con ese código');
      expect(input('code').value).toBe('PM');
      expect(vertices()().length).toBe(4);
      expect(root().querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBeFalse();
    });

    it('con cambios sin guardar avisa al salir', () => {
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
      vertices().set(SQUARE);
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
    });
  });

  describe('edición', () => {
    const record = fx(get).response.body as Zone;
    const inactive = { ...record, active: false, color: '#D55E00' } as Zone;

    it('rellena el formulario y el polígono (sin el vértice de cierre)', () => {
      setup(record.id);
      http.expectOne((r) => r.url === `/gateway/zones/${record.id}`).flush(inactive);
      fixture.detectChanges();
      expect(input('name').value).toBe('Postman zone');
      expect(input('code').value).toBe('PM');
      expect(radio('Bermellón').checked).toBeTrue();
      expect(vertices()().length).toBe(4);
      expect(root().querySelectorAll('app-vertex-table tbody tr').length).toBe(4);
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    });

    it('al guardar conserva active y no envía los campos de solo lectura', () => {
      setup(record.id);
      http.expectOne((r) => r.url === `/gateway/zones/${record.id}`).flush(inactive);
      fixture.detectChanges();
      type('name', 'Renombrada');
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();

      const req = http.expectOne((r) => r.method === 'PUT' && r.url === `/gateway/zones/${record.id}`);
      expect(req.request.params.get('tenantId')).toBe('tenant-1');
      expect(req.request.body.name).toBe('Renombrada');
      expect(req.request.body.active).toBeFalse();
      expect(req.request.body.color).toBe('#D55E00');
      for (const readOnly of ['id', 'tenantId', 'createdAt', 'updatedAt']) {
        expect(readOnly in req.request.body).withContext(readOnly).toBeFalse();
      }
      respondWith(req, fx(update));
    });

    it('quitar el color lo envía como null', () => {
      setup(record.id);
      http.expectOne((r) => r.url === `/gateway/zones/${record.id}`).flush(inactive);
      fixture.detectChanges();
      radio('Sin color').click();
      fixture.detectChanges();
      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.color).toBeNull();
      req.flush(inactive);
    });

    it('con un id inexistente (404) enlaza al listado', () => {
      setup('x');
      http.expectOne((r) => r.url === '/gateway/zones/x').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root().textContent).toContain('El registro ya no existe');
      expect(root().querySelector('a[href="/zonas"]')).not.toBeNull();
      expect(root().querySelector('form')).toBeNull();
    });
  });
});

describe('buildZoneUpdateBody', () => {
  it('lo editado manda sobre el registro y se quitan los campos de solo lectura', () => {
    const record = { id: '1', tenantId: 't', createdAt: 'a', updatedAt: 'b', name: 'viejo', code: 'V', active: false } as unknown as Zone;
    expect(buildZoneUpdateBody(record, { name: 'nuevo' })).toEqual({ name: 'nuevo', code: 'V', active: false } as never);
  });
});
