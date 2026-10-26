import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../shared/data/unsaved-changes.guard';

export const PACKAGES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./package-list.component').then((m) => m.PackageListComponent),
  },
  {
    path: 'nuevo',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./package-form.component').then((m) => m.PackageFormComponent),
  },
  {
    // Antes de `:id`, que si no la tomaría por un identificador
    path: 'importar',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./import/package-import.component').then((m) => m.PackageImportComponent),
  },
  {
    path: ':id',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./package-form.component').then((m) => m.PackageFormComponent),
  },
];
