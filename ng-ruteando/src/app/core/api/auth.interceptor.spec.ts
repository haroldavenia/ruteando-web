import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TokenStorageService } from '../auth/token-storage.service';
import { API_BASE_URL } from './api-config';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let tokens: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  it('envía Authorization: Bearer con el token de acceso en una petición autenticada', () => {
    tokens.set({ access_token: 'acceso-1', refresh_token: 'r', expires_in: 3599 });
    http.get('/gateway/journeys').subscribe();

    expect(controller.expectOne('/gateway/journeys').request.headers.get('Authorization')).toBe('Bearer acceso-1');
  });

  it('no envía Authorization en las rutas públicas', () => {
    tokens.set({ access_token: 'acceso-1', refresh_token: 'r', expires_in: 3599 });
    const publicUrls: [string, string][] = [
      ['POST', '/gateway/auth/login'],
      ['POST', '/gateway/auth/register'],
      ['POST', '/gateway/auth/refresh'],
      ['POST', '/gateway/auth/forgot-password'],
      ['POST', '/gateway/auth/reset-password'],
      ['GET', '/gateway/auth/verify-email?token=abc'],
      ['POST', '/gateway/auth/verify-email'],
      ['POST', '/gateway/auth/resend-verification'],
      ['GET', '/gateway/invitations/accept/tok-1'],
      ['POST', '/gateway/invitations/accept/tok-1'],
    ];
    for (const [method, url] of publicUrls) {
      http.request(method, url, { body: method === 'POST' ? {} : undefined }).subscribe();
      const req = controller.expectOne(url);
      expect(req.request.headers.has('Authorization')).withContext(`${method} ${url}`).toBeFalse();
    }
  });

  it('las rutas parecidas a las públicas pero distintas sí llevan token', () => {
    tokens.set({ access_token: 'acceso-1', refresh_token: 'r', expires_in: 3599 });
    http.get('/gateway/auth/me').subscribe();
    http.get('/gateway/invitations').subscribe();

    expect(controller.expectOne('/gateway/auth/me').request.headers.get('Authorization')).toBe('Bearer acceso-1');
    expect(controller.expectOne('/gateway/invitations').request.headers.get('Authorization')).toBe('Bearer acceso-1');
  });

  it('sin token no envía la cabecera ni un "Bearer " vacío', () => {
    http.get('/gateway/journeys').subscribe();

    const req = controller.expectOne('/gateway/journeys').request;
    expect(req.headers.has('Authorization')).toBeFalse();
  });

  it('no añade Authorization a peticiones que no van al gateway', () => {
    tokens.set({ access_token: 'acceso-1', refresh_token: 'r', expires_in: 3599 });
    http.get('/otra/ruta').subscribe();
    http.get('https://otro.example/gateway/x').subscribe();
    http.get('/gatewayX/y').subscribe();

    expect(controller.expectOne('/otra/ruta').request.headers.has('Authorization')).toBeFalse();
    expect(controller.expectOne('https://otro.example/gateway/x').request.headers.has('Authorization')).toBeFalse();
    expect(controller.expectOne('/gatewayX/y').request.headers.has('Authorization')).toBeFalse();
  });
});
