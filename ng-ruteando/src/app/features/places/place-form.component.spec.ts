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
import { MAP_CONFIG } from '../../shared/map/map-config';
import { MapViewComponent } from '../../shared/map/map-view.component';

import { PHONE_PATTERN, PlaceFormComponent } from './place-form.component';

import create from '../../../testing/fixtures/gateway/post__places.json';
import get from '../../../testing/fixtures/gateway/get__places__id.json';

const fx = (f: unknown) => f as Fixture;

describe('PlaceFormComponent', () => {
  let fixture: ComponentFixture<PlaceFormComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const form = () => (fixture.componentInstance as unknown as { form: FormGroup }).form;
  const input = (control: string) => root().querySelector(`[formcontrolname="${control}"]`) as HTMLInputElement;

  function setup(id: string | null): void {
    TestBed.configureTestingModule({
      imports: [PlaceFormComponent],
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
    fixture = TestBed.createComponent(PlaceFormComponent);
    fixture.detectChanges();
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush([]));
  }

  const type = (control: string, value: string) => {
    const el = input(control);
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const latLngInput = (label: string) =>
    Array.from(root().querySelectorAll('app-location-fields mat-form-field')).find((f) => f.querySelector('mat-label')?.textContent === label)!.querySelector('input') as HTMLInputElement;
  const typeLocation = (lat: string, lng: string) => {
    for (const [label, v] of [['Latitud', lat], ['Longitud', lng]]) {
      const el = latLngInput(label);
      el.value = v;
      el.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  };
  const submit = () => {
    (root().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const fillBase = () => {
    const body = fx(create).request.body as { name: string; type: string; location: { coordinates: [number, number] } };
    type('name', body.name);
    form().controls['type'].setValue(body.type);
    typeLocation(String(body.location.coordinates[1]), String(body.location.coordinates[0]));
  };

  afterEach(() => http.verify());

  describe('alta', () => {
    beforeEach(() => setup(null));

    it('sin nombre, tipo ni ubicación no envía nada y muestra los errores', () => {
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Este campo es obligatorio');
    });

    it('ofrece los tipos habituales con su etiqueta en español', () => {
      (root().querySelector('mat-select') as HTMLElement).click();
      fixture.detectChanges();
      const labels = Array.from(document.querySelectorAll('mat-option')).map((o) => o.textContent!.trim());
      expect(labels).toEqual(['Depósito', 'Almacén', 'Tienda', 'Oficina', 'Personalizado']);
    });

    it('envía el cuerpo del ejemplo real con la ubicación como punto [lon, lat]', () => {
      fillBase();
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();

      const req = http.expectOne((r) => r.method === 'POST' && r.url === '/gateway/places');
      expectSameContract(req, fx(create));
      respondWith(req, fx(create));
    });

    it('con dirección, teléfono y contacto los envía', () => {
      fillBase();
      type('address', 'Calle 1 # 2-3');
      type('phoneNumber', '+57 300 123 4567');
      type('contactName', 'Ana');
      submit();
      const req = http.expectOne((r) => r.method === 'POST');
      expect(req.request.body).toEqual(jasmine.objectContaining({ address: 'Calle 1 # 2-3', phoneNumber: '+57 300 123 4567', contactName: 'Ana' }));
      req.flush({});
    });

    for (const phone of ['abc12345', '123456', '1'.repeat(21), '12345678x']) {
      it(`el teléfono «${phone}» se rechaza sin enviar nada`, () => {
        fillBase();
        type('phoneNumber', phone);
        submit();
        http.expectNone((r) => r.method === 'POST');
        expect(root().textContent).toContain('Escribe un teléfono válido');
      });
    }

    it('la dirección no calcula ninguna ubicación', () => {
      type('address', 'Carrera 7 # 71-21, Bogotá');
      expect(latLngInput('Latitud').value).toBe('');
      expect(latLngInput('Longitud').value).toBe('');
    });

    it('sin ubicación no se envía aunque el resto sea válido', () => {
      type('name', 'Sin punto');
      form().controls['type'].setValue('depot');
      submit();
      http.expectNone((r) => r.method === 'POST');
    });

    it('con cambios sin guardar avisa al salir', () => {
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
      form().markAsDirty();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
    });
  });

  describe('edición', () => {
    const record = fx(get).response.body as { id: string; name: string; location: { coordinates: [number, number] } };

    it('rellena el formulario y coloca el marcador en la ubicación del lugar', async () => {
      setup(record.id);
      http.expectOne(`/gateway/places/${record.id}`).flush({ ...record, zoneId: 'z1' });
      fixture.detectChanges();

      expect(input('name').value).toBe(record.name);
      expect(latLngInput('Latitud').value).toBe(String(record.location.coordinates[1]));
      const map = fixture.debugElement.query((d) => d.componentInstance instanceof MapViewComponent).componentInstance as MapViewComponent;
      for (let i = 0; i < 100 && !map.olMap(); i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(map.olMap()).not.toBeNull();
    });

    it('al guardar reenvía zoneId para no borrarlo', () => {
      setup(record.id);
      http.expectOne(`/gateway/places/${record.id}`).flush({ ...record, zoneId: 'z1' });
      fixture.detectChanges();
      type('name', 'Renombrado');
      submit();

      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.name).toBe('Renombrado');
      expect(req.request.body.zoneId).toBe('z1');
      expect(req.request.body.location).toEqual(record.location);
      req.flush(record);
    });

    it('con un id inexistente (404) enlaza al listado', () => {
      setup('x');
      http.expectOne('/gateway/places/x').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root().textContent).toContain('El registro ya no existe');
      expect(root().querySelector('a[href="/lugares"]')).not.toBeNull();
    });
  });

});

// Fuera del describe anterior: su `afterEach` verifica peticiones HTTP que esta prueba no usa
describe('PHONE_PATTERN', () => {
  it('acepta formatos habituales', () => {
    for (const ok of ['3001234567', '+57 300 123 4567', '(601) 555-1234', '+573001234567']) {
      expect(PHONE_PATTERN.test(ok)).withContext(ok).toBeTrue();
    }
  });
});
