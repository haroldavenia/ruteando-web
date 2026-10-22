import { BreakpointObserver } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER } from 'rxjs';

import { TEST_MAP_CONFIG } from '../testing/map';
import { makeUser } from '../testing/session';
import { routes } from './app.routes';
import { API_BASE_URL } from './core/api/api-config';
import { CurrentUser } from './core/auth/current-user';
import { MAP_CONFIG } from './shared/map/map-config';

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
        { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG },
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

  describe('flota', () => {
    it('un anónimo en /flota/vehiculos va a /acceso recordando el destino', async () => {
      await harness.navigateByUrl('/flota/vehiculos');
      expect(router.url).toBe('/acceso?returnUrl=%2Fflota%2Fvehiculos');
    });

    for (const role of ['tenant_admin', 'super_admin'] as const) {
      it(`${role} entra: /flota lleva a /flota/vehiculos dentro del shell`, async () => {
        currentUser.set(makeUser({ role }));
        await harness.navigateByUrl('/flota');
        harness.detectChanges();

        expect(router.url).toBe('/flota/vehiculos');
        expect(document.querySelector('mat-toolbar')).not.toBeNull();
        expect(document.querySelector('app-resource-list h1')?.textContent).toContain('Vehículos');
      });
    }

    for (const role of ['agent', 'driver'] as const) {
      it(`${role} es llevado a /sin-permiso en cualquier ruta de /flota`, async () => {
        currentUser.set(makeUser({ role }));
        for (const url of ['/flota', '/flota/tipos', '/flota/vehiculos/nuevo', '/flota/conductores']) {
          await harness.navigateByUrl(url);
          expect(router.url).withContext(url).toBe('/sin-permiso');
        }
      });
    }

    const screens: [string, string, string][] = [
      ['/flota/tipos', 'app-resource-type-list', 'Tipos de vehículo'],
      ['/flota/tipos/nuevo', 'app-resource-type-form', 'Nuevo tipo de vehículo'],
      ['/flota/tipos/abc', 'app-resource-type-form', 'Editar tipo de vehículo'],
      ['/flota/vehiculos', 'app-resource-list', 'Vehículos'],
      ['/flota/vehiculos/nuevo', 'app-resource-form', 'Nuevo vehículo'],
      ['/flota/vehiculos/abc', 'app-resource-form', 'Editar vehículo'],
      ['/flota/conductores', 'app-driver-list', 'Conductores'],
      ['/flota/conductores/nuevo', 'app-driver-form', 'Nuevo conductor'],
      ['/flota/conductores/abc', 'app-driver-form', 'Editar conductor'],
    ];
    for (const [url, selector, title] of screens) {
      it(`${url} muestra "${title}"`, async () => {
        currentUser.set(makeUser({ role: 'tenant_admin' }));
        await harness.navigateByUrl(url);
        harness.detectChanges();

        expect(router.url).toBe(url);
        expect(document.querySelector(`${selector} h1`)?.textContent).toContain(title);
      });
    }
  });

  describe('lugares', () => {
    it('un anónimo en /lugares va a /acceso recordando el destino', async () => {
      await harness.navigateByUrl('/lugares');
      expect(router.url).toBe('/acceso?returnUrl=%2Flugares');
    });

    for (const role of ['tenant_admin', 'super_admin'] as const) {
      it(`${role} entra en /lugares dentro del shell`, async () => {
        currentUser.set(makeUser({ role }));
        await harness.navigateByUrl('/lugares');
        harness.detectChanges();

        expect(router.url).toBe('/lugares');
        expect(document.querySelector('mat-toolbar')).not.toBeNull();
        expect(document.querySelector('app-place-list h1')?.textContent).toContain('Lugares');
      });
    }

    for (const role of ['agent', 'driver'] as const) {
      it(`${role} es llevado a /sin-permiso en cualquier ruta de /lugares`, async () => {
        currentUser.set(makeUser({ role }));
        for (const url of ['/lugares', '/lugares/nuevo', '/lugares/abc']) {
          await harness.navigateByUrl(url);
          expect(router.url).withContext(url).toBe('/sin-permiso');
        }
      });
    }

    for (const [url, selector, title] of [
      ['/lugares/nuevo', 'app-place-form', 'Nuevo lugar'],
      ['/lugares/abc', 'app-place-form', 'Editar lugar'],
    ]) {
      it(`${url} muestra "${title}"`, async () => {
        currentUser.set(makeUser({ role: 'tenant_admin' }));
        await harness.navigateByUrl(url);
        harness.detectChanges();
        expect(document.querySelector(`${selector} h1`)?.textContent).toContain(title);
      });
    }
  });
});
