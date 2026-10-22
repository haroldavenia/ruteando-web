import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../shared/data/unsaved-changes.guard';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./settings-list.component').then((m) => m.SettingsListComponent),
  },
  {
    path: 'nuevo',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./settings-form.component').then((m) => m.SettingsFormComponent),
  },
  {
    path: ':id',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./settings-form.component').then((m) => m.SettingsFormComponent),
  },
];
