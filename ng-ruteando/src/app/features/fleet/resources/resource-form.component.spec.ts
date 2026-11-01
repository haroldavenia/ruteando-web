import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Navigation, Router, convertToParamMap, provideRouter } from '@angular/router';

import { Fixture, respondWith } from '../../../../testing/api-testing';
import { API_BASE_URL } from '../../../core/api/api-config';
import { errorInterceptor } from '../../../core/api/error.interceptor';

import { toHandoffState } from '../type-handoff';

import { ResourceFormComponent, SELECT_LIMIT } from './resource-form.component';
import { fromUtcIso } from '../../../shared/time/shift-time';

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

  function setup(id: string | null, load: { types?: unknown; places?: unknown; state?: unknown } = {}): void {
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
    if (load.state) {
      spyOn(TestBed.inject(Router), 'currentNavigation').and.returnValue({ extras: { state: load.state } } as unknown as Navigation);
    }
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

    it('sin lugares explica que hace falta un depósito y enlaza a /lugares/nuevo', () => {
      setup(null, { places: { response: { status: 200, body: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 200 } } } });
      expect(root().textContent).toContain('Todavía no hay lugares que usar como depósito');
      expect(root().querySelector('a[href="/lugares/nuevo"]')).not.toBeNull();
    });

    it('con lugares no muestra el enlace', () => {
      setup(null);
      expect(root().querySelector('a[href="/lugares/nuevo"]')).toBeNull();
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
    it('al guardar reenvía los tipos de paquete y las zonas permitidas que el formulario no toca', () => {
      const record = { ...(fx(get).response.body as { id: string }), allowedPackageTypes: ['delivery'], allowedZoneIds: ['zona-1', 'zona-2'] };
      setup(record.id);
      http.expectOne(`/gateway/resources/${record.id}`).flush(record);
      fixture.detectChanges();

      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.allowedPackageTypes).toEqual(['delivery']);
      expect(req.request.body.allowedZoneIds).toEqual(['zona-1', 'zona-2']);
      req.flush(record);
    });

    it('si el vehículo no tiene restricciones envía null, no las omite', () => {
      const record = fx(get).response.body as { id: string };
      setup(record.id);
      http.expectOne(`/gateway/resources/${record.id}`).flush({ ...record, allowedPackageTypes: null, allowedZoneIds: null });
      fixture.detectChanges();

      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.allowedPackageTypes).toBeNull();
      expect(req.request.body.allowedZoneIds).toBeNull();
      req.flush(record);
    });
  });

  describe('crear un tipo desde el formulario', () => {
    const draft = {
      name: 'Furgón de prueba',
      licensePlate: 'XYZ-987',
      resourceTypeId: '',
      depotId: 'deposito-1',
      shiftStart: '07:30',
      shiftDurationMin: 420,
      breakDurationMin: 45,
      quantity: 2,
      anchorDate: '2026-10-31',
    };

    it('el botón lleva al alta de tipo con lo escrito y sin preguntar por cambios sin guardar', () => {
      setup(null);
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      control('name').setValue('Furgón de prueba');
      (fixture.componentInstance as unknown as { form: { markAsDirty(): void } }).form.markAsDirty();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();

      (root().querySelector('.type-actions button') as HTMLButtonElement).click();

      const [commands, extras] = navigate.calls.mostRecent().args;
      expect(commands).toEqual(['/flota/tipos/nuevo']);
      expect(extras?.queryParams).toEqual({ volver: '/' });
      const handoff = (extras?.state as Record<string, { draft: { name: string; anchorDate: string } }>)['fleetTypeHandoff'];
      expect(handoff.draft.name).toBe('Furgón de prueba');
      expect(handoff.draft.anchorDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    });

    it('al volver recupera lo escrito y deja elegido el tipo recién creado', () => {
      setup(null, { state: toHandoffState({ draft, createdTypeId: 'tipo-nuevo' }) });
      expect(control('name').value).toBe('Furgón de prueba');
      expect(control('licensePlate').value).toBe('XYZ-987');
      expect(control('depotId').value).toBe('deposito-1');
      expect(control('shiftStart').value).toBe('07:30');
      expect(control('quantity').value).toBe(2);
      expect(control('resourceTypeId').value).toBe('tipo-nuevo');
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
    });

    it('al cancelar la creación del tipo recupera lo escrito sin elegir ningún tipo', () => {
      setup(null, { state: toHandoffState({ draft: { ...draft, resourceTypeId: 'otro-tipo' } }) });
      expect(control('name').value).toBe('Furgón de prueba');
      expect(control('resourceTypeId').value).toBe('otro-tipo');
    });

    it('un borrador que no tiene la forma esperada se ignora', () => {
      setup(null, { state: toHandoffState({ draft: { name: 5, evil: '<img src=x>' } }) });
      expect(control('name').value).toBe('');
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    });

    it('al editar, lo recuperado manda sobre el vehículo cargado', () => {
      const record = fx(get).response.body as { id: string };
      setup(record.id, { state: toHandoffState({ draft }) });
      http.expectOne(`/gateway/resources/${record.id}`).flush(record);
      fixture.detectChanges();
      expect(control('name').value).toBe('Furgón de prueba');
      expect(control('quantity').value).toBe(2);
    });
  });
});
