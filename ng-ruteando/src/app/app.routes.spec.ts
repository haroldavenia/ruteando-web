import { BreakpointObserver } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER } from 'rxjs';

import { makeUser } from '../testing/session';
import { routes } from './app.routes';
import { API_BASE_URL } from './core/api/api-config';
import { CurrentUser } from './core/auth/current-user';

describe('rutas de la aplicación', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let currentUser: CurrentUser;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: { observe: () => NEVER } },
      ],
    });
    router = TestBed.inject(Router);
    currentUser = TestBed.inject(CurrentUser);
    harness = await RouterTestingHarness.create();
  });

  const text = () => document.body.textContent ?? '';

  it('un anónimo en / va a /acceso y no ve la página de inicio ni el shell', async () => {
    await harness.navigateByUrl('/');

    expect(router.url.startsWith('/acceso')).toBeTrue();
    expect(document.querySelector('mat-toolbar')).toBeNull();
    expect(text()).not.toContain('Planificación de rutas');
  });

  it('con sesión, / muestra la página de inicio dentro del shell', async () => {
    currentUser.set(makeUser());
    await harness.navigateByUrl('/');

    expect(router.url).toBe('/');
    expect(document.querySelector('mat-toolbar')).not.toBeNull();
    expect(text()).toContain('Planificación de rutas');
  });

  it('con sesión, /acceso va a la página de inicio', async () => {
    currentUser.set(makeUser());
    await harness.navigateByUrl('/acceso');

    expect(router.url).toBe('/');
  });

  it('un anónimo en /acceso ve el layout de acceso sin shell', async () => {
    await harness.navigateByUrl('/acceso');

    expect(router.url).toBe('/acceso');
    expect(document.querySelector('app-access-layout')).not.toBeNull();
    expect(document.querySelector('mat-toolbar')).toBeNull();
    expect(document.querySelector('mat-sidenav')).toBeNull();
  });

  it('una ruta privada sin sesión conserva el destino en returnUrl', async () => {
    await harness.navigateByUrl('/sin-permiso');

    expect(router.url).toBe('/acceso?returnUrl=%2Fsin-permiso');
  });

  it('una ruta desconocida redirige a / (y un anónimo acaba en /acceso)', async () => {
    await harness.navigateByUrl('/no-existe');
    expect(router.url.startsWith('/acceso')).toBeTrue();

    currentUser.set(makeUser());
    await harness.navigateByUrl('/no-existe');
    expect(router.url).toBe('/');
  });

  it('la sesión se vuelve a comprobar en las navegaciones internas del área privada', async () => {
    currentUser.set(makeUser());
    await harness.navigateByUrl('/');
    currentUser.clear();
    await harness.navigateByUrl('/sin-permiso');

    expect(router.url).toBe('/acceso?returnUrl=%2Fsin-permiso');
  });

  describe('rutas de acceso', () => {
    const screens: [string, string][] = [
      ['/acceso', 'Iniciar sesión'],
      ['/acceso/registro', 'Crear cuenta'],
      ['/acceso/recuperar', 'Recuperar contraseña'],
      ['/acceso/verificar-email', 'Verificar correo'],
      ['/acceso/restablecer', 'Restablecer contraseña'],
    ];
    for (const [url, title] of screens) {
      it(`${url} muestra su pantalla (${title}) con el layout de acceso`, async () => {
        await harness.navigateByUrl(url);
        harness.detectChanges();

        expect(router.url).toBe(url);
        expect(document.querySelector('app-access-layout h1')?.textContent).toContain(title);
        expect(document.querySelector('mat-toolbar')).toBeNull();
      });
    }

    for (const url of ['/acceso', '/acceso/registro', '/acceso/recuperar']) {
      it(`con sesión, ${url} lleva a la página de inicio`, async () => {
        currentUser.set(makeUser());
        await harness.navigateByUrl(url);

        expect(router.url).toBe('/');
      });
    }

    it('con sesión, los enlaces de correo (verificar y restablecer) se muestran igualmente', async () => {
      currentUser.set(makeUser());

      await harness.navigateByUrl('/acceso/verificar-email');
      expect(router.url).toBe('/acceso/verificar-email');

      await harness.navigateByUrl('/acceso/restablecer?token=T');
      harness.detectChanges();
      expect(router.url.startsWith('/acceso/restablecer')).toBeTrue();
      expect(document.querySelector('app-access-layout h1')?.textContent).toContain('Restablecer contraseña');
    });
  });
});

