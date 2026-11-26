import { Routes } from '@angular/router';

export const CATALOGS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./catalog-list.component').then((m) => m.CatalogListComponent),
  },
  {
    path: ':code',
    loadComponent: () => import('./catalog-detail.component').then((m) => m.CatalogDetailComponent),
  },
];
