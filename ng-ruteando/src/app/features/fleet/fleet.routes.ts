import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../shared/data/unsaved-changes.guard';

export const FLEET_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'vehiculos' },
  {
    path: 'tipos',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./resource-types/resource-type-list.component').then((m) => m.ResourceTypeListComponent),
      },
      {
        path: 'nuevo',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./resource-types/resource-type-form.component').then((m) => m.ResourceTypeFormComponent),
      },
      {
        path: ':id',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./resource-types/resource-type-form.component').then((m) => m.ResourceTypeFormComponent),
      },
    ],
  },
  {
    path: 'vehiculos',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./resources/resource-list.component').then((m) => m.ResourceListComponent),
      },
      {
        path: 'nuevo',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./resources/resource-form.component').then((m) => m.ResourceFormComponent),
      },
      {
        path: ':id',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./resources/resource-form.component').then((m) => m.ResourceFormComponent),
      },
    ],
  },
  {
    path: 'conductores',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./drivers/driver-list.component').then((m) => m.DriverListComponent),
      },
      {
        path: 'nuevo',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./drivers/driver-form.component').then((m) => m.DriverFormComponent),
      },
      {
        path: ':id',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./drivers/driver-form.component').then((m) => m.DriverFormComponent),
      },
    ],
  },
];
