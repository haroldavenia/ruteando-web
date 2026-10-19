import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api-config';
import { AssignedService, AssignedServiceInput } from '../models';

/** Servicios asignados. Sin paginar; algunas operaciones responden 202 con cuerpo vacío o `[]`. */
@Injectable({ providedIn: 'root' })
export class AssignedServicesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/assigned-services`;

  list(): Observable<AssignedService[]> {
    return this.http.get<AssignedService[]>(this.baseUrl);
  }

  get(id: string): Observable<AssignedService> {
    return this.http.get<AssignedService>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  create(input: AssignedServiceInput): Observable<AssignedService> {
    return this.http.post<AssignedService>(this.baseUrl, input);
  }

  update(id: string, input: Partial<AssignedServiceInput>): Observable<AssignedService> {
    return this.http.put<AssignedService>(`${this.baseUrl}/${encodeURIComponent(id)}`, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** Borra varios a la vez (`DELETE /assigned-services?ids=a,b`). */
  removeMany(ids: readonly string[]): Observable<unknown> {
    return this.http.delete(this.baseUrl, { params: new HttpParams().set('ids', ids.join(',')) });
  }

  summary(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/summary`);
  }
}
