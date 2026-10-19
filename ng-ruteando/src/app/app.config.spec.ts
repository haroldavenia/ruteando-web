import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { appConfig } from './app.config';
import { ApiError } from './core/api/api-error';
import { TokenStorageService } from './core/auth/token-storage.service';

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
});
