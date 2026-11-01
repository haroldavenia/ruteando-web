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
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}), queryParamMap: convertToParamMap({}) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DriverFormComponent);
    fixture.detectChanges();
    // El catálogo de dominios maestros (tipos de documento) se pide al abrir; sin respuesta se usan los valores por defecto
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush([]));
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

    /** La contraseña inicial es el primer campo `new-password` y su repetición, el segundo. */
    function typePassword(index: number, value: string): void {
      const el = root().querySelectorAll<HTMLInputElement>('input[autocomplete="new-password"]')[index];
      el.value = value;
      el.dispatchEvent(new Event('input'));
    }

    function fillValid(): void {
      type('[formcontrolname="firstName"]', body.firstName);
      type('[formcontrolname="lastName"]', body.lastName);
      type('[formcontrolname="email"]', body.email);
      typePassword(0, body.password);
      typePassword(1, body.password);
    }

    it('las contraseñas distintas no se envían y se señalan en la repetición', () => {
      fillValid();
      typePassword(1, body.password + 'x');
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Las contraseñas no coinciden');
    });

    it('sin repetir la contraseña no se envía', () => {
      fillValid();
      typePassword(1, '');
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Repite la contraseña inicial');
    });

    it('con tipo y número de documento los envía junto con el resto', () => {
      fillValid();
      fixture.componentInstance['form'].controls.identifierType.setValue('citizen_id');
      type('[formcontrolname="identifierValue"]', ' 1020304050 ');
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();
      const req = http.expectOne((r) => r.method === 'POST');
      expect(req.request.body.identifierType).toBe('citizen_id');
      expect(req.request.body.identifierValue).toBe('1020304050');
      req.flush(fx.response.body as object);
    });

    it('sin documento no envía las claves del documento', () => {
      fillValid();
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();
      const req = http.expectOne((r) => r.method === 'POST');
      expect('identifierType' in req.request.body || 'identifierValue' in req.request.body).toBeFalse();
      req.flush(fx.response.body as object);
    });

    it('un número sin tipo, o un tipo sin número, no se envía y se señala qué falta', () => {
      fillValid();
      type('[formcontrolname="identifierValue"]', '1020');
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Elige el tipo de documento');

      fixture.componentInstance['form'].controls.identifierType.setValue('itin');
      type('[formcontrolname="identifierValue"]', '');
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Escribe el número del documento');
    });

    it('ofrece los tipos de documento conocidos con su etiqueta en español', () => {
      expect(fixture.componentInstance['documentTypes']()).toEqual([
        { key: 'citizen_id', label: 'Documento de identidad' },
        { key: 'itin', label: 'Identificación fiscal' },
        { key: 'plate', label: 'Placa' },
        { key: 'code', label: 'Código interno' },
      ]);
    });

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

    it('muestra el documento guardado y, sin tocarlo, lo reenvía al guardar', () => {
      setup(user.id);
      http.expectOne(`/gateway/users/${user.id}`).flush({ ...user, identifierType: 'citizen_id', identifierValue: '1020304050' });
      fixture.detectChanges();

      expect(field('[formcontrolname="identifierValue"]')!.value).toBe('1020304050');
      type('[formcontrolname="firstName"]', 'Renombrado');
      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.identifierType).toBe('citizen_id');
      expect(req.request.body.identifierValue).toBe('1020304050');
      req.flush(user);
    });

    it('un tipo de documento que el dominio maestro no tiene se conserva y se ofrece', () => {
      setup(user.id);
      http.expectOne(`/gateway/users/${user.id}`).flush({ ...user, identifierType: 'passport', identifierValue: 'P123' });
      fixture.detectChanges();

      expect(fixture.componentInstance['documentTypes']().map((t: { key: string }) => t.key)).toContain('passport');
      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.identifierType).toBe('passport');
      req.flush(user);
    });

    it('vaciar el documento lo borra (null) en lugar de dejarlo', () => {
      setup(user.id);
      http.expectOne(`/gateway/users/${user.id}`).flush({ ...user, identifierType: 'citizen_id', identifierValue: '1020' });
      fixture.detectChanges();

      fixture.componentInstance['form'].controls.identifierType.setValue('');
      type('[formcontrolname="identifierValue"]', '');
      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.identifierType).toBeNull();
      expect(req.request.body.identifierValue).toBeNull();
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
