import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { appConfig } from './app.config';
import { ApiError } from './core/api/api-error';
import { CurrentUser } from './core/auth/current-user';
import { TokenStorageService } from './core/auth/token-storage.service';
import { makeSession, makeUser } from '../testing/session';

describe('appConfig: cadena de interceptores HTTP', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  it('usa /gateway como URL base y envía el token en las peticiones autenticadas', () => {
    TestBed.inject(TokenStorageService).set({ access_token: 'acceso-1', refresh_token: 'r', expires_in: 3599 });
    http.get('/gateway/places').subscribe();

    expect(controller.expectOne('/gateway/places').request.headers.get('Authorization')).toBe('Bearer acceso-1');
  });

  it('convierte los errores del gateway en ApiError con mensaje genérico', async () => {
    TestBed.inject(TokenStorageService).set({ access_token: 'acceso-1', refresh_token: 'r', expires_in: 3599 });
    const result = new Promise<unknown>((resolve) => http.get('/gateway/places/9').subscribe({ error: resolve }));

    controller.expectOne('/gateway/places/9').flush({ message: 'no existe' }, { status: 404, statusText: 'Not Found' });

    const error = (await result) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('No se encontró el recurso solicitado');
  });

  it('la ruta pública de login no lleva token aunque haya sesión', () => {
    TestBed.inject(TokenStorageService).set({ access_token: 'acceso-1', refresh_token: 'r', expires_in: 3599 });
    http.post('/gateway/auth/login', {}).subscribe();

    expect(controller.expectOne('/gateway/auth/login').request.headers.has('Authorization')).toBeFalse();
  });

  describe('inicializador de la sesión', () => {
    function boot(): Promise<void> {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting()] });
      controller = TestBed.inject(HttpTestingController);
      return TestBed.inject(ApplicationInitStatus).donePromise;
    }

    it('sin token de refresco arranca anónimo y sin peticiones', async () => {
      await boot();

      controller.expectNone(() => true);
      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeFalse();
    });

    it('con token de refresco vigente renueva el acceso y carga el perfil antes de arrancar', async () => {
      localStorage.setItem('hanoitToken', 'ref-guardado');
      localStorage.setItem('hanoitTokenExpiresDate', new Date(Date.now() + 600_000).toISOString());
      const ready = boot();

      controller.expectOne('/gateway/auth/refresh').flush(makeSession('acc-nuevo', 'ref-nuevo'));
      await new Promise((resolve) => setTimeout(resolve));
      controller.expectOne('/gateway/auth/me').flush(makeUser({ id: 'restaurado' }));
      await ready;

      expect(TestBed.inject(CurrentUser).user()?.id).toBe('restaurado');
      expect(TestBed.inject(TokenStorageService).get()).toBe('acc-nuevo');
    });

    it('si el refresco falla arranca anónimo sin error', async () => {
      localStorage.setItem('hanoitToken', 'ref-revocado');
      localStorage.setItem('hanoitTokenExpiresDate', new Date(Date.now() + 600_000).toISOString());
      const ready = boot();

      controller.expectOne('/gateway/auth/refresh').flush(null, { status: 401, statusText: 'x' });
      await ready;

      expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeFalse();
      expect(localStorage.getItem('hanoitToken')).toBeNull();
    });
  });
});
