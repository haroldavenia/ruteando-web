import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Navigation, Router, convertToParamMap, provideRouter } from '@angular/router';

import { Fixture, expectSameContract, respondWith } from '../../../../testing/api-testing';
import { API_BASE_URL } from '../../../core/api/api-config';
import { errorInterceptor } from '../../../core/api/error.interceptor';

import { toHandoffState } from '../type-handoff';

import { ResourceTypeFormComponent } from './resource-type-form.component';

import create from '../../../../testing/fixtures/gateway/post__resource-types.json';
import get from '../../../../testing/fixtures/gateway/get__resource-types__id.json';

describe('ResourceTypeFormComponent', () => {
  let fixture: ComponentFixture<ResourceTypeFormComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const input = (name: string) => root().querySelector(`[formcontrolname="${name}"]`) as HTMLInputElement;

  function setup(id: string | null, options: { volver?: string; state?: unknown } = {}): void {
    TestBed.configureTestingModule({
      imports: [ResourceTypeFormComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}), queryParamMap: convertToParamMap(options.volver ? { volver: options.volver } : {}) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    if (options.state) {
      spyOn(TestBed.inject(Router), 'currentNavigation').and.returnValue({ extras: { state: options.state } } as unknown as Navigation);
    }
    fixture = TestBed.createComponent(ResourceTypeFormComponent);
    fixture.detectChanges();
    // El catálogo de dominios maestros se pide al abrir; sin respuesta se usan los valores por defecto
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush([]));
  }

  function type(name: string, value: string): void {
    const el = input(name);
    el.value = value;
    el.dispatchEvent(new Event('input'));
  }

  const submit = () => {
    (root().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  afterEach(() => http.verify());

  describe('alta', () => {
    beforeEach(() => setup(null));

    it('con campos obligatorios vacíos no envía nada y muestra los errores', () => {
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Este campo es obligatorio');
    });

    it('con datos válidos envía el cuerpo del ejemplo real y vuelve al listado', async () => {
      const fx = create as unknown as Fixture;
      const body = fx.request.body as { name: string; category: string; osrmProfile: string };
      type('name', body.name);
      type('category', body.category);
      fixture.componentInstance['form'].controls.osrmProfile.setValue(body.osrmProfile);
      const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();

      const req = http.expectOne((r) => r.method === 'POST' && r.url === '/gateway/resource-types');
      expectSameContract(req, fx);
      expect((fixture.nativeElement as HTMLElement).querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBeTrue();
      respondWith(req, fx);
      expect(navigate).toHaveBeenCalledWith('/flota/tipos', { state: undefined });
    });

    it('un consumo negativo no se envía', () => {
      type('name', 'A');
      type('category', 'van');
      fixture.componentInstance['form'].controls.osrmProfile.setValue('driving');
      type('gasMileage', '-1');
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Debe ser mayor o igual que 0');
    });

    it('con cambios sin guardar avisa al salir', () => {
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
      type('name', 'Nuevo');
      fixture.componentInstance['form'].markAsDirty();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
    });
  });

  describe('edición', () => {
    const record = (get as unknown as Fixture).response.body as { id: string };

    it('carga el registro, y al guardar reenvía capacity, measure y restriction sin cambios', () => {
      setup(record.id);
      const loaded = { ...record, capacity: { weight: 1000 }, measure: { length: 3 }, restriction: { hazmat: false } };
      http.expectOne(`/gateway/resource-types/${record.id}`).flush(loaded);
      fixture.detectChanges();

      type('name', 'Renombrado');
      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.name).toBe('Renombrado');
      expect(req.request.body.capacity).toEqual({ weight: 1000 });
      expect(req.request.body.measure).toEqual({ length: 3 });
      expect(req.request.body.restriction).toEqual({ hazmat: false });
      req.flush(loaded);
    });

    it('con un id inexistente (404) muestra que el registro ya no existe y enlaza al listado', () => {
      setup('no-existe');
      http.expectOne('/gateway/resource-types/no-existe').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      expect(root().textContent).toContain('El registro ya no existe');
      expect(root().querySelector('a[href="/flota/tipos"]')).not.toBeNull();
      expect(root().querySelector('form')).toBeNull();
    });
  });

  describe('capacidad y restricciones', () => {
    const form = () => fixture.componentInstance['form'];
    const fillBasics = (): void => {
      type('name', 'Furgoneta');
      type('category', 'van');
      form().controls.osrmProfile.setValue('driving');
    };
    const post = () => http.expectOne((r) => r.method === 'POST' && r.url === '/gateway/resource-types');

    beforeEach(() => setup(null));

    it('sin tocar la capacidad el alta no envía capacity, measure ni restriction', () => {
      fillBasics();
      submit();
      const body = post().request.body as Record<string, unknown>;
      expect('capacity' in body || 'measure' in body || 'restriction' in body).toBeFalse();
    });

    it('en volumen: envía el peso en kg y el volumen en cm³', () => {
      fillBasics();
      type('weight', '500');
      type('volume', '12000000');
      submit();
      const body = post().request.body as Record<string, unknown>;
      expect(body['capacity']).toEqual({ weight: 500, volume: 12_000_000 });
      expect('measure' in body).toBeFalse();
    });

    it('en medidas: calcula el volumen, lo muestra y lo envía junto con las medidas', () => {
      fillBasics();
      form().controls.mode.setValue('measure');
      form().controls.mode.markAsDirty();
      fixture.detectChanges();
      type('weight', '1200');
      type('width', '180');
      type('height', '170');
      type('depth', '260');
      fixture.detectChanges();
      expect(root().textContent).toContain('Volumen calculado: 7956000 cm³ · 7,96 m³');
      expect(input('volume')).toBeNull();
      submit();
      const body = post().request.body as Record<string, unknown>;
      expect(body['measure']).toEqual({ width: 180, height: 170, depth: 260 });
      expect(body['capacity']).toEqual({ weight: 1200, volume: 7_956_000 });
    });

    it('un peso sin volumen no se envía y pide el volumen', () => {
      fillBasics();
      type('weight', '10');
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Indica un volumen mayor que 0');
    });

    it('en medidas, una medida a 0 se señala', () => {
      fillBasics();
      form().controls.mode.setValue('measure');
      form().controls.mode.markAsDirty();
      fixture.detectChanges();
      type('weight', '10');
      type('width', '5');
      type('height', '0');
      type('depth', '5');
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Indica una medida mayor que 0');
    });

    it('un peso máximo mayor que el peso del vehículo no se envía', () => {
      fillBasics();
      type('weight', '500');
      type('volume', '1000');
      type('maxWeight', '600');
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('El peso máximo no puede superar el peso del vehículo');
    });

    it('un máximo menor que el mínimo se señala aunque se cambie el mínimo después', () => {
      fillBasics();
      type('weight', '500');
      type('volume', '1000');
      type('maxVolume', '400');
      type('minVolume', '900');
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('El máximo no puede ser menor que el mínimo');
    });

    it('las restricciones se envían en kg y cm³', () => {
      fillBasics();
      type('weight', '500');
      type('volume', '1000');
      type('minWeight', '20');
      type('maxWeight', '480');
      type('maxVolume', '900');
      submit();
      expect((post().request.body as Record<string, unknown>)['restriction']).toEqual({ minWeight: 20, maxWeight: 480, maxVolume: 900 });
    });
  });

  describe('edición de la capacidad', () => {
    const record = (get as unknown as Fixture).response.body as { id: string };
    const loaded = {
      ...record,
      capacity: { weight: 500, volume: 12_000_000, cooled: true },
      measure: null,
      restriction: { maxWeight: 480, note: 'x' },
    };

    function open(): void {
      setup(record.id);
      http.expectOne(`/gateway/resource-types/${record.id}`).flush(loaded);
      fixture.detectChanges();
    }

    it('muestra la capacidad guardada en kg y cm³', () => {
      open();
      expect(input('weight').value).toBe('500');
      expect(input('volume').value).toBe('12000000');
      expect(input('maxWeight').value).toBe('480');
    });

    it('al cambiar el peso conserva las claves que no conoce', () => {
      open();
      type('weight', '600');
      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.capacity).toEqual({ weight: 600, volume: 12_000_000, cooled: true });
      expect(req.request.body.restriction).toEqual({ maxWeight: 480, note: 'x' });
      req.flush(loaded);
    });

    it('vaciar el peso, el volumen y el máximo quita solo esas claves', () => {
      open();
      type('weight', '');
      type('volume', '');
      type('maxWeight', '');
      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.capacity).toEqual({ cooled: true });
      expect(req.request.body.restriction).toEqual({ note: 'x' });
      req.flush(loaded);
    });

    it('un tipo con capacidad en medidas se abre en modo medidas', () => {
      setup(record.id);
      http.expectOne(`/gateway/resource-types/${record.id}`).flush({ ...loaded, capacity: { weight: 1_000, volume: 24 }, measure: { width: 2, height: 3, depth: 4 } });
      fixture.detectChanges();
      expect(input('width').value).toBe('2');
      expect(input('volume')).toBeNull();
      expect(root().textContent).toContain('Volumen calculado: 24 cm³');
    });
  });

  describe('crear un tipo desde el formulario de vehículo', () => {
    const draft = { name: 'Furgón', anchorDate: '2026-10-31' };
    const fillAndSubmit = (): void => {
      type('name', 'A');
      type('category', 'van');
      fixture.componentInstance['form'].controls.osrmProfile.setValue('driving');
      submit();
    };

    it('sin destino de vuelta guarda y vuelve al listado de tipos', () => {
      setup(null);
      const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      fillAndSubmit();
      http.expectOne((r) => r.method === 'POST').flush({ id: 'nuevo-tipo' });
      expect(navigate).toHaveBeenCalledWith('/flota/tipos', { state: undefined });
    });

    it('con destino de vuelta y borrador, guarda y vuelve con el borrador y el tipo creado', () => {
      setup(null, { volver: '/flota/vehiculos/nuevo', state: toHandoffState({ draft }) });
      const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      fillAndSubmit();
      http.expectOne((r) => r.method === 'POST').flush({ id: 'nuevo-tipo' });
      expect(navigate).toHaveBeenCalledWith('/flota/vehiculos/nuevo', { state: toHandoffState({ draft, createdTypeId: 'nuevo-tipo' }) });
    });

    it('cancelar y la flecha de vuelta llevan al formulario de vehículo', () => {
      setup(null, { volver: '/flota/vehiculos/nuevo', state: toHandoffState({ draft }) });
      expect(root().querySelectorAll('a[href="/flota/vehiculos/nuevo"]').length).toBe(2);
      expect(root().textContent).toContain('Volver');
    });

    it('un destino que no es de la flota se ignora', () => {
      setup(null, { volver: '//otro.invalid/flota/x' });
      expect(root().querySelector('a[href*="otro.invalid"]')).toBeNull();
      expect(root().querySelector('a[href="/flota/tipos"]')).not.toBeNull();
    });
  });
});
