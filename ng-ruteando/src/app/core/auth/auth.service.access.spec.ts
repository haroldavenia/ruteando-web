import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Fixture, respondWith } from '../../../testing/api-testing';
import { API_BASE_URL } from '../api/api-config';
import { ApiError } from '../api/api-error';
import { authInterceptor } from '../api/auth.interceptor';
import { errorInterceptor } from '../api/error.interceptor';
import { refreshInterceptor } from '../api/refresh.interceptor';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user';
import { TokenStorageService } from './token-storage.service';

import registerFx from '../../../testing/fixtures/gateway/post__auth__register.json';
import verifyFx from '../../../testing/fixtures/gateway/post__auth__verify-email.json';
import resendFx from '../../../testing/fixtures/gateway/post__auth__resend-verification.json';
import forgotFx from '../../../testing/fixtures/gateway/post__auth__forgot-password.json';
import resetFx from '../../../testing/fixtures/gateway/post__auth__reset-password.json';
import logoutFx from '../../../testing/fixtures/gateway/post__auth__logout.json';

import policyFx from '../../../testing/fixtures/gateway-errors/post__auth__register__password-policy-violation.json';
import duplicateFx from '../../../testing/fixtures/gateway-errors/post__auth__register__email-already-exists.json';
import invalidTokenFx from '../../../testing/fixtures/gateway-errors/post__auth__reset-password__invalid-token.json';
import validationFx from '../../../testing/fixtures/gateway-errors/post__auth__login__validation-error.json';

const fx = (f: unknown) => f as unknown as Fixture;
const INVALID_LINK = 'El enlace no es válido o ha caducado';
const REVIEW_DATA = 'Revisa los datos e inténtalo de nuevo';
const POLICY_REJECTED = 'La contraseña no cumple la política. Mínimo 16 caracteres, con mayúscula, minúscula, número y un símbolo (@$!%*?&)';
const flushError = (req: TestRequest, f: unknown) =>
  req.flush(fx(f).response.body as object, { status: fx(f).response.status, statusText: 'Error' });

