import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { Fixture, expectSameContract, respondWith } from '../../../../testing/api-testing';
import { API_BASE_URL } from '../../../core/api/api-config';
import { errorInterceptor } from '../../../core/api/error.interceptor';

import { ResourceTypeFormComponent } from './resource-type-form.component';

import create from '../../../../testing/fixtures/gateway/post__resource-types.json';
import get from '../../../../testing/fixtures/gateway/get__resource-types__id.json';

describe('ResourceTypeFormComponent', () => {
  let fixture: ComponentFixture<ResourceTypeFormComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const input = (name: string) => root().querySelector(`[formcontrolname="${name}"]`) as HTMLInputElement;

  function setup(id: string | null): void {
    TestBed.configureTestingModule({
      imports: [ResourceTypeFormComponent],
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
      expect(navigate).toHaveBeenCalledWith('/flota/tipos');
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
});
