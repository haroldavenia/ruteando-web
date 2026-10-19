import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { makeUser } from '../../../testing/session';
import { authGuard, guestGuard, roleGuard } from './auth.guards';
import { CurrentUser } from './current-user';

@Component({ template: '<p id="pagina">contenido</p>' })
class PaginaComponent {}

describe('guards de acceso', () => {
  let router: Router;
  let currentUser: CurrentUser;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', component: PaginaComponent },
          { path: 'acceso', canActivate: [guestGuard], component: PaginaComponent },
          { path: 'sin-permiso', component: PaginaComponent },
          { path: 'journeys', canActivate: [authGuard], component: PaginaComponent },
          { path: 'admin', canActivate: [roleGuard(['tenant_admin', 'super_admin'])], component: PaginaComponent },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    currentUser = TestBed.inject(CurrentUser);
    harness = await RouterTestingHarness.create();
  });

  describe('authGuard', () => {
    it('un usuario anónimo va a /acceso con la ruta de origen en returnUrl', async () => {
      await harness.navigateByUrl('/journeys');

      expect(router.url).toBe('/acceso?returnUrl=%2Fjourneys');
    });

    it('un usuario con sesión ve la ruta protegida', async () => {
      currentUser.set(makeUser());
      await harness.navigateByUrl('/journeys');

      expect(router.url).toBe('/journeys');
    });

    it('conserva en returnUrl la consulta de la ruta de origen', async () => {
      await harness.navigateByUrl('/journeys?page=2');

      expect(router.url).toBe('/acceso?returnUrl=%2Fjourneys%3Fpage%3D2');
    });
  });

  describe('roleGuard', () => {
    it('un rol permitido ve la ruta', async () => {
      currentUser.set(makeUser({ role: 'tenant_admin' }));
      await harness.navigateByUrl('/admin');

      expect(router.url).toBe('/admin');
    });

    it('un rol no permitido va a /sin-permiso y no carga el contenido de la ruta', async () => {
      currentUser.set(makeUser({ role: 'driver' }));
      await harness.navigateByUrl('/admin');

      expect(router.url).toBe('/sin-permiso');
    });

    it('un usuario anónimo va a /acceso con returnUrl', async () => {
      await harness.navigateByUrl('/admin');

      expect(router.url).toBe('/acceso?returnUrl=%2Fadmin');
    });

    it('usa el rol de la sesión nueva tras cerrar una y abrir otra', async () => {
      currentUser.set(makeUser({ role: 'driver' }));
      await harness.navigateByUrl('/admin');
      expect(router.url).toBe('/sin-permiso');

      currentUser.clear();
      currentUser.set(makeUser({ role: 'super_admin' }));
      await harness.navigateByUrl('/admin');

      expect(router.url).toBe('/admin');
    });
  });

  describe('guestGuard', () => {
    it('un usuario anónimo ve /acceso', async () => {
      await harness.navigateByUrl('/acceso');

      expect(router.url).toBe('/acceso');
    });

    it('un usuario con sesión que abre /acceso va a la página de inicio', async () => {
      currentUser.set(makeUser());
      await harness.navigateByUrl('/acceso');

      expect(router.url).toBe('/');
    });
  });

  it('las redirecciones no entran en bucle: de ruta protegida a /acceso se queda en /acceso', async () => {
    await harness.navigateByUrl('/journeys');
    expect(router.url.startsWith('/acceso')).toBeTrue();
    expect(router.url).not.toContain('returnUrl=%2Facceso');
  });
});
