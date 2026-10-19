import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { CurrentUser } from './current-user';
import { UserRole } from './session.model';

/** Solo usuarios con sesión; el resto va a `/acceso` recordando a dónde iban. */
export const authGuard: CanActivateFn = (_route, state) => {
  const user = inject(CurrentUser);
  const router = inject(Router);
  return user.isAuthenticated() ? true : router.createUrlTree(['/acceso'], { queryParams: { returnUrl: state.url } });
};

/** Solo usuarios con sesión y con alguno de los roles indicados; con otro rol van a `/sin-permiso`. */
export function roleGuard(roles: readonly UserRole[]): CanActivateFn {
  return (_route, state) => {
    const user = inject(CurrentUser);
    const router = inject(Router);
    if (!user.isAuthenticated()) {
      return router.createUrlTree(['/acceso'], { queryParams: { returnUrl: state.url } });
    }
    const role = user.role();
    return role !== null && roles.includes(role) ? true : router.createUrlTree(['/sin-permiso']);
  };
}

/** Para `/acceso`: quien ya tiene sesión va a la página de inicio. */
export const guestGuard: CanActivateFn = () => {
  const user = inject(CurrentUser);
  const router = inject(Router);
  return user.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
