import { Location } from '@angular/common';
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
import { SsoButtonsComponent } from './sso-buttons.component';
import { SsoCompleteComponent } from './sso-complete.component';
import { rememberSsoReturn, takeSsoReturn } from './sso-return';

@Component({ template: 'destino' })
class DestinoComponent {}

@Component({ imports: [SsoButtonsComponent], template: '<app-sso-buttons returnUrl="/journeys" />' })
class HostComponent {}

const KEY = 'ruteando-sso-return';

function configure(routes: Parameters<typeof provideRouter>[0]): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideNoopAnimations(),
      { provide: API_BASE_URL, useValue: '/gateway' },
      provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
}

describe('destino guardado del SSO', () => {
  afterEach(() => sessionStorage.clear());

  it('se guarda, se valida con safeReturnUrl al leerlo y se olvida', () => {
    rememberSsoReturn('/journeys?x=1');
    expect(takeSsoReturn()).toBe('/journeys?x=1');
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(takeSsoReturn()).toBe('/');
  });

  it('una dirección externa no se acepta', () => {
    rememberSsoReturn('//evil.example');
    expect(takeSsoReturn()).toBe('/');
    rememberSsoReturn('https://evil.example');
    expect(takeSsoReturn()).toBe('/');
  });

  it('sin destino borra el anterior', () => {
    rememberSsoReturn('/journeys');
    rememberSsoReturn(null);
    expect(takeSsoReturn()).toBe('/');
  });
});

describe('SsoButtonsComponent', () => {
  let controller: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    configure([]);
    controller = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    sessionStorage.clear();
    controller.verify();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('sin proveedores (SSO apagado) no pinta nada', async () => {
    const root = render();
    controller.expectOne('/gateway/sso/providers').flush({ providers: [] });
    await Promise.resolve();
    expect(root.querySelector('.sso')).toBeNull();
  });

  it('si la lista falla tampoco pinta nada', () => {
    const root = render();
    controller.expectOne('/gateway/sso/providers').flush({ message: 'x' }, { status: 503, statusText: 'x' });
    expect(root.querySelector('.sso')).toBeNull();
  });

  it('un enlace por proveedor hacia el servidor, y al pulsar guarda el destino', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    controller.expectOne('/gateway/sso/providers').flush({
      providers: [
        { id: 'google', label: 'Google' },
        { id: 'github', label: 'GitHub' },
      ],
    });
    fixture.detectChanges();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/gateway/sso/google/start',
      '/gateway/sso/github/start',
    ]);
    expect(links[0].textContent).toContain('Continuar con Google');

    links[0].addEventListener('click', (e) => e.preventDefault()); // sin navegar de verdad
    links[0].click();
    expect(sessionStorage.getItem(KEY)).toBe('/journeys');
  });

  it('el SSO de empresa pide primero el correo y no navega con uno inválido', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    controller.expectOne('/gateway/sso/providers').flush({ providers: [{ id: 'enterprise', label: 'SSO' }] });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('input')).toBeNull();
    (root.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const input = root.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = 'no-es-correo';
    input.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(root.querySelector('mat-error')).not.toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull(); // no llegó a navegar
  });
});

describe('SsoCompleteComponent', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let controller: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    configure([
      { path: 'access/sso', component: SsoCompleteComponent },
      { path: 'access', component: DestinoComponent },
      { path: 'journeys', component: DestinoComponent },
      { path: '', pathMatch: 'full', component: DestinoComponent },
    ]);
    router = TestBed.inject(Router);
    controller = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    controller.verify();
  });

  it('canjea el ticket, abre la sesión y va al destino guardado; el ticket sale de la dirección', async () => {
    rememberSsoReturn('/journeys');
    await harness.navigateByUrl('/access/sso#ticket=abc123');
    const req = controller.expectOne('/gateway/sso/complete');
    expect(req.request.body).toEqual({ ticket: 'abc123' });
    req.flush(makeSession());
    await harness.fixture.whenStable();

    expect(TestBed.inject(CurrentUser).user()?.email).toBe('persona@example.invalid');
    expect(router.url).toBe('/journeys');
  });

  it('un código de error del regreso se explica y no pide nada al servidor', async () => {
    await harness.navigateByUrl('/access/sso#error=NO_ACCOUNT');
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('No hay una cuenta con ese correo');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/access');
    expect(TestBed.inject(CurrentUser).user()).toBeNull();
    expect(TestBed.inject(Location).path()).toBe('/access/sso'); // el fragmento se quitó de la barra
  });

  it('un ticket caducado muestra el error del servidor', async () => {
    await harness.navigateByUrl('/access/sso#ticket=viejo');
    controller
      .expectOne('/gateway/sso/complete')
      .flush({ code: 'TICKET_EXPIRED', message: 'x' }, { status: 401, statusText: 'x' });
    harness.detectChanges();
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('caducó');
    expect(TestBed.inject(CurrentUser).user()).toBeNull();
  });

  it('con segundo factor no abre la sesión: muestra el reto', async () => {
    await harness.navigateByUrl('/access/sso#ticket=abc');
    controller.expectOne('/gateway/sso/complete').flush({
      mfaRequired: true,
      challengeId: 'c1',
      methods: [{ method: 'totp', destination: null }],
      expiresInSeconds: 300,
    });
    harness.detectChanges();
    expect(TestBed.inject(CurrentUser).user()).toBeNull();
    expect((harness.routeNativeElement as HTMLElement).querySelector('app-mfa-verify-step')).not.toBeNull();
  });
});
