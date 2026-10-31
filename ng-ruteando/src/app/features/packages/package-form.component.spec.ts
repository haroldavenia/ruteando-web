import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { Fixture, expectSameContract, respondWith } from '../../../testing/api-testing';
import { TEST_MAP_CONFIG } from '../../../testing/map';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { Package } from '../../core/api/models';
import { MAP_CONFIG } from '../../shared/map/map-config';

import { PackageFormComponent, buildUpdateBody } from './package-form.component';

import create from '../../../testing/fixtures/gateway/post__packages.json';
import get from '../../../testing/fixtures/gateway/get__packages__id.json';

const fx = (f: unknown) => f as Fixture;

describe('PackageFormComponent', () => {
  let fixture: ComponentFixture<PackageFormComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const form = () => (fixture.componentInstance as unknown as { form: FormGroup }).form;
  const input = (control: string) => root().querySelector(`[formcontrolname="${control}"]`) as HTMLInputElement;

  function setup(id: string | null): void {
    TestBed.configureTestingModule({
      imports: [PackageFormComponent],
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
    fixture = TestBed.createComponent(PackageFormComponent);
    fixture.detectChanges();
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush([]));
  }

  const type = (control: string, value: string) => {
    const el = input(control);
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const typeLocation = (lat: string, lng: string) => {
    for (const [label, v] of [['Latitud', lat], ['Longitud', lng]]) {
      const el = Array.from(root().querySelectorAll('app-location-fields mat-form-field'))
        .find((f) => f.querySelector('mat-label')?.textContent === label)!
        .querySelector('input') as HTMLInputElement;
      el.value = v;
      el.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  };
  const submit = () => {
    (root().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const fillRequired = () => {
    const body = fx(create).request.body as { name: string; serviceType: string; address: string; weight: number; volume: number; location: { coordinates: [number, number] } };
    type('name', body.name);
    form().controls['serviceType'].setValue(body.serviceType);
    type('address', body.address);
    type('weight', String(body.weight));
    type('volume', String(body.volume));
    typeLocation(String(body.location.coordinates[1]), String(body.location.coordinates[0]));
  };

  afterEach(() => http.verify());

  describe('alta', () => {
    beforeEach(() => setup(null));

    it('la cabecera ofrece volver a los paquetes sobre el título', () => {
      expect(root().querySelector('app-form-head h1')?.textContent).toBe('Nuevo paquete');
      expect(root().querySelector('app-form-head a.back')?.getAttribute('href')).toBe('/paquetes');
    });

    it('los campos van en cuatro secciones con icono: identificación, dirección, carga y ubicación', () => {
      const sections = Array.from(root().querySelectorAll('form section.form-section'));

      expect(sections.map((s) => s.querySelector('h2')?.textContent?.trim())).toEqual(['Identificación', 'Dirección', 'Carga', 'Ubicación']);
      expect(sections[3].querySelector('app-location-fields')).not.toBeNull();
      expect(sections[0].querySelector('[formcontrolname="guideNumber"]')).not.toBeNull();
      expect(sections[1].querySelector('[formcontrolname="address"]')).not.toBeNull();
      expect(sections[2].querySelector('[formcontrolname="weight"]')).not.toBeNull();
      expect(sections[2].querySelector('[formcontrolname="observation"]')).not.toBeNull();
    });

    it('al escribir avisa de los cambios sin guardar en la barra de acciones', () => {
      expect(root().querySelector('app-form-actions [role="status"]')?.textContent?.trim()).toBe('');

      type('name', 'Caja 1');

      expect(root().querySelector('app-form-actions [role="status"]')?.textContent).toContain('Cambios sin guardar');
    });

    it('sin los obligatorios no envía nada y muestra los errores', () => {
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Este campo es obligatorio');
    });

    it('ofrece los tipos de servicio con su etiqueta en español', () => {
      (root().querySelector('mat-select') as HTMLElement).click();
      fixture.detectChanges();
      expect(Array.from(document.querySelectorAll('mat-option')).map((o) => o.textContent!.trim())).toEqual(['Entrega', 'Recogida', 'Mixto']);
    });

    it('envía el cuerpo del ejemplo real sin la guía vacía', () => {
      fillRequired();
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();

      const req = http.expectOne((r) => r.method === 'POST' && r.url === '/gateway/packages');
      expectSameContract(req, fx(create));
      expect('guideNumber' in req.request.body).toBeFalse();
      respondWith(req, fx(create));
    });

    it('con guía, piezas y observación los envía', () => {
      fillRequired();
      type('guideNumber', ' G-100 ');
      type('pieceNumber', '3');
      type('observation', 'Frágil');
      submit();
      const req = http.expectOne((r) => r.method === 'POST');
      expect(req.request.body).toEqual(jasmine.objectContaining({ guideNumber: 'G-100', pieceNumber: 3, observation: 'Frágil' }));
      req.flush({});
    });

    for (const [campo, valor] of [['weight', '-1'], ['volume', '-0.5'], ['pieceNumber', '0'], ['pieceNumber', '1.5']] as const) {
      it(`${campo} = ${valor} se rechaza sin enviar nada`, () => {
        fillRequired();
        type(campo, valor);
        submit();
        http.expectNone((r) => r.method === 'POST');
        expect(root().querySelector('mat-error')).not.toBeNull();
      });
    }

    it('una guía duplicada (409) muestra el mensaje y conserva lo escrito', () => {
      fillRequired();
      type('guideNumber', 'G-1');
      submit();
      http.expectOne((r) => r.method === 'POST').flush({ error: 'Conflict', message: 'dup' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      expect(root().querySelector('[role="alert"]')?.textContent).toContain('Ya existe un paquete con ese número de guía');
      expect(input('guideNumber').value).toBe('G-1');
      expect(root().querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBeFalse();
    });

    it('la dirección no calcula ninguna ubicación', () => {
      type('address', 'Carrera 7 # 71-21');
      expect((root().querySelector('app-location-fields input') as HTMLInputElement).value).toBe('');
    });

    it('con cambios sin guardar avisa al salir', () => {
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
      form().markAsDirty();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
    });
  });

  describe('edición', () => {
    const record = fx(get).response.body as Package;
    const complete = {
      ...record,
      guideNumber: 'G-9',
      measure: { height: 1, width: 2, depth: 3 },
      timeWindow: { start: '08:00', end: '12:00' },
      receiver: { name: 'Ana' },
      sender: { name: 'Luis' },
      category: 'frio',
      goodsTags: ['frágil'],
      customerId: 'c1',
      zoneId: 'z1',
      durationStay: 300,
      standardizedAddress: 'Calle 1',
      geocodingScore: 0.9,
      geocodingStatus: 'match',
    } as Package;

    it('rellena el formulario con el paquete', () => {
      setup(record.id);
      http.expectOne(`/gateway/packages/${record.id}`).flush(complete);
      fixture.detectChanges();
      expect(input('name').value).toBe(record.name);
      expect(input('guideNumber').value).toBe('G-9');
    });

    it('al guardar reenvía los campos no editables y no envía los de solo lectura', () => {
      setup(record.id);
      http.expectOne(`/gateway/packages/${record.id}`).flush(complete);
      fixture.detectChanges();
      type('name', 'Renombrado');
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();

      const req = http.expectOne((r) => r.method === 'PUT' && r.url === `/gateway/packages/${record.id}`);
      const body = req.request.body;
      expect(body.name).toBe('Renombrado');
      expect(body.measure).toEqual(complete.measure);
      expect(body.timeWindow).toEqual(complete.timeWindow);
      expect(body.receiver).toEqual(complete.receiver);
      expect(body.sender).toEqual(complete.sender);
      expect(body.category).toBe('frio');
      expect(body.goodsTags).toEqual(['frágil']);
      expect(body.customerId).toBe('c1');
      expect(body.zoneId).toBe('z1');
      expect(body.durationStay).toBe(300);
      for (const readOnly of ['id', 'tenantId', 'status', 'createdAt', 'updatedAt', 'standardizedAddress', 'geocodingScore', 'geocodingStatus']) {
        expect(readOnly in body).withContext(readOnly).toBeFalse();
      }
      req.flush(complete);
    });

    it('vaciar la guía la envía como null', () => {
      setup(record.id);
      http.expectOne(`/gateway/packages/${record.id}`).flush(complete);
      fixture.detectChanges();
      type('guideNumber', '');
      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.guideNumber).toBeNull();
      req.flush(complete);
    });

    it('con un id inexistente (404) enlaza al listado', () => {
      setup('x');
      http.expectOne('/gateway/packages/x').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root().textContent).toContain('El registro ya no existe');
      expect(root().querySelector('a[href="/paquetes"]')).not.toBeNull();
    });
  });
});

describe('buildUpdateBody', () => {
  it('lo editado manda sobre el registro y se quitan los campos de solo lectura', () => {
    const record = { id: '1', tenantId: 't', status: 'pending', createdAt: 'a', updatedAt: 'b', name: 'viejo', measure: { a: 1 } } as unknown as Package;
    expect(buildUpdateBody(record, { name: 'nuevo' })).toEqual({ name: 'nuevo', measure: { a: 1 } } as never);
  });
});
