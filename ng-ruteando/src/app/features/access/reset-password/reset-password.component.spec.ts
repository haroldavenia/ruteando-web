import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { Fixture, respondWith } from '../../../../testing/api-testing';
import { API_BASE_URL } from '../../../core/api/api-config';
import { authInterceptor } from '../../../core/api/auth.interceptor';
import { errorInterceptor } from '../../../core/api/error.interceptor';
import { refreshInterceptor } from '../../../core/api/refresh.interceptor';
import { CurrentUser } from '../../../core/auth/current-user';
import { ResetPasswordComponent } from './reset-password.component';

import resetFx from '../../../../testing/fixtures/gateway/post__auth__reset-password.json';
import invalidTokenFx from '../../../../testing/fixtures/gateway-errors/post__auth__reset-password__invalid-token.json';
import policyFx from '../../../../testing/fixtures/gateway-errors/post__auth__register__password-policy-violation.json';
import validationFx from '../../../../testing/fixtures/gateway-errors/post__auth__login__validation-error.json';

@Component({ template: 'acceso' })
class AccesoComponent {}

const fx = (f: unknown) => f as unknown as Fixture;
const RESET = '/gateway/auth/reset-password';
const VALID_PASSWORD = 'Nueva@2026claveabc';
const wait = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

describe('ResetPasswordComponent', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let controller: HttpTestingController;
  let snackOpen: jasmine.Spy;
  let navigateSpy: jasmine.Spy;
  let root: HTMLElement;

  const inputs = () => Array.from(root.querySelectorAll('input')) as HTMLInputElement[];
  const submit = () => root.querySelector('form')!.dispatchEvent(new Event('submit'));
  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function open(url: string): Promise<void> {
    snackOpen = jasmine.createSpy('open');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'acceso/restablecer', component: ResetPasswordComponent },
          { path: 'acceso/recuperar', component: AccesoComponent },
          { path: 'acceso', component: AccesoComponent },
        ]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: MatSnackBar, useValue: { open: snackOpen } },
        provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    router = TestBed.inject(Router);
    controller = TestBed.inject(HttpTestingController);
    navigateSpy = spyOn(router, 'navigate').and.callThrough();
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    harness.detectChanges();
    await wait();
    harness.detectChanges();
    root = harness.routeNativeElement as HTMLElement;
  }

  afterEach(() => controller.verify());

  describe('con un token', () => {
    beforeEach(() => open('/acceso/restablecer?token=TOKEN-9'));

    it('cambia la contraseña con el token en el cuerpo, lleva a /acceso con el aviso y no inicia sesión', async () => {
      type(inputs()[0], VALID_PASSWORD);
      type(inputs()[1], VALID_PASSWORD);
      submit();

      const req = controller.expectOne(RESET);
      expect(req.request.body).toEqual({ token: 'TOKEN-9', newPassword: VALID_PASSWORD });
      respondWith(req, fx(resetFx));
      await wait();

      expect(router.url).toBe('/acceso');
      expect(snackOpen).toHaveBeenCalledOnceWith('Contraseña actualizada, ya puedes iniciar sesión', 'Cerrar', { duration: 6000 });
      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeFalse();
    });

    it('retira el token de la URL sin añadir una entrada al historial', () => {
      expect(navigateSpy).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { token: null }, replaceUrl: true }));
      expect(router.url).toBe('/acceso/restablecer');
    });

    it('sigue pudiendo enviar con el token guardado en memoria tras quitarlo de la URL', async () => {
      type(inputs()[0], VALID_PASSWORD);
      type(inputs()[1], VALID_PASSWORD);
      submit();

      expect(controller.expectOne(RESET).request.body.token).toBe('TOKEN-9');
    });

    it('con contraseñas distintas, demasiado cortas o sin los tipos de carácter exigidos no envía y muestra el error del campo', () => {
      type(inputs()[0], VALID_PASSWORD);
      type(inputs()[1], 'otra-distinta');
      submit();
      harness.detectChanges();
      expect(root.querySelector('mat-error')?.textContent).toContain('Las contraseñas no coinciden');

      type(inputs()[0], 'corta');
      type(inputs()[1], 'corta');
      submit();
      harness.detectChanges();
      expect(root.querySelector('mat-error')?.textContent).toContain('La contraseña no cumple los requisitos');
      expect(Array.from(root.querySelectorAll('ul.requirements li.failed')).map((li) => li.querySelector('span')?.textContent)).toEqual(['Al menos 16 caracteres', 'Una mayúscula', 'Un número', 'Un símbolo (@$!%*?&)']);

      type(inputs()[0], 'abcdefghijklmnop1234');
      type(inputs()[1], 'abcdefghijklmnop1234');
      submit();
      harness.detectChanges();
      expect(root.querySelector('mat-error')?.textContent).toContain('La contraseña no cumple los requisitos');
      expect(Array.from(root.querySelectorAll('ul.requirements li.failed')).map((li) => li.querySelector('span')?.textContent)).toEqual(['Una mayúscula', 'Un símbolo (@$!%*?&)']);
      controller.expectNone(RESET);
    });

    it('la lista de requisitos está cerrada hasta enfocar la contraseña nueva, que es la única que la lleva', () => {
      const list = root.querySelectorAll('ul.requirements');
      expect(list.length).toBe(1);
      expect(list[0].classList).toContain('visually-hidden');
      expect(inputs()[0].getAttribute('aria-describedby')).toContain(list[0].id);

      inputs()[0].dispatchEvent(new Event('focus'));
      harness.detectChanges();
      expect(list[0].classList).not.toContain('visually-hidden');
      expect(list[0].querySelectorAll('li').length).toBe(5);
    });

    it('con INVALID_TOKEN muestra el enlace no válido y el enlace para solicitar otro', () => {
      type(inputs()[0], VALID_PASSWORD);
      type(inputs()[1], VALID_PASSWORD);
      submit();
      controller.expectOne(RESET).flush(fx(invalidTokenFx).response.body as object, { status: 400, statusText: 'x' });
      harness.detectChanges();

      expect(root.querySelector('[role="alert"]')?.textContent).toContain('El enlace no es válido o ha caducado');
      expect(root.querySelector('form')).toBeNull();
      expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('/acceso/recuperar');
    });

    it('con PASSWORD_POLICY_VIOLATION mantiene el formulario y el enlace, muestra la regla, vacía las contraseñas, enfoca la nueva y permite reintentar con el mismo token', async () => {
      type(inputs()[0], VALID_PASSWORD);
      type(inputs()[1], VALID_PASSWORD);
      submit();
      controller.expectOne(RESET).flush(fx(policyFx).response.body as object, { status: 400, statusText: 'x' });
      harness.detectChanges();
      await wait();

      const alert = root.querySelector('[role="alert"]')?.textContent ?? '';
      expect(alert).toContain('La contraseña no cumple la política');
      expect(alert).toContain('Mínimo 16 caracteres');
      expect(alert).not.toContain('El enlace no es válido');
      expect(root.querySelector('form')).not.toBeNull();
      expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('/acceso/recuperar');
      expect(inputs().map((i) => i.value)).toEqual(['', '']);
      expect(document.activeElement).toBe(inputs()[0]);

      type(inputs()[0], 'Otra@2026claveabcd');
      type(inputs()[1], 'Otra@2026claveabcd');
      submit();
      expect(controller.expectOne(RESET).request.body).toEqual({ token: 'TOKEN-9', newPassword: 'Otra@2026claveabcd' });
    });

    it('con VALIDATION_ERROR mantiene el formulario y dice "Revisa los datos e inténtalo de nuevo"', () => {
      type(inputs()[0], VALID_PASSWORD);
      type(inputs()[1], VALID_PASSWORD);
      submit();
      controller.expectOne(RESET).flush(fx(validationFx).response.body as object, { status: 400, statusText: 'x' });
      harness.detectChanges();

      expect(root.querySelector('[role="alert"]')?.textContent).toContain('Revisa los datos e inténtalo de nuevo');
      expect(root.querySelector('form')).not.toBeNull();
    });

    it('con el token rechazado muestra el mensaje y un enlace para solicitar otro', () => {
      type(inputs()[0], VALID_PASSWORD);
      type(inputs()[1], VALID_PASSWORD);
      submit();
      controller.expectOne(RESET).flush({ error: 'BAD_REQUEST' }, { status: 400, statusText: 'x' });
      harness.detectChanges();

      expect(root.querySelector('[role="alert"]')?.textContent).toContain('El enlace no es válido o ha caducado');
      expect(root.querySelector('form')).toBeNull();
      expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('/acceso/recuperar');
    });

    it('con un fallo del servidor muestra el mensaje genérico, vacía las contraseñas y permite reintentar', () => {
      type(inputs()[0], VALID_PASSWORD);
      type(inputs()[1], VALID_PASSWORD);
      submit();
      controller.expectOne(RESET).flush(null, { status: 503, statusText: 'x' });
      harness.detectChanges();

      expect(root.querySelector('[role="alert"]')?.textContent).toContain('El servicio no está disponible');
      expect(inputs()[0].value).toBe('');
      expect(root.querySelector('form')).not.toBeNull();
    });

    it('declara las contraseñas como nuevas para los gestores de contraseñas', () => {
      expect(inputs().map((i) => i.getAttribute('autocomplete'))).toEqual(['new-password', 'new-password']);
    });
  });

  it('sin token muestra el mensaje de enlace no válido y el enlace para solicitar otro, sin formulario', async () => {
    await open('/acceso/restablecer');

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('El enlace no es válido o ha caducado');
    expect(root.querySelector('form')).toBeNull();
    expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('/acceso/recuperar');
    controller.expectNone(RESET);
  });
});
