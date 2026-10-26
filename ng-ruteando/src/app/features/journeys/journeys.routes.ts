import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../shared/data/unsaved-changes.guard';

export const JOURNEYS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./journey-list.component').then((m) => m.JourneyListComponent),
  },
  {
    path: 'nueva',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./journey-form.component').then((m) => m.JourneyFormComponent),
  },
  {
    path: ':id/rutas/:routeIndex',
    loadComponent: () => import('./route-detail.component').then((m) => m.RouteDetailComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./journey-detail.component').then((m) => m.JourneyDetailComponent),
  },
];
