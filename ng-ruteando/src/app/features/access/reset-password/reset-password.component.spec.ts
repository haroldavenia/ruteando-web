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

@Component({ template: 'acceso' })
class AccesoComponent {}

const fx = (f: unknown) => f as unknown as Fixture;
const RESET = '/gateway/auth/reset-password';
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
      type(inputs()[0], 'una-clave-nueva');
      type(inputs()[1], 'una-clave-nueva');
      submit();

      const req = controller.expectOne(RESET);
      expect(req.request.body).toEqual({ token: 'TOKEN-9', newPassword: 'una-clave-nueva' });
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
      type(inputs()[0], 'una-clave-nueva');
      type(inputs()[1], 'una-clave-nueva');
      submit();

      expect(controller.expectOne(RESET).request.body.token).toBe('TOKEN-9');
    });

    it('con contraseñas distintas o demasiado cortas no envía y muestra el error del campo', () => {
      type(inputs()[0], 'una-clave-nueva');
      type(inputs()[1], 'otra-distinta');
      submit();
      harness.detectChanges();
      expect(root.querySelector('mat-error')?.textContent).toContain('Las contraseñas no coinciden');

      type(inputs()[0], 'corta');
      type(inputs()[1], 'corta');
      submit();
      harness.detectChanges();
      expect(root.querySelector('mat-error')?.textContent).toContain('Usa al menos 8 caracteres');
      controller.expectNone(RESET);
    });

    it('con el token rechazado muestra el mensaje y un enlace para solicitar otro', () => {
      type(inputs()[0], 'una-clave-nueva');
      type(inputs()[1], 'una-clave-nueva');
      submit();
      controller.expectOne(RESET).flush({ error: 'BAD_REQUEST' }, { status: 400, statusText: 'x' });
      harness.detectChanges();

      expect(root.querySelector('[role="alert"]')?.textContent).toContain('El enlace no es válido o ha caducado');
      expect(root.querySelector('form')).toBeNull();
      expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('/acceso/recuperar');
    });

    it('con un fallo del servidor muestra el mensaje genérico, vacía las contraseñas y permite reintentar', () => {
      type(inputs()[0], 'una-clave-nueva');
      type(inputs()[1], 'una-clave-nueva');
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
