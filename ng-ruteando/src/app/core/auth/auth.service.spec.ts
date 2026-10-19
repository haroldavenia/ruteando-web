import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { makeSession, makeUser } from '../../../testing/session';
import { API_BASE_URL } from '../api/api-config';
import { ApiError } from '../api/api-error';
import { authInterceptor } from '../api/auth.interceptor';
import { errorInterceptor } from '../api/error.interceptor';
import { refreshInterceptor } from '../api/refresh.interceptor';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user';
import { TokenStorageService } from './token-storage.service';

const LOGIN_URL = '/gateway/auth/login';
const REFRESH_URL = '/gateway/auth/refresh';
const PASSWORD = 'contraseña-secreta-123';

describe('AuthService', () => {
  let service: AuthService;
  let controller: HttpTestingController;
  let tokens: TokenStorageService;
  let currentUser: CurrentUser;
  let navigate: jasmine.Spy;

  function setup(platform: 'browser' | 'server' = 'browser'): void {
    TestBed.resetTestingModule();
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: Router, useValue: { url: '/places', navigate } },
        provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    controller = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(TokenStorageService);
    currentUser = TestBed.inject(CurrentUser);
  }

  beforeEach(() => {
    localStorage.clear();
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-19T10:00:00Z'));
    setup();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    localStorage.clear();
    controller.verify();
  });

  describe('login', () => {
    it('con credenciales correctas guarda los tokens y deja disponible al usuario', async () => {
      const result = new Promise((resolve) => service.login('persona@example.invalid', PASSWORD).subscribe(resolve));

      const req = controller.expectOne(LOGIN_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'persona@example.invalid', password: PASSWORD });
      req.flush(makeSession('acc', 'ref', 3599, makeUser({ role: 'super_admin', tenantId: 't7' })));
      await result;

      expect(tokens.get()).toBe('acc');
      expect(tokens.getRefreshToken()).toBe('ref');
      expect(tokens.expiresAt?.toISOString()).toBe('2026-10-19T10:59:59.000Z');
      expect(currentUser.isAuthenticated()).toBeTrue();
      expect(currentUser.role()).toBe('super_admin');
      expect(currentUser.tenantId()).toBe('t7');
    });

    it('con credenciales incorrectas no guarda sesión y devuelve el error genérico', async () => {
      const result = new Promise<unknown>((resolve) => service.login('persona@example.invalid', PASSWORD).subscribe({ error: resolve }));

      controller.expectOne(LOGIN_URL).flush({ message: 'bad credentials' }, { status: 401, statusText: 'Unauthorized' });

      const error = (await result) as ApiError;
      expect(error.status).toBe(401);
      expect(error.message).toBe('Tu sesión no es válida o ha caducado');
      expect(tokens.get()).toBe('');
      expect(tokens.getRefreshToken()).toBeNull();
      expect(currentUser.isAuthenticated()).toBeFalse();
      controller.expectNone(REFRESH_URL);
    });

    it('la contraseña no queda guardada en ningún almacenamiento ni en el estado', async () => {
      const done = new Promise((resolve) => service.login('persona@example.invalid', PASSWORD).subscribe(resolve));
      controller.expectOne(LOGIN_URL).flush(makeSession());
      await done;

      const stored = [localStorage, sessionStorage].flatMap((s) => Object.keys(s).map((k) => `${k}=${s.getItem(k)}`));
      expect(stored.join('|')).not.toContain(PASSWORD);
      expect(JSON.stringify(currentUser.user())).not.toContain(PASSWORD);
      const ownStrings = Object.values(service as unknown as Record<string, unknown>).filter((v) => typeof v === 'string');
      expect(ownStrings).not.toContain(PASSWORD);
      // Tampoco tras un login fallido
      const failed = new Promise<unknown>((resolve) => service.login('otra@example.invalid', PASSWORD).subscribe({ error: resolve }));
      controller.expectOne(LOGIN_URL).flush(null, { status: 401, statusText: 'x' });
      await failed;
      expect([localStorage, sessionStorage].flatMap((s) => Object.keys(s).map((k) => s.getItem(k))).join('|')).not.toContain(PASSWORD);
    });
  });

  describe('logout', () => {
    async function loggedIn(): Promise<void> {
      const done = new Promise((resolve) => service.login('persona@example.invalid', PASSWORD).subscribe(resolve));
      controller.expectOne(LOGIN_URL).flush(makeSession());
      await done;
    }

    it('llama a POST /auth/logout, limpia la sesión y lleva a /acceso', async () => {
      await loggedIn();
      const done = new Promise((resolve) => service.logout().subscribe(resolve));

      const req = controller.expectOne('/gateway/auth/logout');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer acceso-1');
      req.flush(null, { status: 204, statusText: 'No Content' });
      await done;

      expect(tokens.get()).toBe('');
      expect(tokens.getRefreshToken()).toBeNull();
      expect(currentUser.isAuthenticated()).toBeFalse();
      expect(navigate).toHaveBeenCalledOnceWith(['/acceso']);
    });

    it('si el gateway falla al cerrar, la sesión local se limpia igualmente', async () => {
      await loggedIn();
      const done = new Promise((resolve) => service.logout().subscribe(resolve));

      controller.expectOne('/gateway/auth/logout').flush(null, { status: 500, statusText: 'x' });
      await done;

      expect(tokens.get()).toBe('');
      expect(currentUser.isAuthenticated()).toBeFalse();
      expect(navigate).toHaveBeenCalledOnceWith(['/acceso']);
      controller.expectNone(REFRESH_URL);
    });

    it('si el gateway rechaza el cierre con 401 no intenta renovar la sesión', async () => {
      await loggedIn();
      const done = new Promise((resolve) => service.logout().subscribe(resolve));

      controller.expectOne('/gateway/auth/logout').flush(null, { status: 401, statusText: 'x' });
      await done;

      controller.expectNone(REFRESH_URL);
      expect(currentUser.isAuthenticated()).toBeFalse();
    });
  });

  it('loadProfile carga el perfil con GET /auth/me', async () => {
    const result = new Promise((resolve) => service.loadProfile().subscribe(resolve));

    controller.expectOne('/gateway/auth/me').flush(makeUser({ id: 'u5', role: 'driver' }));
    await result;

    expect(currentUser.user()?.id).toBe('u5');
    expect(currentUser.role()).toBe('driver');
  });

  describe('renovación programada', () => {
    async function loggedIn(expiresIn: number): Promise<void> {
      const done = new Promise((resolve) => service.login('persona@example.invalid', PASSWORD).subscribe(resolve));
      controller.expectOne(LOGIN_URL).flush(makeSession('acc', 'ref', expiresIn));
      await done;
    }

    it('renueva 30 s antes de caducar aunque no haya peticiones y reprograma el siguiente', async () => {
      await loggedIn(100); // caduca a los 100 s: renovación a los 70 s

      jasmine.clock().tick(69_999);
      controller.expectNone(REFRESH_URL);
      jasmine.clock().tick(1);
      controller.expectOne(REFRESH_URL).flush(makeSession('acc-2', 'ref-2', 100, makeUser({ id: 'otro' })));

      expect(tokens.get()).toBe('acc-2');
      expect(currentUser.user()?.id).toBe('otro');

      jasmine.clock().mockDate(new Date('2026-10-19T10:01:10Z'));
      jasmine.clock().tick(70_000); // siguiente renovación
      controller.expectOne(REFRESH_URL).flush(makeSession('acc-3', 'ref-3', 100));
      expect(tokens.get()).toBe('acc-3');
    });

    it('si la renovación programada falla, cierra la sesión', async () => {
      await loggedIn(100);

      jasmine.clock().tick(70_000);
      controller.expectOne(REFRESH_URL).flush(null, { status: 401, statusText: 'x' });
      await Promise.resolve();

      expect(tokens.get()).toBe('');
      expect(currentUser.isAuthenticated()).toBeFalse();
      expect(navigate).toHaveBeenCalledOnceWith(['/acceso'], { queryParams: { returnUrl: '/places' } });
    });

    it('al cerrar sesión se cancela la renovación programada', async () => {
      await loggedIn(100);
      const done = new Promise((resolve) => service.logout().subscribe(resolve));
      controller.expectOne('/gateway/auth/logout').flush(null, { status: 204, statusText: 'x' });
      await done;

      jasmine.clock().tick(200_000);
      controller.expectNone(REFRESH_URL);
    });
  });

  describe('restoreSession', () => {
    it('sin token de refresco queda anónimo y no hace ninguna petición', async () => {
      await service.restoreSession();

      controller.expectNone(REFRESH_URL);
      controller.expectNone('/gateway/auth/me');
      expect(currentUser.isAuthenticated()).toBeFalse();
    });

    it('con token de refresco vigente renueva el acceso y carga el perfil', async () => {
      tokens.set({ access_token: 'viejo', refresh_token: 'ref-guardado', expires_in: 3599 });
      tokens.resetToken(); // simula una recarga: solo queda el token de refresco
      localStorage.setItem('hanoitToken', 'ref-guardado');
      localStorage.setItem('hanoitTokenExpiresDate', new Date('2026-10-19T10:30:00Z').toISOString());
      const done = service.restoreSession();

      const refresh = controller.expectOne(REFRESH_URL);
      expect(refresh.request.body).toEqual({ refreshToken: 'ref-guardado' });
      refresh.flush(makeSession('acc-nuevo', 'ref-nuevo'));
      await Promise.resolve();
      await Promise.resolve();
      controller.expectOne('/gateway/auth/me').flush(makeUser({ id: 'restaurado' }));
      await done;

      expect(tokens.get()).toBe('acc-nuevo');
      expect(currentUser.user()?.id).toBe('restaurado');
    });

    it('si el gateway rechaza el refresco queda anónimo, limpia el almacenamiento y no redirige', async () => {
      localStorage.setItem('hanoitToken', 'ref-revocado');
      localStorage.setItem('hanoitTokenExpiresDate', new Date('2026-10-19T10:30:00Z').toISOString());
      const done = service.restoreSession();

      controller.expectOne(REFRESH_URL).flush({ message: 'revocado' }, { status: 401, statusText: 'Unauthorized' });
      await done;

      expect(currentUser.isAuthenticated()).toBeFalse();
      expect(localStorage.getItem('hanoitToken')).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
      controller.expectNone('/gateway/auth/me');
    });

    it('en el servidor (SSR) no intenta restaurar la sesión', async () => {
      setup('server');
      localStorage.setItem('hanoitToken', 'no-debe-usarse');

      await service.restoreSession();

      controller.expectNone(REFRESH_URL);
      expect(currentUser.isAuthenticated()).toBeFalse();
    });
  });

  it('el HttpClient de los tests está conectado a la cadena de interceptores', () => {
    expect(TestBed.inject(HttpClient)).toBeTruthy();
  });
});
