import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { makeSession } from '../../../../testing/session';
import { API_BASE_URL } from '../../../core/api/api-config';
import { authInterceptor } from '../../../core/api/auth.interceptor';
import { errorInterceptor } from '../../../core/api/error.interceptor';
import { refreshInterceptor } from '../../../core/api/refresh.interceptor';
import { CurrentUser } from '../../../core/auth/current-user';
import { LoginComponent } from './login.component';

@Component({ template: 'destino' })
class DestinoComponent {}

const LOGIN = '/gateway/auth/login';
const wait = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

describe('LoginComponent', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let controller: HttpTestingController;
  let root: HTMLElement;

  const email = () => root.querySelector('input[autocomplete="username"]') as HTMLInputElement;
  const password = () => root.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;
  const submitButton = () => root.querySelector('button[type="submit"]') as HTMLButtonElement;
  const alertText = () => root.querySelector('[role="alert"]')?.textContent?.trim() ?? '';

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
  const submit = () => root.querySelector('form')!.dispatchEvent(new Event('submit'));

  async function open(url = '/acceso'): Promise<void> {
    await harness.navigateByUrl(url);
    harness.detectChanges();
    root = harness.routeNativeElement as HTMLElement;
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'acceso', component: LoginComponent },
          { path: 'journeys', component: DestinoComponent },
          { path: '', pathMatch: 'full', component: DestinoComponent },
        ]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    router = TestBed.inject(Router);
    controller = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    localStorage.clear();
    controller.verify();
  });

  it('los campos están vacíos al abrir y declaran su finalidad para los gestores de contraseñas', async () => {
    await open();

    expect(email().value).toBe('');
    expect(password().value).toBe('');
    expect(email().getAttribute('autocomplete')).toBe('username');
    expect(password().getAttribute('autocomplete')).toBe('current-password');
    expect(email().type).toBe('email');
  });

  it('con campos vacíos no envía nada, muestra los errores y da el foco al correo', async () => {
    await open();
    submit();
    harness.detectChanges();

    controller.expectNone(LOGIN);
    const errors = Array.from(root.querySelectorAll('mat-error')).map((e) => e.textContent?.trim());
    expect(errors).toEqual(['Introduce tu correo', 'Introduce tu contraseña']);
    expect(document.activeElement).toBe(email());
  });

  it('con un correo mal escrito no envía y dice "Introduce un correo válido"', async () => {
    await open();
    type(email(), 'no-es-un-correo');
    type(password(), 'algo');
    submit();
    harness.detectChanges();

    controller.expectNone(LOGIN);
    expect(root.querySelector('mat-error')?.textContent).toContain('Introduce un correo válido');
  });

  it('el error del campo queda asociado al campo para los lectores de pantalla', async () => {
    await open();
    submit();
    harness.detectChanges();

    const errorId = root.querySelector('mat-error')!.id;
    expect(errorId).toBeTruthy();
    expect(email().getAttribute('aria-describedby') ?? '').toContain(errorId);
  });

  describe('con credenciales correctas', () => {
    async function login(): Promise<void> {
      type(email(), 'persona@example.invalid');
      type(password(), 'una-clave-valida');
      submit();
      const req = controller.expectOne(LOGIN);
      expect(req.request.body).toEqual({ email: 'persona@example.invalid', password: 'una-clave-valida' });
      req.flush(makeSession());
      await wait();
    }

    it('sin returnUrl lleva a la página de inicio e inicia sesión', async () => {
      await open('/acceso');
      await login();

      expect(router.url).toBe('/');
      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeTrue();
    });

    it('con una ruta interna en returnUrl lleva a esa ruta', async () => {
      await open('/acceso?returnUrl=%2Fjourneys%3Fpage%3D2');
      await login();

      expect(router.url).toBe('/journeys?page=2');
    });

    it('con un returnUrl externo lo ignora y lleva a la página de inicio', async () => {
      await open('/acceso?returnUrl=https%3A%2F%2Fotro.example%2Fruta');
      await login();
      expect(router.url).toBe('/');

      await open('/acceso?returnUrl=%2F%2Fotro.example');
      TestBed.inject(CurrentUser).clear();
      await login();
      expect(router.url).toBe('/');
    });
  });

  it('con credenciales incorrectas muestra el mensaje, vacía la contraseña, la enfoca y conserva el correo', async () => {
    await open();
    type(email(), 'persona@example.invalid');
    type(password(), 'mala');
    submit();
    controller.expectOne(LOGIN).flush({ error: 'UNAUTHORIZED' }, { status: 401, statusText: 'x' });
    harness.detectChanges();
    await wait();

    expect(alertText()).toContain('Correo o contraseña incorrectos');
    expect(router.url).toBe('/acceso');
    expect(password().value).toBe('');
    expect(email().value).toBe('persona@example.invalid');
    expect(document.activeElement).toBe(password());
    expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeFalse();
    // La contraseña vaciada no se marca como obligatoria en rojo: el formulario ya no cuenta como enviado
    expect(document.querySelector('mat-error')).toBeNull();
  });

  it('con la conexión caída muestra el mensaje genérico y permite reintentar sin perder el correo', async () => {
    await open();
    type(email(), 'persona@example.invalid');
    type(password(), 'una-clave');
    submit();
    controller.expectOne(LOGIN).error(new ProgressEvent('error'));
    harness.detectChanges();

    expect(alertText()).toContain('No hay conexión con el servidor');
    expect(email().value).toBe('persona@example.invalid');
    expect(submitButton().disabled).toBeFalse();

    submit();
    controller.expectOne(LOGIN).flush(makeSession());
  });

  it('con un error del servidor muestra el mensaje genérico del estado', async () => {
    await open();
    type(email(), 'persona@example.invalid');
    type(password(), 'una-clave');
    submit();
    controller.expectOne(LOGIN).flush(null, { status: 503, statusText: 'x' });
    harness.detectChanges();

    expect(alertText()).toContain('El servicio no está disponible');
  });

  it('durante el envío el botón queda desactivado con indicador de progreso y no se envía dos veces', async () => {
    await open();
    type(email(), 'persona@example.invalid');
    type(password(), 'una-clave');
    submit();
    submit();
    harness.detectChanges();

    expect(submitButton().disabled).toBeTrue();
    expect(root.querySelector('mat-progress-bar')).not.toBeNull();
    const requests = controller.match(LOGIN);
    expect(requests.length).toBe(1);
    requests[0].flush(makeSession());
  });

  it('ofrece enlaces a recuperar la contraseña y a crear una cuenta', async () => {
    await open();

    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/acceso/recuperar');
    expect(hrefs).toContain('/acceso/registro');
  });

  it('el botón de la contraseña muestra y oculta el texto', async () => {
    await open();
    const toggle = root.querySelector('button[aria-label="Mostrar contraseña"]') as HTMLButtonElement;
    toggle.click();
    harness.detectChanges();

    expect(password().type).toBe('text');
  });
});
