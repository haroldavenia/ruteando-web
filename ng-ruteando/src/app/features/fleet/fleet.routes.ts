import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../shared/data/unsaved-changes.guard';

export const FLEET_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'vehicles' },
  {
    path: 'types',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./resource-types/resource-type-list.component').then((m) => m.ResourceTypeListComponent),
      },
      {
        path: 'new',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./resource-types/resource-type-form.component').then((m) => m.ResourceTypeFormComponent),
      },
      {
        path: ':id',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./resource-types/resource-type-form.component').then((m) => m.ResourceTypeFormComponent),
      },
    ],
  },
  {
    path: 'vehicles',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./resources/resource-list.component').then((m) => m.ResourceListComponent),
      },
      {
        path: 'new',
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
    path: 'drivers',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./drivers/driver-list.component').then((m) => m.DriverListComponent),
      },
      {
        path: 'new',
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
