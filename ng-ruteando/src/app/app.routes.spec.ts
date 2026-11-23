import { BreakpointObserver } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
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

  it('un anónimo en / va a /access y no ve la página de inicio ni el shell', async () => {
    await harness.navigateByUrl('/');

    expect(router.url.startsWith('/access')).toBeTrue();
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

  for (const [role, area, link] of [
    ['tenant_admin', 'Configuraciones', '/settings'],
    ['agent', 'Jornadas', '/journeys'],
  ] as const) {
    it(`${role} ve en el riel del shell el acceso «${area}»`, async () => {
      currentUser.set(makeUser({ role }));
      await harness.navigateByUrl('/');
      harness.detectChanges();
      const links = Array.from(document.querySelectorAll('app-nav-rail a.rail-item')).map((a) =>
        a.getAttribute('href')
      );
      expect(links).toContain(link);
    });
  }

  it('con sesión, /access va a la página de inicio', async () => {
    currentUser.set(makeUser());
    await harness.navigateByUrl('/access');

    expect(router.url).toBe('/');
  });

  it('un anónimo en /access ve el layout de acceso sin shell', async () => {
    await harness.navigateByUrl('/access');

    expect(router.url).toBe('/access');
    expect(document.querySelector('app-access-layout')).not.toBeNull();
    expect(document.querySelector('mat-toolbar')).toBeNull();
    expect(document.querySelector('mat-sidenav')).toBeNull();
  });

  it('una ruta privada sin sesión conserva el destino en returnUrl', async () => {
    await harness.navigateByUrl('/forbidden');

    expect(router.url).toBe('/access?returnUrl=%2Fforbidden');
  });

  it('una ruta desconocida redirige a / (y un anónimo acaba en /access)', async () => {
    await harness.navigateByUrl('/no-existe');
    expect(router.url.startsWith('/access')).toBeTrue();

    currentUser.set(makeUser());
    await harness.navigateByUrl('/no-existe');
    expect(router.url).toBe('/');
  });

  it('la sesión se vuelve a comprobar en las navegaciones internas del área privada', async () => {
    currentUser.set(makeUser());
    await harness.navigateByUrl('/');
    currentUser.clear();
    await harness.navigateByUrl('/forbidden');

    expect(router.url).toBe('/access?returnUrl=%2Fforbidden');
  });

  describe('rutas de acceso', () => {
    const screens: [string, string][] = [
      ['/access', 'Bienvenido de nuevo'],
      ['/access/register', 'Crea tu cuenta'],
      ['/access/recover', 'Recuperar contraseña'],
      ['/access/verify-email', 'Verificar correo'],
      ['/access/reset', 'Restablecer contraseña'],
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

    for (const url of ['/access', '/access/register', '/access/recover']) {
      it(`con sesión, ${url} lleva a la página de inicio`, async () => {
        currentUser.set(makeUser());
        await harness.navigateByUrl(url);

        expect(router.url).toBe('/');
      });
    }

    it('con sesión, los enlaces de correo (verificar y restablecer) se muestran igualmente', async () => {
      currentUser.set(makeUser());

      await harness.navigateByUrl('/access/verify-email');
      expect(router.url).toBe('/access/verify-email');

      await harness.navigateByUrl('/access/reset?token=T');
      harness.detectChanges();
      expect(router.url.startsWith('/access/reset')).toBeTrue();
      expect(document.querySelector('app-access-layout h1')?.textContent).toContain('Restablecer contraseña');
    });
  });

  describe('flota', () => {
    it('un anónimo en /fleet/vehicles va a /access recordando el destino', async () => {
      await harness.navigateByUrl('/fleet/vehicles');
      expect(router.url).toBe('/access?returnUrl=%2Ffleet%2Fvehicles');
    });

    for (const role of ['tenant_admin', 'super_admin'] as const) {
      it(`${role} entra: /fleet lleva a /fleet/vehicles dentro del shell`, async () => {
        currentUser.set(makeUser({ role }));
        await harness.navigateByUrl('/fleet');
        harness.detectChanges();

        expect(router.url).toBe('/fleet/vehicles');
        expect(document.querySelector('mat-toolbar')).not.toBeNull();
        expect(document.querySelector('app-resource-list h1')?.textContent).toContain('Vehículos');
      });
    }

    for (const role of ['agent', 'driver'] as const) {
      it(`${role} es llevado a /forbidden en cualquier ruta de /fleet`, async () => {
        currentUser.set(makeUser({ role }));
        for (const url of ['/fleet', '/fleet/types', '/fleet/vehicles/new', '/fleet/drivers']) {
          await harness.navigateByUrl(url);
          expect(router.url).withContext(url).toBe('/forbidden');
        }
      });
    }

    const screens: [string, string, string][] = [
      ['/fleet/types', 'app-resource-type-list', 'Tipos de vehículo'],
      ['/fleet/types/new', 'app-resource-type-form', 'Nuevo tipo de vehículo'],
      ['/fleet/types/abc', 'app-resource-type-form', 'Editar tipo de vehículo'],
      ['/fleet/vehicles', 'app-resource-list', 'Vehículos'],
      ['/fleet/vehicles/new', 'app-resource-form', 'Nuevo vehículo'],
      ['/fleet/vehicles/abc', 'app-resource-form', 'Editar vehículo'],
      ['/fleet/drivers', 'app-driver-list', 'Conductores'],
      ['/fleet/drivers/new', 'app-driver-form', 'Nuevo conductor'],
      ['/fleet/drivers/abc', 'app-driver-form', 'Editar conductor'],
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
    it('un anónimo en /places va a /access recordando el destino', async () => {
      await harness.navigateByUrl('/places');
      expect(router.url).toBe('/access?returnUrl=%2Fplaces');
    });

    for (const role of ['tenant_admin', 'super_admin'] as const) {
      it(`${role} entra en /places dentro del shell`, async () => {
        currentUser.set(makeUser({ role }));
        await harness.navigateByUrl('/places');
        harness.detectChanges();

        expect(router.url).toBe('/places');
        expect(document.querySelector('mat-toolbar')).not.toBeNull();
        expect(document.querySelector('app-place-list h1')?.textContent).toContain('Lugares');
      });
    }

    for (const role of ['agent', 'driver'] as const) {
      it(`${role} es llevado a /forbidden en cualquier ruta de /places`, async () => {
        currentUser.set(makeUser({ role }));
        for (const url of ['/places', '/places/new', '/places/abc']) {
          await harness.navigateByUrl(url);
          expect(router.url).withContext(url).toBe('/forbidden');
        }
      });
    }

    for (const [url, selector, title] of [
      ['/places/new', 'app-place-form', 'Nuevo lugar'],
      ['/places/abc', 'app-place-form', 'Editar lugar'],
    ]) {
      it(`${url} muestra "${title}"`, async () => {
        currentUser.set(makeUser({ role: 'tenant_admin' }));
        await harness.navigateByUrl(url);
        harness.detectChanges();
        expect(document.querySelector(`${selector} h1`)?.textContent).toContain(title);
      });
    }
  });

  describe('paquetes', () => {
    it('un anónimo en /packages va a /access recordando el destino', async () => {
      await harness.navigateByUrl('/packages');
      expect(router.url).toBe('/access?returnUrl=%2Fpackages');
    });

    for (const role of ['tenant_admin', 'super_admin', 'agent'] as const) {
      it(`${role} entra en /packages dentro del shell`, async () => {
        currentUser.set(makeUser({ role }));
        await harness.navigateByUrl('/packages');
        harness.detectChanges();

        expect(router.url).toBe('/packages');
        expect(document.querySelector('mat-toolbar')).not.toBeNull();
        expect(document.querySelector('app-package-list h1')?.textContent).toContain('Paquetes');
      });
    }

    it('/packages/import abre la importación y no se confunde con un identificador', async () => {
      currentUser.set(makeUser({ role: 'agent' }));
      await harness.navigateByUrl('/packages/import');
      harness.detectChanges();
      expect(router.url).toBe('/packages/import');
      expect(document.querySelector('app-package-import h1')?.textContent).toContain('Importar paquetes');
      expect(document.querySelector('app-package-form')).toBeNull();
    });

    it('un anónimo en /packages/import va a /access recordando el destino', async () => {
      await harness.navigateByUrl('/packages/import');
      expect(router.url).toBe('/access?returnUrl=%2Fpackages%2Fimport');
    });

    it('driver es llevado a /forbidden en cualquier ruta de /packages', async () => {
      currentUser.set(makeUser({ role: 'driver' }));
      for (const url of ['/packages', '/packages/new', '/packages/import', '/packages/abc']) {
        await harness.navigateByUrl(url);
        expect(router.url).withContext(url).toBe('/forbidden');
      }
    });

    for (const [url, title] of [
      ['/packages/new', 'Nuevo paquete'],
      ['/packages/abc', 'Editar paquete'],
    ]) {
      it(`${url} muestra "${title}"`, async () => {
        currentUser.set(makeUser({ role: 'agent' }));
        await harness.navigateByUrl(url);
        harness.detectChanges();
        expect(document.querySelector('app-package-form h1')?.textContent).toContain(title);
      });
    }

    it('un agente no puede entrar en flota ni en lugares', async () => {
      currentUser.set(makeUser({ role: 'agent' }));
      for (const url of ['/fleet/vehicles', '/places']) {
        await harness.navigateByUrl(url);
        expect(router.url).withContext(url).toBe('/forbidden');
      }
    });
  });

  describe('configuraciones', () => {
    it('un anónimo en /settings va a /access recordando el destino', async () => {
      await harness.navigateByUrl('/settings');
      expect(router.url).toBe('/access?returnUrl=%2Fsettings');
    });

    for (const role of ['tenant_admin', 'super_admin'] as const) {
      it(`${role} entra en /settings dentro del shell`, async () => {
        currentUser.set(makeUser({ role }));
        await harness.navigateByUrl('/settings');
        harness.detectChanges();

        expect(router.url).toBe('/settings');
        expect(document.querySelector('mat-toolbar')).not.toBeNull();
        expect(document.querySelector('app-settings-list h1')?.textContent).toContain('Configuraciones');
      });
    }

    for (const role of ['agent', 'driver'] as const) {
      it(`${role} es llevado a /forbidden en cualquier ruta de /settings`, async () => {
        currentUser.set(makeUser({ role }));
        for (const url of ['/settings', '/settings/new', '/settings/abc']) {
          await harness.navigateByUrl(url);
          expect(router.url).withContext(url).toBe('/forbidden');
        }
      });
    }

    for (const [url, title] of [
      ['/settings/new', 'Nueva configuración'],
      ['/settings/abc', 'Editar configuración'],
    ]) {
      it(`${url} muestra "${title}"`, async () => {
        currentUser.set(makeUser({ role: 'tenant_admin' }));
        await harness.navigateByUrl(url);
        harness.detectChanges();
        expect(document.querySelector('app-settings-form h1')?.textContent).toContain(title);
      });
    }
  });

  describe('jornadas', () => {
    it('un anónimo en /journeys va a /access recordando el destino', async () => {
      await harness.navigateByUrl('/journeys');
      expect(router.url).toBe('/access?returnUrl=%2Fjourneys');
    });

    for (const role of ['tenant_admin', 'super_admin', 'agent'] as const) {
      it(`${role} entra en /journeys dentro del shell`, async () => {
        currentUser.set(makeUser({ role }));
        await harness.navigateByUrl('/journeys');
        harness.detectChanges();

        expect(router.url).toBe('/journeys');
        expect(document.querySelector('mat-toolbar')).not.toBeNull();
        expect(document.querySelector('app-journey-list h1')?.textContent).toContain('Jornadas');
      });
    }

    it('driver es llevado a /forbidden en cualquier ruta de /journeys', async () => {
      currentUser.set(makeUser({ role: 'driver' }));
      for (const url of ['/journeys', '/journeys/new', '/journeys/abc', '/journeys/abc/routes/0']) {
        await harness.navigateByUrl(url);
        expect(router.url).withContext(url).toBe('/forbidden');
      }
    });

    for (const [url, selector, title] of [
      ['/journeys/new', 'app-journey-form', 'Planificar jornada'],
      ['/journeys/abc', 'app-journey-detail', 'Jornada'],
      ['/journeys/abc/routes/0', 'app-route-detail', 'Ruta'],
    ]) {
      it(`${url} muestra "${title}"`, async () => {
        currentUser.set(makeUser({ role: 'agent' }));
        await harness.navigateByUrl(url);
        harness.detectChanges();
        expect(document.querySelector(`${selector} h1`)?.textContent).toContain(title);
      });
    }
  });

  describe('detalle de ruta', () => {
    it('un anónimo en /journeys/:id/routes/:routeIndex va a /access recordando el destino', async () => {
      await harness.navigateByUrl('/journeys/abc/routes/0');
      expect(router.url).toBe('/access?returnUrl=%2Fjourneys%2Fabc%2Froutes%2F0');
    });

    for (const role of ['tenant_admin', 'super_admin', 'agent'] as const) {
      it(`${role} abre el detalle de una ruta dentro del shell`, async () => {
        currentUser.set(makeUser({ role }));
        await harness.navigateByUrl('/journeys/abc/routes/0');
        harness.detectChanges();
        expect(router.url).toBe('/journeys/abc/routes/0');
        expect(document.querySelector('mat-toolbar')).not.toBeNull();
        expect(document.querySelector('app-route-detail')).not.toBeNull();
      });
    }
  });

  describe('zonas', () => {
    it('un anónimo en /zones va a /access recordando el destino', async () => {
      await harness.navigateByUrl('/zones');
      expect(router.url).toBe('/access?returnUrl=%2Fzones');
    });

    for (const role of ['tenant_admin', 'super_admin'] as const) {
      it(`${role} entra en /zones dentro del shell`, async () => {
        currentUser.set(makeUser({ role }));
        await harness.navigateByUrl('/zones');
        harness.detectChanges();

        expect(router.url).toBe('/zones');
        expect(document.querySelector('mat-toolbar')).not.toBeNull();
        expect(document.querySelector('app-zone-list h1')?.textContent).toContain('Zonas');
      });
    }

    for (const role of ['agent', 'driver'] as const) {
      it(`${role} es llevado a /forbidden en cualquier ruta de /zones`, async () => {
        currentUser.set(makeUser({ role }));
        for (const url of ['/zones', '/zones/new', '/zones/abc']) {
          await harness.navigateByUrl(url);
          expect(router.url).withContext(url).toBe('/forbidden');
        }
      });
    }

    for (const [url, title] of [
      ['/zones/new', 'Nueva zona'],
      ['/zones/abc', 'Editar zona'],
    ]) {
      it(`${url} muestra "${title}"`, async () => {
        currentUser.set(makeUser({ role: 'tenant_admin' }));
        await harness.navigateByUrl(url);
        harness.detectChanges();
        expect(document.querySelector('app-zone-form h1')?.textContent).toContain(title);
      });
    }
  });
});
