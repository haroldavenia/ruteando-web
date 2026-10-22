import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { Fixture, expectSameContract, respondWith } from '../../../../testing/api-testing';
import { API_BASE_URL } from '../../../core/api/api-config';
import { errorInterceptor } from '../../../core/api/error.interceptor';

import { DriverFormComponent } from './driver-form.component';

import create from '../../../../testing/fixtures/gateway/post__users.json';
import get from '../../../../testing/fixtures/gateway/get__users__id.json';

describe('DriverFormComponent', () => {
  let fixture: ComponentFixture<DriverFormComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const field = (selector: string) => root().querySelector(selector) as HTMLInputElement | null;

  function setup(id: string | null): void {
    TestBed.configureTestingModule({
      imports: [DriverFormComponent],
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
    fixture = TestBed.createComponent(DriverFormComponent);
    fixture.detectChanges();
  }

  function type(selector: string, value: string): void {
    const el = field(selector)!;
    el.value = value;
    el.dispatchEvent(new Event('input'));
  }

  const submit = () => {
    (root().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  afterEach(() => http.verify());

  describe('alta', () => {
    const fx = create as unknown as Fixture;
    const body = fx.request.body as { email: string; password: string; firstName: string; lastName: string };

    beforeEach(() => setup(null));

    function fillValid(): void {
      type('[formcontrolname="firstName"]', body.firstName);
      type('[formcontrolname="lastName"]', body.lastName);
      type('[formcontrolname="email"]', body.email);
      type('input[autocomplete="new-password"]', body.password);
    }

    it('con datos válidos envía role "driver" y el cuerpo del ejemplo real', () => {
      fillValid();
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();

      const req = http.expectOne((r) => r.method === 'POST' && r.url === '/gateway/users');
      expectSameContract(req, { ...fx, request: { ...fx.request, body: { ...body, phone: null } } });
      expect(req.request.body.role).toBe('driver');
      respondWith(req, fx);
    });

    it('sin datos no envía nada y muestra los errores', () => {
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Este campo es obligatorio');
      expect(root().textContent).toContain('Introduce una contraseña inicial');
    });

    it('una contraseña corta no se envía', () => {
      fillValid();
      type('input[autocomplete="new-password"]', '123');
      submit();
      http.expectNone((r) => r.method === 'POST');
    });

    it('un correo ya usado (409) muestra "Ya existe una cuenta con ese correo" y conserva los datos', () => {
      fillValid();
      submit();
      http.expectOne((r) => r.method === 'POST').flush({ message: 'dup' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      expect(root().querySelector('[role="alert"]')?.textContent).toContain('Ya existe una cuenta con ese correo');
      expect(field('[formcontrolname="email"]')!.value).toBe(body.email);
      expect(root().querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBeFalse();
    });
  });

  describe('edición', () => {
    const user = (get as unknown as Fixture).response.body as { id: string; email: string; firstName: string };

    it('no muestra ni envía la contraseña', () => {
      setup(user.id);
      http.expectOne(`/gateway/users/${user.id}`).flush(user);
      fixture.detectChanges();

      expect(field('input[autocomplete="new-password"]')).toBeNull();
      expect(field('[formcontrolname="firstName"]')!.value).toBe(user.firstName);
      type('[formcontrolname="firstName"]', 'Renombrado');
      submit();

      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.firstName).toBe('Renombrado');
      expect('password' in req.request.body).toBeFalse();
      req.flush(user);
    });

    it('con un id inexistente (404) enlaza al listado', () => {
      setup('x');
      http.expectOne('/gateway/users/x').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root().textContent).toContain('El registro ya no existe');
      expect(root().querySelector('a[href="/flota/conductores"]')).not.toBeNull();
    });
  });
});
