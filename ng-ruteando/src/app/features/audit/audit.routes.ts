import { Routes } from '@angular/router';

/** Auditoría es una sola pantalla: el detalle de un evento es una modal que sigue a `?evento=` en la dirección. */
export const AUDIT_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./audit-list.component').then((m) => m.AuditListComponent),
  },
];
