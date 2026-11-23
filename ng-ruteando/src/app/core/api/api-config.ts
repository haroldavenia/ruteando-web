import { HttpParams } from '@angular/common/http';
import { InjectionToken } from '@angular/core';

/** URL base de la API (`/gateway`), tomada del entorno y provista en `app.config.ts`. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/** Página de resultados del gateway. `page` empieza en 0. */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageParams {
  /** Índice de página desde 0. */
  page?: number;
  size?: number;
}

/** Parámetros de consulta `page` y `size` de una petición paginada. */
export function pageParams({ page = 0, size = 20 }: PageParams = {}): HttpParams {
  return new HttpParams().set('page', page).set('size', size);
}
