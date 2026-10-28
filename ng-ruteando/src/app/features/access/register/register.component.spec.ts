import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { Fixture, respondWith } from '../../../../testing/api-testing';
import { API_BASE_URL } from '../../../core/api/api-config';
import { authInterceptor } from '../../../core/api/auth.interceptor';
import { errorInterceptor } from '../../../core/api/error.interceptor';
import { refreshInterceptor } from '../../../core/api/refresh.interceptor';
import { CurrentUser } from '../../../core/auth/current-user';
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { RegisterComponent } from './register.component';

import registerFx from '../../../../testing/fixtures/gateway/post__auth__register.json';
import resendFx from '../../../../testing/fixtures/gateway/post__auth__resend-verification.json';
import policyFx from '../../../../testing/fixtures/gateway-errors/post__auth__register__password-policy-violation.json';
import validationFx from '../../../../testing/fixtures/gateway-errors/post__auth__login__validation-error.json';

const fx = (f: unknown) => f as unknown as Fixture;
const REGISTER = '/gateway/auth/register';
const RESEND = '/gateway/auth/resend-verification';
const VALID_PASSWORD = 'Ruteando@2026abcdef';

describe('RegisterComponent', () => {
  let harness: RouterTestingHarness;
  let controller: HttpTestingController;
  let root: HTMLElement;

  // Orden visual: nombre, apellidos, empresa, correo, contraseña y confirmación
  const inputs = () => Array.from(root.querySelectorAll('input')) as HTMLInputElement[];
  const submit = () => root.querySelector('form')!.dispatchEvent(new Event('submit'));
  const list = () => root.querySelector('ul.requirements') as HTMLElement;
  const alertText = () => root.querySelector('[role="alert"]')?.textContent?.trim() ?? '';
  const errors = () => Array.from(root.querySelectorAll('mat-error')).map((e) => e.textContent?.trim());

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
  function fill(values: Partial<Record<'first' | 'last' | 'company' | 'email' | 'pass' | 'confirm', string>> = {}): void {
    const v = { first: 'Ana', last: 'Pérez', company: 'Mi empresa', email: 'ana@example.invalid', pass: VALID_PASSWORD, confirm: VALID_PASSWORD, ...values };
    [v.first, v.last, v.company, v.email, v.pass, v.confirm].forEach((value, i) => type(inputs()[i], value));
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'acceso/registro', component: RegisterComponent }, { path: 'acceso', component: RegisterComponent }]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/acceso/registro');
    harness.detectChanges();
    root = harness.routeNativeElement as HTMLElement;
  });

  afterEach(() => {
    localStorage.clear();
    controller.verify();
  });

  it('declara la finalidad de cada campo para el navegador', () => {
    expect(inputs().map((i) => i.getAttribute('autocomplete'))).toEqual([
      'given-name',
      'family-name',
      'organization',
      'username',
      'new-password',
      'new-password',
    ]);
  });

  describe('registro correcto', () => {
    beforeEach(() => {
      fill();
      submit();
      const req = controller.expectOne(REGISTER);
      expect(Object.keys(req.request.body).sort()).toEqual(['email', 'firstName', 'lastName', 'password', 'tenantName']);
      expect(req.request.body).toEqual({ firstName: 'Ana', lastName: 'Pérez', tenantName: 'Mi empresa', email: 'ana@example.invalid', password: VALID_PASSWORD });
      respondWith(req, fx(registerFx));
      harness.detectChanges();
    });

    it('muestra el panel "Revisa tu correo" con la dirección usada y oculta el formulario', () => {
      expect(root.querySelector('h1')?.textContent).toContain('Revisa tu correo');
      expect(root.textContent).toContain('ana@example.invalid');
      expect(root.querySelector('form')).toBeNull();
    });

    it('no inicia sesión', () => {
      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeFalse();
      expect(TestBed.inject(TokenStorageService).get()).toBe('');
    });

    it('"Reenviar correo" pide el reenvío, muestra el mensaje neutro y se desactiva mientras dura', () => {
      const button = Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Reenviar correo')) as HTMLButtonElement;
      button.click();
      harness.detectChanges();
      expect(button.disabled).toBeTrue();

      const req = controller.expectOne(RESEND);
      expect(req.request.body).toEqual({ email: 'ana@example.invalid' });
      respondWith(req, fx(resendFx));
      harness.detectChanges();

      expect(button.disabled).toBeFalse();
      expect(root.querySelector('[role="status"]')?.textContent).toContain('Si el correo existe, recibirás instrucciones de verificación');
    });

    it('si el reenvío falla muestra el mensaje genérico y no la confirmación', () => {
      (Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Reenviar correo')) as HTMLButtonElement).click();
      controller.expectOne(RESEND).flush(null, { status: 503, statusText: 'x' });
      harness.detectChanges();

      expect(alertText()).toContain('El servicio no está disponible');
      expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe('');
    });

    it('ofrece un enlace para ir a iniciar sesión', () => {
      expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('/acceso');
    });
  });

  it('con las contraseñas distintas no envía y dice "Las contraseñas no coinciden" en la confirmación', () => {
    fill({ confirm: 'Otra@2026clavelarga' });
    submit();
    harness.detectChanges();

    controller.expectNone(REGISTER);
    expect(errors()).toEqual(['Las contraseñas no coinciden']);
  });

  describe('lista de requisitos de la contraseña', () => {
    const checks = () => Array.from(list().querySelectorAll('li')).map((li) => li.querySelector('.visually-hidden')?.textContent?.replace(/[,.\s]+/g, ' ').trim());

    it('está cerrada al abrir la pantalla pero descrita por el campo de contraseña', () => {
      expect(list().classList).toContain('visually-hidden');
      expect(inputs()[4].getAttribute('aria-describedby')).toContain(list().id);
      expect(list().querySelectorAll('li').length).toBe(5);
    });

    it('al enfocar la contraseña se abre con todo pendiente y no hay otra lista bajo la confirmación', () => {
      inputs()[4].dispatchEvent(new Event('focus'));
      harness.detectChanges();

      expect(list().classList).not.toContain('visually-hidden');
      expect(checks()).toEqual(Array(5).fill('pendiente'));
      expect(root.querySelectorAll('ul.requirements').length).toBe(1);
    });

    it('al escribir se marcan los puntos que se cumplen', () => {
      inputs()[4].dispatchEvent(new Event('focus'));
      type(inputs()[4], 'Ruteando@2026');
      harness.detectChanges();

      expect(checks()).toEqual(['pendiente', 'cumplido', 'cumplido', 'cumplido', 'cumplido']);
    });
  });

  it('con una contraseña de 15 caracteres no envía, dice que no cumple los requisitos y marca la longitud', () => {
    fill({ pass: 'Abcdefghijkl1@x', confirm: 'Abcdefghijkl1@x' });
    submit();
    harness.detectChanges();

    controller.expectNone(REGISTER);
    expect(errors()).toEqual(['La contraseña no cumple los requisitos']);
    expect(Array.from(list().querySelectorAll('li.failed')).map((li) => li.querySelector('span')?.textContent)).toEqual(['Al menos 16 caracteres']);
  });

  it('con 16 caracteres pero sin mayúscula ni símbolo no envía y marca los que faltan', () => {
    fill({ pass: 'abcdefghijklmnop1234', confirm: 'abcdefghijklmnop1234' });
    submit();
    harness.detectChanges();

    controller.expectNone(REGISTER);
    expect(errors()).toEqual(['La contraseña no cumple los requisitos']);
    expect(Array.from(list().querySelectorAll('li.failed')).map((li) => li.querySelector('span')?.textContent)).toEqual(['Una mayúscula', 'Un símbolo (@$!%*?&)']);
  });

  it('con campos obligatorios vacíos muestra el error de cada uno, no envía y enfoca el primero', () => {
    submit();
    harness.detectChanges();

    controller.expectNone(REGISTER);
    expect(errors()).toEqual([
      'Introduce tu nombre',
      'Introduce tus apellidos',
      'Introduce el nombre de tu empresa',
      'Introduce tu correo',
      'Introduce una contraseña',
      'Confirma tu contraseña',
    ]);
    expect(document.activeElement).toBe(inputs()[0]);
  });

  it('con un correo no válido no envía', () => {
    fill({ email: 'no-es-un-correo' });
    submit();
    harness.detectChanges();

    controller.expectNone(REGISTER);
    expect(errors()).toEqual(['Introduce un correo válido']);
  });

  it('con un correo ya registrado muestra el mensaje, conserva los datos y vacía solo las contraseñas', () => {
    fill();
    submit();
    controller.expectOne(REGISTER).flush({ error: 'CONFLICT', message: 'exists' }, { status: 409, statusText: 'x' });
    harness.detectChanges();

    expect(alertText()).toContain('Ya existe una cuenta con ese correo');
    expect(inputs().slice(0, 4).map((i) => i.value)).toEqual(['Ana', 'Pérez', 'Mi empresa', 'ana@example.invalid']);
    expect(inputs()[4].value).toBe('');
    expect(inputs()[5].value).toBe('');
    expect(root.querySelector('form')).not.toBeNull();
  });

  it('con un 400 muestra "Revisa los datos e inténtalo de nuevo"', () => {
    fill();
    submit();
    controller.expectOne(REGISTER).flush({ error: 'BAD_REQUEST' }, { status: 400, statusText: 'x' });
    harness.detectChanges();

    expect(alertText()).toContain('Revisa los datos e inténtalo de nuevo');
  });

  it('si el gateway rechaza la contraseña (PASSWORD_POLICY_VIOLATION) muestra la regla, conserva los datos, vacía las contraseñas y enfoca la contraseña', async () => {
    fill();
    submit();
    controller.expectOne(REGISTER).flush(fx(policyFx).response.body as object, { status: 400, statusText: 'x' });
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));

    expect(alertText()).toContain('La contraseña no cumple la política');
    expect(alertText()).toContain('Mínimo 16 caracteres');
    expect(alertText()).not.toContain('Revisa los datos');
    expect(inputs().slice(0, 4).map((i) => i.value)).toEqual(['Ana', 'Pérez', 'Mi empresa', 'ana@example.invalid']);
    expect(inputs()[4].value).toBe('');
    expect(inputs()[5].value).toBe('');
    expect(document.activeElement).toBe(inputs()[4]);
  });

  it('con un VALIDATION_ERROR muestra "Revisa los datos e inténtalo de nuevo" y no mueve el foco', async () => {
    fill();
    submit();
    controller.expectOne(REGISTER).flush(fx(validationFx).response.body as object, { status: 400, statusText: 'x' });
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));

    expect(alertText()).toContain('Revisa los datos e inténtalo de nuevo');
    expect(document.activeElement).not.toBe(inputs()[4]);
  });

  it('no se envía dos veces mientras espera la respuesta', () => {
    fill();
    submit();
    submit();
    harness.detectChanges();

    expect((root.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();
    const requests = controller.match(REGISTER);
    expect(requests.length).toBe(1);
    requests[0].flush(registerFx.response.body);
  });

  it('enlaza a iniciar sesión', () => {
    expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('/acceso');
  });
});
