import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../shared/data/unsaved-changes.guard';

export const ASSIGNED_SERVICES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./assigned-service-list.component').then((m) => m.AssignedServiceListComponent),
  },
  {
    path: 'map',
    loadComponent: () => import('./assigned-services-map.component').then((m) => m.AssignedServicesMapComponent),
  },
  {
    path: 'new',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./assigned-service-form.component').then((m) => m.AssignedServiceFormComponent),
  },
  {
    path: ':id',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./assigned-service-form.component').then((m) => m.AssignedServiceFormComponent),
  },
];
