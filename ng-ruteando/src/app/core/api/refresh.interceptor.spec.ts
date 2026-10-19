import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { SessionResponse } from '../auth/session.model';
import { TokenStorageService } from '../auth/token-storage.service';
import { API_BASE_URL } from './api-config';
import { ApiError } from './api-error';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { refreshInterceptor } from './refresh.interceptor';

const REFRESH_URL = '/gateway/auth/refresh';

function newSession(access: string, refresh: string, expiresIn = 3599): SessionResponse {
  return {
    message: null,
    accessToken: access,
    refreshToken: refresh,
    expiresIn,
    user: {
      id: 'u1',
      email: 'a@example.invalid',
      firstName: null,
      lastName: null,
      phone: null,
      role: 'tenant_admin',
      tenantId: 't1',
      emailVerified: true,
      phoneVerified: false,
      createdAt: '2026-10-11T14:14:04.598Z',
    },
  };
}

describe('interceptores de autenticación y renovación de sesión', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let tokens: TokenStorageService;
  let navigate: jasmine.Spy;

  function login(expiresIn = 3599): void {
    tokens.set({ access_token: 'a1', refresh_token: 'r1', expires_in: expiresIn });
  }

  function unauthorized(req: TestRequest): void {
    req.flush({ message: 'expirado' }, { status: 401, statusText: 'Unauthorized' });
  }

  /** Suscribe y devuelve una promesa con el valor o el error. */
  function call<T = unknown>(url: string, method = 'GET', body: unknown = null): Promise<T> {
    return new Promise<T>((resolve, reject) =>
      http.request<T>(method, url, { body }).subscribe({ next: resolve, error: reject }),
    );
  }

  beforeEach(() => {
    localStorage.clear();
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-19T10:00:00Z'));
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: Router, useValue: { url: '/places', navigate } },
        provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    jasmine.clock().uninstall(); // primero el reloj: si verify() falla no debe contaminar a los demás tests
    localStorage.clear();
    controller.verify();
  });

  it('ante un 401 renueva la sesión y repite la petición con el token nuevo', async () => {
    login();
    const result = call<{ ok: boolean }>('/gateway/journeys');

    unauthorized(controller.expectOne('/gateway/journeys'));
    const refresh = controller.expectOne(REFRESH_URL);
    expect(refresh.request.method).toBe('POST');
    expect(refresh.request.body).toEqual({ refreshToken: 'r1' });
    refresh.flush(newSession('a2', 'r2'));

    const retried = controller.expectOne('/gateway/journeys');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer a2');
    retried.flush({ ok: true });

    expect(await result).toEqual({ ok: true });
    expect(tokens.get()).toBe('a2');
    expect(tokens.getRefreshToken()).toBe('r2');
  });

  it('con tres 401 simultáneos hace una sola renovación y reintenta las tres peticiones', async () => {
    login();
    const results = ['a', 'b', 'c'].map((name) => call<string>(`/gateway/${name}`));

    for (const name of ['a', 'b', 'c']) {
      unauthorized(controller.expectOne(`/gateway/${name}`));
    }
    const refreshes = controller.match(REFRESH_URL);
    expect(refreshes.length).toBe(1);
    refreshes[0].flush(newSession('a2', 'r2'));

    for (const name of ['a', 'b', 'c']) {
      const retried = controller.expectOne(`/gateway/${name}`);
      expect(retried.request.headers.get('Authorization')).toBe('Bearer a2');
      retried.flush(name);
    }
    expect(await Promise.all(results)).toEqual(['a', 'b', 'c']);
  });

  it('un 401 de una petición enviada con el token viejo, tras renovar, solo se reintenta', async () => {
    login();
    const first = call<string>('/gateway/a');
    const second = call<string>('/gateway/b');

    unauthorized(controller.expectOne('/gateway/a'));
    controller.expectOne(REFRESH_URL).flush(newSession('a2', 'r2'));
    controller.expectOne('/gateway/a').flush('a');
    await first;

    unauthorized(controller.expectOne('/gateway/b')); // llega tarde, enviada con a1
    controller.expectNone(REFRESH_URL);
    const retried = controller.expectOne('/gateway/b');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer a2');
    retried.flush('b');
    expect(await second).toBe('b');
  });

  it('si falla la renovación borra la sesión, no reintenta y envía a /acceso con returnUrl', async () => {
    login();
    const result = call('/gateway/journeys');

    unauthorized(controller.expectOne('/gateway/journeys'));
    controller.expectOne(REFRESH_URL).flush({ message: 'revocado' }, { status: 401, statusText: 'Unauthorized' });

    const error = (await result.catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.message).toBe('Tu sesión no es válida o ha caducado');
    expect(tokens.get()).toBe('');
    expect(tokens.getRefreshToken()).toBeNull();
    expect(navigate).toHaveBeenCalledOnceWith(['/acceso'], { queryParams: { returnUrl: '/places' } });
    controller.expectNone('/gateway/journeys');
  });

  it('sin token de refresco no intenta renovar y envía a iniciar sesión', async () => {
    const result = call('/gateway/journeys');

    unauthorized(controller.expectOne('/gateway/journeys'));
    controller.expectNone(REFRESH_URL);

    const error = (await result.catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(401);
    expect(navigate).toHaveBeenCalledOnceWith(['/acceso'], { queryParams: { returnUrl: '/places' } });
  });

  it('si el reintento vuelve a dar 401 no refresca otra vez y trata la sesión como caducada', async () => {
    login();
    const result = call('/gateway/journeys');

    unauthorized(controller.expectOne('/gateway/journeys'));
    controller.expectOne(REFRESH_URL).flush(newSession('a2', 'r2'));
    unauthorized(controller.expectOne('/gateway/journeys'));

    const error = (await result.catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(401);
    controller.expectNone(REFRESH_URL);
    expect(tokens.get()).toBe('');
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('un error distinto de 401 no renueva la sesión', async () => {
    login();
    const result = call('/gateway/journeys');

    controller.expectOne('/gateway/journeys').flush(null, { status: 500, statusText: 'x' });

    const error = (await result.catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(500);
    controller.expectNone(REFRESH_URL);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('un 401 en /auth/login no intenta renovar la sesión', async () => {
    login();
    const result = call('/gateway/auth/login', 'POST', { email: 'a', password: 'b' });

    unauthorized(controller.expectOne('/gateway/auth/login'));

    const error = (await result.catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(401);
    controller.expectNone(REFRESH_URL);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('un 401 en /auth/refresh no intenta renovar la sesión', async () => {
    login();
    const result = call(REFRESH_URL, 'POST', { refreshToken: 'x' });

    unauthorized(controller.expectOne(REFRESH_URL));

    const error = (await result.catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(401);
    controller.expectNone(REFRESH_URL);
  });

  it('refresca antes de enviar si al acceso le quedan menos de 30 segundos', async () => {
    login(40); // caduca a las 10:00:40
    jasmine.clock().mockDate(new Date('2026-10-19T10:00:30Z')); // quedan 10 s
    const result = call<string>('/gateway/journeys');

    controller.expectNone('/gateway/journeys'); // todavía no sale: primero se renueva
    controller.expectOne(REFRESH_URL).flush(newSession('a2', 'r2'));
    const sent = controller.expectOne('/gateway/journeys');
    expect(sent.request.headers.get('Authorization')).toBe('Bearer a2');
    sent.flush('ok');

    expect(await result).toBe('ok');
    expect(tokens.get()).toBe('a2');
  });

  it('no refresca de antemano si el acceso tiene margen', async () => {
    login(3599);
    const result = call<string>('/gateway/journeys');

    controller.expectNone(REFRESH_URL);
    controller.expectOne('/gateway/journeys').flush('ok');
    expect(await result).toBe('ok');
  });

  it('si falla el refresco anticipado cierra la sesión', async () => {
    login(40);
    jasmine.clock().mockDate(new Date('2026-10-19T10:00:30Z'));
    const result = call('/gateway/journeys');

    controller.expectOne(REFRESH_URL).flush(null, { status: 401, statusText: 'x' });

    const error = (await result.catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(401);
    expect(tokens.get()).toBe('');
    expect(navigate).toHaveBeenCalledTimes(1);
    controller.expectNone('/gateway/journeys');
  });
});
