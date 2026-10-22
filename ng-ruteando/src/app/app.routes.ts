import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { ADMIN_ROLES, OPERATIONS_ROLES } from './core/auth/admin-roles';

export const routes: Routes = [
  {
    // Pantallas de acceso: layout propio, sin barra ni menú lateral
    path: 'acceso',
    loadComponent: () => import('./features/access/access-layout.component').then((m) => m.AccessLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/access/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'registro',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/access/register/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'verificar-email',
        loadComponent: () =>
          import('./features/access/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
      },
      {
        path: 'recuperar',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/access/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
      },
      {
        path: 'restablecer',
        loadComponent: () =>
          import('./features/access/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
      },
    ],
  },
  {
    // Área privada: el shell (barra y menú lateral) se carga bajo demanda y exige sesión
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
      },
      {
        // Flota: tipos de vehículo, vehículos y conductores, solo para quienes administran la empresa
        path: 'flota',
        canActivate: [roleGuard(ADMIN_ROLES)],
        canActivateChild: [roleGuard(ADMIN_ROLES)],
        loadChildren: () => import('./features/fleet/fleet.routes').then((m) => m.FLEET_ROUTES),
      },
      {
        // Lugares (depósitos, almacenes, tiendas...): mismos roles que la flota
        path: 'lugares',
        canActivate: [roleGuard(ADMIN_ROLES)],
        canActivateChild: [roleGuard(ADMIN_ROLES)],
        loadChildren: () => import('./features/places/places.routes').then((m) => m.PLACES_ROUTES),
      },
      {
        // Configuraciones de planificación: las gestionan los administradores
        path: 'configuraciones',
        canActivate: [roleGuard(ADMIN_ROLES)],
        canActivateChild: [roleGuard(ADMIN_ROLES)],
        loadChildren: () => import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        // Jornadas: planificar y consultar; como los paquetes, para administradores y agentes
        path: 'jornadas',
        canActivate: [roleGuard(OPERATIONS_ROLES)],
        canActivateChild: [roleGuard(OPERATIONS_ROLES)],
        loadChildren: () => import('./features/journeys/journeys.routes').then((m) => m.JOURNEYS_ROUTES),
      },
      {
        // Paquetes: trabajo diario de administradores y agentes (el conductor no entra)
        path: 'paquetes',
        canActivate: [roleGuard(OPERATIONS_ROLES)],
        canActivateChild: [roleGuard(OPERATIONS_ROLES)],
        loadChildren: () => import('./features/packages/packages.routes').then((m) => m.PACKAGES_ROUTES),
      },
      {
        path: 'sin-permiso',
        loadComponent: () => import('./features/access/forbidden.component').then((m) => m.ForbiddenComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
