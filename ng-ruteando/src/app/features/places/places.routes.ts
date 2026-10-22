import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../shared/data/unsaved-changes.guard';

export const PLACES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./place-list.component').then((m) => m.PlaceListComponent),
  },
  {
    path: 'nuevo',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./place-form.component').then((m) => m.PlaceFormComponent),
  },
  {
    path: ':id',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./place-form.component').then((m) => m.PlaceFormComponent),
  },
];
