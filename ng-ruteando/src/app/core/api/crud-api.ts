import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL, Page, PageParams, pageParams } from './api-config';

/**
 * Base de los servicios de recursos del gateway con listado paginado y CRUD. No conoce la UI:
 * devuelve `Observable` tipados y deja los errores (`ApiError`) tal como salen de los interceptores.
 */
export abstract class CrudApi<T, TInput> {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = inject(API_BASE_URL);

  /** Ruta del recurso bajo la URL base, sin barras (`places`, `resource-types`...). */
  protected abstract readonly resource: string;

  protected url(...parts: string[]): string {
    return [this.baseUrl, this.resource, ...parts.map(encodeURIComponent)].join('/');
  }

  list(params?: PageParams): Observable<Page<T>> {
    return this.http.get<Page<T>>(this.url(), { params: pageParams(params) });
  }

  get(id: string): Observable<T> {
    return this.http.get<T>(this.url(id));
  }

  create(input: TInput): Observable<T> {
    return this.http.post<T>(this.url(), input);
  }

  update(id: string, input: Partial<TInput>): Observable<T> {
    return this.http.put<T>(this.url(id), input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.url(id));
  }
}
