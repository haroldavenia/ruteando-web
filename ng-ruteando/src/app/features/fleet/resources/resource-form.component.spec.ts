import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { Fixture, respondWith } from '../../../../testing/api-testing';
import { API_BASE_URL } from '../../../core/api/api-config';
import { errorInterceptor } from '../../../core/api/error.interceptor';

import { ResourceFormComponent, SELECT_LIMIT } from './resource-form.component';
import { fromUtcIso } from './shift-time';

import places from '../../../../testing/fixtures/gateway/get__places.json';
import types from '../../../../testing/fixtures/gateway/get__resource-types.json';
import create from '../../../../testing/fixtures/gateway/post__resources.json';
import get from '../../../../testing/fixtures/gateway/get__resources__id.json';

const fx = (f: unknown) => f as Fixture;

describe('ResourceFormComponent', () => {
  let fixture: ComponentFixture<ResourceFormComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const control = (name: string) => (fixture.componentInstance as unknown as { form: { controls: Record<string, { setValue(v: unknown): void; value: unknown }> } }).form.controls[name];

  function setup(id: string | null, load: { types?: unknown; places?: unknown } = {}): void {
    TestBed.configureTestingModule({
      imports: [ResourceFormComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ResourceFormComponent);
    fixture.detectChanges();
    const typesReq = http.expectOne((r) => r.url === '/gateway/resource-types');
    const placesReq = http.expectOne((r) => r.url === '/gateway/places');
    expect(typesReq.request.params.get('size')).toBe(String(SELECT_LIMIT));
    expect(placesReq.request.params.get('size')).toBe(String(SELECT_LIMIT));
    respondWith(typesReq, (load.types ?? types) as Fixture);
    respondWith(placesReq, (load.places ?? places) as Fixture);
    fixture.detectChanges();
  }

  const submit = () => {
    (root().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  function fillValid(): void {
    const body = fx(create).request.body as { name: string; resourceTypeId: string; depotId: string };
    control('name').setValue(body.name);
    control('resourceTypeId').setValue(body.resourceTypeId);
    control('depotId').setValue(body.depotId);
    control('shiftStart').setValue(fromUtcIso('2026-10-11T13:00:00Z'));
    control('shiftDurationMin').setValue(480);
    control('breakDurationMin').setValue(60);
    control('quantity').setValue(1);
  }

  afterEach(() => http.verify());

  describe('alta', () => {
    it('pide los tipos y los lugares con un tamaño acotado', () => {
      setup(null); // setup comprueba que ambas peticiones llevan size=200
      expect(root().querySelectorAll('mat-select').length).toBe(2);
    });

    it('envía el cuerpo del ejemplo real con el turno en UTC y las duraciones en segundos', () => {
      setup(null);
      fillValid();
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();

      const req: TestRequest = http.expectOne((r) => r.method === 'POST' && r.url === '/gateway/resources');
      const expected = fx(create).request.body as Record<string, unknown>;
      const { shiftStartUtc, ...rest } = req.request.body;
      const expectedRest = { ...expected };
      delete expectedRest['shiftStartUtc'];
      expect(rest).toEqual(expectedRest);
      expect(shiftStartUtc).toMatch(/T\d\d:\d\d:00Z$/);
      expect(fromUtcIso(shiftStartUtc)).toBe(fromUtcIso('2026-10-11T13:00:00Z'));
      respondWith(req, fx(create));
    });

    it('con la matrícula y una cantidad distinta de 1 las envía', () => {
      setup(null);
      fillValid();
      (root().querySelector('[formcontrolname="licensePlate"]') as HTMLInputElement).value = 'ABC123';
      (root().querySelector('[formcontrolname="licensePlate"]') as HTMLInputElement).dispatchEvent(new Event('input'));
      control('quantity').setValue(3);
      submit();
      const req = http.expectOne((r) => r.method === 'POST');
      expect(req.request.body.licensePlate).toBe('ABC123');
      expect(req.request.body.quantity).toBe(3);
      req.flush({});
    });

    it('rechaza duraciones negativas, cantidad menor que 1 y turnos de más de 24 h sin enviar nada', () => {
      setup(null);
      fillValid();

      control('breakDurationMin').setValue(-5);
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('El descanso no puede ser negativo');

      control('breakDurationMin').setValue(60);
      control('quantity').setValue(0);
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('La cantidad debe ser al menos 1');

      control('quantity').setValue(1);
      control('shiftDurationMin').setValue(1441);
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('no puede durar más de 24 horas');

      control('shiftDurationMin').setValue(-1);
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('La duración debe ser mayor que 0');
    });

    it('con una matrícula duplicada (409) muestra el mensaje y conserva lo escrito', () => {
      setup(null);
      fillValid();
      submit();
      http.expectOne((r) => r.method === 'POST').flush({ message: 'dup' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      expect(root().querySelector('[role="alert"]')?.textContent).toContain('Ya existe un vehículo con esa matrícula');
      expect(control('name').value).toBe((fx(create).request.body as { name: string }).name);
    });

    it('sin tipos explica que hay que crear uno y enlaza a /flota/tipos', () => {
      setup(null, { types: { response: { status: 200, body: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 200 } } } });
      expect(root().textContent).toContain('Todavía no hay tipos de vehículo');
      expect(root().querySelector('a[href="/flota/tipos"]')).not.toBeNull();
    });

    it('avisa cuando la lista de tipos está truncada', () => {
      const body = { ...(fx(types).response.body as object), totalElements: 450 };
      setup(null, { types: { response: { status: 200, body } } });
      expect(root().textContent).toContain('Se muestran solo los primeros 200 tipos');
    });
  });

  describe('edición', () => {
    it('carga el vehículo y muestra el turno en hora local', () => {
      const record = fx(get).response.body as { id: string; shiftStartUtc: string; shiftDurationSec: number };
      setup(record.id);
      http.expectOne(`/gateway/resources/${record.id}`).flush(record);
      fixture.detectChanges();

      expect(control('shiftStart').value).toBe(fromUtcIso(record.shiftStartUtc));
      expect(control('shiftDurationMin').value).toBe(record.shiftDurationSec / 60);
    });

    it('con un id inexistente (404) enlaza al listado', () => {
      setup('x');
      http.expectOne('/gateway/resources/x').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root().textContent).toContain('El registro ya no existe');
      expect(root().querySelector('a[href="/flota/vehiculos"]')).not.toBeNull();
    });
  });
});