describe('AuthService: operaciones de acceso', () => {
  let service: AuthService;
  let controller: HttpTestingController;
  let tokens: TokenStorageService;
  let currentUser: CurrentUser;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-19T10:00:00Z'));
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: Router, useValue: { url: '/', navigate } },
        provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    controller = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(TokenStorageService);
    currentUser = TestBed.inject(CurrentUser);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    localStorage.clear();
    controller.verify();
  });

  const fail = <T>(source: { subscribe: (o: { next: () => void; error: (e: unknown) => void }) => unknown }): Promise<ApiError> =>
    new Promise((resolve, reject) => source.subscribe({ next: () => reject(new Error('se esperaba un error')), error: (e) => resolve(e as ApiError) }));
  const ok = <T>(source: { subscribe: (o: { next: (v: T) => void; error: (e: unknown) => void }) => unknown }): Promise<T> =>
    new Promise((resolve, reject) => source.subscribe({ next: resolve, error: reject }));

  describe('mensajes del login', () => {
    it('401: "Correo o contraseña incorrectos", no el de sesión caducada', async () => {
      const result = fail(service.login('a@example.invalid', 'x'));
      controller.expectOne('/gateway/auth/login').flush({ error: 'UNAUTHORIZED' }, { status: 401, statusText: 'x' });

      expect((await result).message).toBe('Correo o contraseña incorrectos');
    });

    it('sin conexión y con error del servidor da el mensaje genérico del estado', async () => {
      const offline = fail(service.login('a@example.invalid', 'x'));
      controller.expectOne('/gateway/auth/login').error(new ProgressEvent('error'));
      expect((await offline).message).toBe('No hay conexión con el servidor');

      const down = fail(service.login('a@example.invalid', 'x'));
      controller.expectOne('/gateway/auth/login').flush(null, { status: 500, statusText: 'x' });
      expect((await down).message).toBe('El servicio no está disponible, inténtalo más tarde');
    });
  });

  describe('register', () => {
    const input = registerFx.request.body as never;

    it('envía los cinco datos, devuelve usuario y tenant y no guarda tokens ni usuario actual', async () => {
      const result = ok<{ user: { email: string }; tenant: { plan: string } }>(service.register(input));
      const req = controller.expectOne('/gateway/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerFx.request.body);
      expect(Object.keys(req.request.body).sort()).toEqual(['email', 'firstName', 'lastName', 'password', 'tenantName']);
      respondWith(req, fx(registerFx));

      const response = await result;
      expect(response.tenant.plan).toBe('free');
      expect(tokens.get()).toBe('');
      expect(tokens.getRefreshToken()).toBeNull();
      expect(currentUser.isAuthenticated()).toBeFalse();
    });

    it('409: "Ya existe una cuenta con ese correo"', async () => {
      const result = fail(service.register(input));
      controller.expectOne('/gateway/auth/register').flush({ error: 'CONFLICT', message: 'exists' }, { status: 409, statusText: 'x' });

      const error = await result;
      expect(error.message).toBe('Ya existe una cuenta con ese correo');
      expect(error.code).toBe('CONFLICT');
    });

    it('409 real (EMAIL_ALREADY_EXISTS): "Ya existe una cuenta con ese correo" y conserva el código', async () => {
      const result = fail(service.register(input));
      flushError(controller.expectOne('/gateway/auth/register'), duplicateFx);

      const error = await result;
      expect(error.message).toBe('Ya existe una cuenta con ese correo');
      expect(error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('400 PASSWORD_POLICY_VIOLATION: la regla de la contraseña, no el mensaje genérico', async () => {
      const result = fail(service.register(input));
      flushError(controller.expectOne('/gateway/auth/register'), policyFx);

      const error = await result;
      expect(error.message).toBe(POLICY_REJECTED);
      expect(error.code).toBe('PASSWORD_POLICY_VIOLATION');
    });

    it('400 VALIDATION_ERROR: "Revisa los datos e inténtalo de nuevo"', async () => {
      const result = fail(service.register(input));
      flushError(controller.expectOne('/gateway/auth/register'), validationFx);

      expect((await result).message).toBe(REVIEW_DATA);
    });

    it('400: "Revisa los datos e inténtalo de nuevo"', async () => {
      const result = fail(service.register(input));
      controller.expectOne('/gateway/auth/register').flush({ error: 'BAD_REQUEST' }, { status: 400, statusText: 'x' });

      expect((await result).message).toBe('Revisa los datos e inténtalo de nuevo');
    });
  });

  describe('verifyEmail', () => {
    it('con un token válido inicia sesión: tokens, usuario actual con rol y tenantId, y renovación programada', async () => {
      const result = ok(service.verifyEmail('TOKEN-1'));
      const req = controller.expectOne('/gateway/auth/verify-email');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'TOKEN-1' });
      respondWith(req, fx(verifyFx));
      await result;

      const user = (verifyFx.response.body as { user: { role: string; tenantId: string } }).user;
      expect(tokens.get()).toBe('acceso-ficticio');
      expect(tokens.getRefreshToken()).toBe('refresco-ficticio');
      expect(currentUser.role()).toBe(user.role as never);
      expect(currentUser.tenantId()).toBe(user.tenantId);

      jasmine.clock().tick(3_599_000 - 30_000); // renovación 30 s antes de caducar
      controller.expectOne('/gateway/auth/refresh').flush(verifyFx.response.body);
    });

    it('con un token rechazado no guarda sesión y da el mensaje de enlace no válido', async () => {
      const result = fail(service.verifyEmail('MALO'));
      controller.expectOne('/gateway/auth/verify-email').flush({ error: 'BAD_REQUEST' }, { status: 400, statusText: 'x' });

      expect((await result).message).toBe(INVALID_LINK);
      expect(tokens.get()).toBe('');
      expect(currentUser.isAuthenticated()).toBeFalse();
      controller.expectNone('/gateway/auth/refresh');
    });
  });

  describe('reenvío y recuperación', () => {
    it('resendVerification: POST /auth/resend-verification con { email } y sin sesión', async () => {
      const result = ok(service.resendVerification('a@example.invalid'));
      const req = controller.expectOne('/gateway/auth/resend-verification');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'a@example.invalid' });
      expect(Object.keys(resendFx.request.body as object)).toEqual(['email']);
      respondWith(req, fx(resendFx));

      expect(((await result) as { message: string }).message).toContain('instrucciones');
      expect(currentUser.isAuthenticated()).toBeFalse();
    });

    it('forgotPassword: POST /auth/forgot-password con { email }', async () => {
      const result = ok(service.forgotPassword('a@example.invalid'));
      const req = controller.expectOne('/gateway/auth/forgot-password');
      expect(req.request.body).toEqual({ email: 'a@example.invalid' });
      expect(Object.keys(forgotFx.request.body as object)).toEqual(['email']);
      respondWith(req, fx(forgotFx));
      await result;

      expect(currentUser.isAuthenticated()).toBeFalse();
    });

    it('resetPassword: POST /auth/reset-password con { token, newPassword } y sin iniciar sesión', async () => {
      const result = ok(service.resetPassword('TOKEN-2', 'una-contraseña-nueva'));
      const req = controller.expectOne('/gateway/auth/reset-password');
      expect(req.request.body).toEqual({ token: 'TOKEN-2', newPassword: 'una-contraseña-nueva' });
      expect(Object.keys(resetFx.request.body as object).sort()).toEqual(['newPassword', 'token']);
      respondWith(req, fx(resetFx));
      await result;

      expect(tokens.get()).toBe('');
      expect(currentUser.isAuthenticated()).toBeFalse();
    });

    for (const status of [400, 401, 404, 410]) {
      it(`resetPassword con ${status}: "${INVALID_LINK}"`, async () => {
        const result = fail(service.resetPassword('MALO', 'una-contraseña-nueva'));
        controller.expectOne('/gateway/auth/reset-password').flush({ error: 'X' }, { status, statusText: 'x' });

        expect((await result).message).toBe(INVALID_LINK);
      });
    }

    it('resetPassword con 400 INVALID_TOKEN real: enlace no válido', async () => {
      const result = fail(service.resetPassword('MALO', 'Ficticia@2026abcdef'));
      flushError(controller.expectOne('/gateway/auth/reset-password'), invalidTokenFx);

      const error = await result;
      expect(error.message).toBe(INVALID_LINK);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('resetPassword con 400 PASSWORD_POLICY_VIOLATION: la regla, no "enlace no válido"', async () => {
      const result = fail(service.resetPassword('BUENO', 'corta'));
      flushError(controller.expectOne('/gateway/auth/reset-password'), policyFx);

      expect((await result).message).toBe(POLICY_REJECTED);
    });

    it('resetPassword con 400 VALIDATION_ERROR: revisa los datos, no "enlace no válido"', async () => {
      const result = fail(service.resetPassword('BUENO', 'x'));
      flushError(controller.expectOne('/gateway/auth/reset-password'), validationFx);

      expect((await result).message).toBe(REVIEW_DATA);
    });

    it('verifyEmail con 400 INVALID_TOKEN sigue diciendo enlace no válido', async () => {
      const result = fail(service.verifyEmail('MALO'));
      flushError(controller.expectOne('/gateway/auth/verify-email'), invalidTokenFx);

      expect((await result).message).toBe(INVALID_LINK);
    });

    it('un fallo del servidor en forgotPassword conserva el mensaje genérico', async () => {
      const result = fail(service.forgotPassword('a@example.invalid'));
      controller.expectOne('/gateway/auth/forgot-password').flush(null, { status: 503, statusText: 'x' });

      expect((await result).message).toBe('El servicio no está disponible, inténtalo más tarde');
    });
  });

  describe('logout', () => {
    it('envía el token de refresco en el cuerpo, como el ejemplo real, y limpia la sesión', async () => {
      tokens.set({ access_token: 'acceso-ficticio', refresh_token: 'refresco-ficticio', expires_in: 3599 });
      const result = ok(service.logout());

      const req = controller.expectOne('/gateway/auth/logout');
      expect(req.request.method).toBe(logoutFx.request.method);
      expect(req.request.body).toEqual(logoutFx.request.body);
      expect(req.request.headers.get('Authorization')).toBe('Bearer acceso-ficticio');
      respondWith(req, fx(logoutFx));
      await result;

      expect(tokens.get()).toBe('');
      expect(tokens.getRefreshToken()).toBeNull();
      expect(navigate).toHaveBeenCalledOnceWith(['/acceso']);
    });

    it('si el gateway falla al cerrar, la sesión local se limpia igualmente', async () => {
      tokens.set({ access_token: 'a', refresh_token: 'r', expires_in: 3599 });
      const result = ok(service.logout());

      controller.expectOne('/gateway/auth/logout').flush(null, { status: 500, statusText: 'x' });
      await result;

      expect(tokens.get()).toBe('');
      expect(navigate).toHaveBeenCalledOnceWith(['/acceso']);
    });

    it('sin token de refresco no llama al gateway: limpia y navega', async () => {
      await ok(service.logout());

      controller.expectNone('/gateway/auth/logout');
      expect(tokens.get()).toBe('');
      expect(currentUser.isAuthenticated()).toBeFalse();
      expect(navigate).toHaveBeenCalledOnceWith(['/acceso']);
    });

    it('con el token de refresco ya caducado tampoco llama al gateway', async () => {
      tokens.set({ access_token: 'a', refresh_token: 'r', expires_in: 60 });
      jasmine.clock().mockDate(new Date('2026-10-19T10:05:00Z'));
      await ok(service.logout());

      controller.expectNone('/gateway/auth/logout');
      expect(navigate).toHaveBeenCalledOnceWith(['/acceso']);
    });
  });
});
