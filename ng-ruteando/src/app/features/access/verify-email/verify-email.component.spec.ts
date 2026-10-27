import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, PLATFORM_ID } from '@angular/core';
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
import { VerifyEmailComponent } from './verify-email.component';

import verifyFx from '../../../../testing/fixtures/gateway/post__auth__verify-email.json';
import resendFx from '../../../../testing/fixtures/gateway/post__auth__resend-verification.json';

@Component({ template: 'inicio' })
class InicioComponent {}

const fx = (f: unknown) => f as unknown as Fixture;
const VERIFY = '/gateway/auth/verify-email';
const RESEND = '/gateway/auth/resend-verification';
const wait = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

describe('VerifyEmailComponent', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let controller: HttpTestingController;
  let snackOpen: jasmine.Spy;
  let navigateSpy: jasmine.Spy;
  let root: HTMLElement;

  async function setup(platform: 'browser' | 'server' = 'browser'): Promise<void> {
    localStorage.clear();
    snackOpen = jasmine.createSpy('open');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'acceso/verificar-email', component: VerifyEmailComponent },
          { path: 'acceso', component: InicioComponent },
          { path: '', pathMatch: 'full', component: InicioComponent },
        ]),
        provideNoopAnimations(),
        { provide: PLATFORM_ID, useValue: platform },
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
  }

  async function open(url: string): Promise<void> {
    await harness.navigateByUrl(url);
    harness.detectChanges();
    await wait();
    harness.detectChanges();
    root = harness.routeNativeElement as HTMLElement;
  }

  afterEach(() => {
    localStorage.clear();
    controller.verify();
  });

  describe('con un token válido', () => {
    beforeEach(async () => {
      await setup();
      await harness.navigateByUrl('/acceso/verificar-email?token=TOKEN-1');
      harness.detectChanges();
      await wait();
    });

    it('envía el token una sola vez, inicia sesión, avisa y lleva a la página de inicio', async () => {
      const requests = controller.match(VERIFY);
      expect(requests.length).toBe(1);
      expect(requests[0].request.body).toEqual({ token: 'TOKEN-1' });
      respondWith(requests[0], fx(verifyFx));
      await wait();
      harness.detectChanges();

      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeTrue();
      expect(router.url).toBe('/');
      expect(snackOpen).toHaveBeenCalledOnceWith('Correo verificado', 'Cerrar', { duration: 6000 });
    });

    it('retira el token de la URL sin añadir una entrada al historial', () => {
      expect(navigateSpy).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({ queryParams: { token: null }, replaceUrl: true }),
      );
      controller.expectOne(VERIFY).flush(verifyFx.response.body);
    });

    it('mientras espera muestra el estado de verificación y no repite la llamada al re-renderizar', () => {
      harness.detectChanges();
      harness.detectChanges();

      expect(document.body.textContent).toContain('Verificando tu correo');
      expect(controller.match(VERIFY).length).toBe(1);
    });
  });

  describe('con un token rechazado', () => {
    beforeEach(async () => {
      await setup();
      await harness.navigateByUrl('/acceso/verificar-email?token=MALO');
      harness.detectChanges();
      await wait();
      controller.expectOne(VERIFY).flush({ error: 'BAD_REQUEST' }, { status: 400, statusText: 'x' });
      harness.detectChanges();
      root = harness.routeNativeElement as HTMLElement;
    });

    it('muestra el mensaje de enlace no válido, el formulario de reenvío y el enlace a iniciar sesión', () => {
      expect(root.querySelector('[role="alert"]')?.textContent).toContain('El enlace no es válido o ha caducado');
      expect(root.querySelector('input[type="email"]')).not.toBeNull();
      expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('/acceso');
      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeFalse();
      expect(router.url).toBe('/acceso/verificar-email');
    });

    it('permite reenviar la verificación y muestra el mensaje neutro', () => {
      const input = root.querySelector('input[type="email"]') as HTMLInputElement;
      input.value = 'ana@example.invalid';
      input.dispatchEvent(new Event('input'));
      root.querySelector('form')!.dispatchEvent(new Event('submit'));

      const req = controller.expectOne(RESEND);
      expect(req.request.body).toEqual({ email: 'ana@example.invalid' });
      respondWith(req, fx(resendFx));
      harness.detectChanges();

      expect(root.querySelector('[role="status"]')?.textContent).toContain('Si el correo existe, recibirás instrucciones de verificación');
    });

    it('con el correo vacío no envía el reenvío', () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit'));
      harness.detectChanges();

      controller.expectNone(RESEND);
      expect(root.querySelector('mat-error')?.textContent).toContain('Introduce tu correo');
    });
  });

  it('sin token muestra el mensaje de enlace no válido sin llamar al gateway', async () => {
    await setup();
    await open('/acceso/verificar-email');

    controller.expectNone(VERIFY);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('El enlace no es válido o ha caducado');
  });

  it('con un fallo del servidor muestra el mensaje genérico y deja reintentar', async () => {
    await setup();
    await harness.navigateByUrl('/acceso/verificar-email?token=T');
    harness.detectChanges();
    await wait();
    controller.expectOne(VERIFY).flush(null, { status: 503, statusText: 'x' });
    harness.detectChanges();

    expect((harness.routeNativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('El servicio no está disponible');
  });

  it('en el servidor (SSR) no consume el token: no llama al gateway', async () => {
    await setup('server');
    await harness.navigateByUrl('/acceso/verificar-email?token=TOKEN-1');
    harness.detectChanges();
    await wait();

    controller.expectNone(VERIFY);
  });
});
