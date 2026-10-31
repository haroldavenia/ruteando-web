import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, Route, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { makeUser } from '../../../testing/session';
import { routes } from '../../app.routes';
import { CurrentUser } from '../../core/auth/current-user';
import { UserRole } from '../../core/auth/session.model';

import { AUDIT_ROUTES } from './audit.routes';

describe('rutas de auditoría', () => {
  const shell = routes.find((route) => route.path === '' && route.children)!;
  const audit = shell.children!.find((route) => route.path === 'auditoria') as Route;
  const state = { url: '/auditoria' } as RouterStateSnapshot;

  const guard = (fn: CanActivateFn | CanActivateChildFn | undefined, role: UserRole | null): boolean | UrlTree => {
    const current = TestBed.inject(CurrentUser);
    if (role) {
      current.set(makeUser({ role }));
    }
    return TestBed.runInInjectionContext(() => fn!({} as ActivatedRouteSnapshot, state)) as boolean | UrlTree;
  };

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('está en el área privada, diferida y protegida por rol tanto en la ruta como en sus hijas', () => {
    expect(audit).toBeDefined();
    expect(audit.canActivate?.length).toBe(1);
    expect(audit.canActivateChild?.length).toBe(1);
    expect(audit.loadChildren).toBeDefined();
  });

  it('administradores y agentes entran', () => {
    for (const role of ['tenant_admin', 'super_admin', 'agent'] as const) {
      expect(guard(audit.canActivate![0] as CanActivateFn, role)).withContext(role).toBeTrue();
      expect(guard(audit.canActivateChild![0] as CanActivateChildFn, role)).withContext(role).toBeTrue();
    }
  });

  it('el conductor va a /sin-permiso', () => {
    const result = guard(audit.canActivate![0] as CanActivateFn, 'driver') as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/sin-permiso');
  });

  it('sin sesión va a /acceso recordando a dónde iba', () => {
    const result = guard(audit.canActivate![0] as CanActivateFn, null) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/acceso?returnUrl=%2Fauditoria');
  });

  it('es una sola pantalla, diferida: el detalle de un evento es una modal, no otra ruta', async () => {
    expect(AUDIT_ROUTES.map((route) => route.path)).toEqual(['']);
    const list = await (AUDIT_ROUTES[0].loadComponent as () => Promise<unknown>)();
    expect((list as { name: string }).name).toBe('AuditListComponent');
  });
});
