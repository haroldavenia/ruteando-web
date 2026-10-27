import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../shared/data/unsaved-changes.guard';

export const ZONES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./zone-list.component').then((m) => m.ZoneListComponent),
  },
  {
    path: 'nueva',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./zone-form.component').then((m) => m.ZoneFormComponent),
  },
  {
    path: ':id',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./zone-form.component').then((m) => m.ZoneFormComponent),
  },
];
