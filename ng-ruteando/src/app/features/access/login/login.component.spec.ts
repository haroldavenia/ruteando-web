import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
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

  async function open(url = '/access'): Promise<void> {
    await harness.navigateByUrl(url);
    harness.detectChanges();
    root = harness.routeNativeElement as HTMLElement;
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'access', component: LoginComponent },
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
      await open('/access');
      await login();

      expect(router.url).toBe('/');
      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeTrue();
    });

    it('con una ruta interna en returnUrl lleva a esa ruta', async () => {
      await open('/access?returnUrl=%2Fjourneys%3Fpage%3D2');
      await login();

      expect(router.url).toBe('/journeys?page=2');
    });

    it('con un returnUrl externo lo ignora y lleva a la página de inicio', async () => {
      await open('/access?returnUrl=https%3A%2F%2Fotro.example%2Fruta');
      await login();
      expect(router.url).toBe('/');

      await open('/access?returnUrl=%2F%2Fotro.example');
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
    expect(router.url).toBe('/access');
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

  describe('con segundo factor', () => {
    const CHALLENGE = {
      mfaRequired: true,
      challengeId: 'reto-1',
      methods: [{ method: 'totp', destination: null }],
      expiresInSeconds: 300,
    };
    const VERIFY = '/gateway/mfa/login/verify';
    const code = () => root.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;

    async function firstStep(response: object, url = '/access'): Promise<void> {
      await open(url);
      type(email(), 'persona@example.invalid');
      type(password(), 'una-clave-valida');
      submit();
      controller.expectOne(LOGIN).flush(response);
      await wait();
      harness.detectChanges();
    }

    it('pasa al segundo paso sin sesión, sin navegar y sin conservar la contraseña', async () => {
      await firstStep(CHALLENGE);

      expect(root.querySelector('app-mfa-verify-step')).not.toBeNull();
      expect(root.querySelector('input[autocomplete="current-password"]')).toBeNull();
      expect(root.textContent).not.toContain('una-clave-valida');
      expect(router.url).toBe('/access');
      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeFalse();
      expect(Object.keys(localStorage)).toEqual([]);
    });

    it('al verificar el código inicia sesión y va al destino de siempre', async () => {
      await firstStep(CHALLENGE, '/access?returnUrl=%2Fjourneys%3Fpage%3D2');
      type(code(), '123456');
      submit();
      controller.expectOne(VERIFY).flush(makeSession());
      await wait();

      expect(router.url).toBe('/journeys?page=2');
      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeTrue();
    });

    it('si el reto caduca vuelve a las credenciales con el motivo y el correo conservado', async () => {
      await firstStep(CHALLENGE);
      type(code(), '000000');
      submit();
      controller.expectOne(VERIFY).flush({ code: 'CHALLENGE_EXPIRED' }, { status: 401, statusText: 'Unauthorized' });
      await wait();
      harness.detectChanges();

      expect(root.querySelector('app-mfa-verify-step')).toBeNull();
      expect(password()).not.toBeNull();
      expect(alertText()).toContain('La verificación caducó. Inicia sesión de nuevo');
      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeFalse();
    });

    it('volver desde el segundo paso muestra otra vez las credenciales, sin mensaje', async () => {
      await firstStep(CHALLENGE);
      Array.from(root.querySelectorAll<HTMLButtonElement>('button.link'))
        .find((b) => b.textContent?.trim() === 'Volver')!
        .click();
      harness.detectChanges();

      expect(password().value).toBe('');
      expect(alertText()).toBe('');
    });

    it('si la empresa exige activar un método muestra la activación y no da sesión todavía', async () => {
      await firstStep({
        mfaEnrollRequired: true,
        challengeId: 'reto-2',
        methods: ['totp', 'email'],
        expiresInSeconds: 300,
      });

      expect(root.querySelector('app-mfa-enroll-step')).not.toBeNull();
      expect(root.textContent).toContain('Activa la verificación en dos pasos');
      expect(root.querySelectorAll('.choice').length).toBe(2);
      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeFalse();
      expect(router.url).toBe('/access');
    });
  });

  it('ofrece enlaces a recuperar la contraseña y a crear una cuenta', async () => {
    await open();

    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/access/recover');
    expect(hrefs).toContain('/access/register');
  });

  it('el botón de la contraseña muestra y oculta el texto', async () => {
    await open();
    const toggle = root.querySelector('button[aria-label="Mostrar contraseña"]') as HTMLButtonElement;
    toggle.click();
    harness.detectChanges();

    expect(password().type).toBe('text');
  });
});
