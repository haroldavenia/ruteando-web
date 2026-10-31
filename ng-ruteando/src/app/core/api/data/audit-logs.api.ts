import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL, Page, PageParams, pageParams } from '../api-config';
import { AuditLog, AuditLogPage } from '../models';

/**
 * Auditoría (solo lectura). Cada ámbito es un endpoint: `list` (la empresa, administradores), `listMine` (la propia persona),
 * `listAll` (todas las empresas, `super_admin`) y `get` (un evento). El gateway devuelve la página como `number`; aquí se entrega
 * como el `Page<T>` del resto de recursos para poder usar `FullListState`.
 */
@Injectable({ providedIn: 'root' })
export class AuditLogsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/audit-logs`;

  /** Eventos de la empresa (acceso `TENANT_ADMIN`). */
  list(params?: PageParams): Observable<Page<AuditLog>> {
    return this.page(this.baseUrl, pageParams(params));
  }

  /** Eventos de la persona con sesión; esta respuesta no trae la dirección IP. */
  listMine(params?: PageParams): Observable<Page<AuditLog>> {
    return this.page(`${this.baseUrl}/me`, pageParams(params));
  }

  /** Eventos de todas las empresas (acceso `SUPER_ADMIN`); `tenantId` los limita a una empresa y solo se envía si se indica. */
  listAll(params?: PageParams, tenantId?: string | null): Observable<Page<AuditLog>> {
    let query: HttpParams = pageParams(params);
    if (tenantId) {
      query = query.set('tenantId', tenantId);
    }
    return this.page(`${this.baseUrl}/admin`, query);
  }

  get(id: string): Observable<AuditLog> {
    return this.http.get<AuditLog>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  private page(url: string, params: HttpParams): Observable<Page<AuditLog>> {
    return this.http.get<AuditLogPage>(url, { params }).pipe(
      map(({ number, content, size, totalElements, totalPages }) => ({ content, page: number, size, totalElements, totalPages })),
    );
  }
}
