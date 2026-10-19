import { Routes } from '@angular/router';

import { guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'acceso',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/access/access-placeholder.component').then((m) => m.AccessPlaceholderComponent),
  },
  {
    path: 'sin-permiso',
    loadComponent: () => import('./features/access/forbidden.component').then((m) => m.ForbiddenComponent),
  },
  { path: '**', redirectTo: '' },
];
