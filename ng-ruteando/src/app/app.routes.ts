import { Route, Routes } from '@angular/router';

import { ADMIN_ROLES, OPERATIONS_ROLES } from './core/auth/admin-roles';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { LEGAL_DOCS } from './features/legal/legal-docs';
import { LEGACY_REDIRECT } from './legacy-redirects';

export const routes: Routes = [
  // Direcciones en español de versiones anteriores: se reenvían a las actuales
  LEGACY_REDIRECT,
  {
    // Pantallas de acceso: layout propio, sin barra ni menú lateral
    path: 'access',
    loadComponent: () => import('./features/access/access-layout.component').then((m) => m.AccessLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/access/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        // En el diseño ancho, la presentación son los pasos hasta la primera jornada
        data: { pitch: 'steps' },
        canActivate: [guestGuard],
        loadComponent: () => import('./features/access/register/register.component').then((m) => m.RegisterComponent),
      },
      {
        // Regreso del inicio de sesión único (#ticket=… o #error=…); sin guard: la persona puede traer una sesión abierta
        path: 'sso',
        loadComponent: () => import('./features/access/sso/sso-complete.component').then((m) => m.SsoCompleteComponent),
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./features/access/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
      },
      {
        path: 'recover',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/access/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
      },
      {
        path: 'reset',
        loadComponent: () =>
          import('./features/access/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
      },
    ],
  },
  // Documentos legales (privacidad, términos, SMS): públicos, con su propio marco; se enlazan desde el pie del acceso
  ...LEGAL_DOCS.map((doc): Route => ({
    path: `legal/${doc}`,
    data: { doc },
    loadComponent: () => import('./features/legal/legal-page.component').then((m) => m.LegalPageComponent),
  })),
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
        path: 'fleet',
        canActivate: [roleGuard(ADMIN_ROLES)],
        canActivateChild: [roleGuard(ADMIN_ROLES)],
        loadChildren: () => import('./features/fleet/fleet.routes').then((m) => m.FLEET_ROUTES),
      },
      {
        // Lugares (depósitos, almacenes, tiendas...): mismos roles que la flota
        path: 'places',
        canActivate: [roleGuard(ADMIN_ROLES)],
        canActivateChild: [roleGuard(ADMIN_ROLES)],
        loadChildren: () => import('./features/places/places.routes').then((m) => m.PLACES_ROUTES),
      },
      {
        // Configuraciones de planificación: las gestionan los administradores
        path: 'settings',
        canActivate: [roleGuard(ADMIN_ROLES)],
        canActivateChild: [roleGuard(ADMIN_ROLES)],
        loadChildren: () => import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        // Zonas (áreas con polígono): las gestionan los administradores
        path: 'zones',
        canActivate: [roleGuard(ADMIN_ROLES)],
        canActivateChild: [roleGuard(ADMIN_ROLES)],
        loadChildren: () => import('./features/zones/zones.routes').then((m) => m.ZONES_ROUTES),
      },
      {
        // Jornadas: planificar y consultar; como los paquetes, para administradores y agentes
        path: 'journeys',
        canActivate: [roleGuard(OPERATIONS_ROLES)],
        canActivateChild: [roleGuard(OPERATIONS_ROLES)],
        loadChildren: () => import('./features/journeys/journeys.routes').then((m) => m.JOURNEYS_ROUTES),
      },
      {
        // Paquetes: trabajo diario de administradores y agentes (el conductor no entra)
        path: 'packages',
        canActivate: [roleGuard(OPERATIONS_ROLES)],
        canActivateChild: [roleGuard(OPERATIONS_ROLES)],
        loadChildren: () => import('./features/packages/packages.routes').then((m) => m.PACKAGES_ROUTES),
      },
      {
        // Auditoría: qué se hizo, quién y cuándo. Administradores y agentes; cada rol ve los eventos que el gateway le permite
        path: 'audit',
        canActivate: [roleGuard(OPERATIONS_ROLES)],
        canActivateChild: [roleGuard(OPERATIONS_ROLES)],
        loadChildren: () => import('./features/audit/audit.routes').then((m) => m.AUDIT_ROUTES),
      },
      {
        // Seguridad de la empresa (métodos de segundo factor y si es obligatorio): solo administradores
        path: 'security',
        canActivate: [roleGuard(ADMIN_ROLES)],
        loadComponent: () => import('./features/security/security.component').then((m) => m.SecurityComponent),
      },
      {
        // Perfil: los datos de la propia persona y su verificación en dos pasos; cualquier rol con sesión
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'forbidden',
        loadComponent: () => import('./features/access/forbidden.component').then((m) => m.ForbiddenComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
