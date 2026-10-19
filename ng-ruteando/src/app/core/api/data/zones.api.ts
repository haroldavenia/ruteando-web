import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TenantContext } from '../../auth/tenant-context';
import { LatLng } from '../../geo/lat-lng';
import { API_BASE_URL } from '../api-config';
import { Zone, ZoneInput } from '../models';

/** Zonas del tenant. El gateway las devuelve sin paginar y exige `tenantId` en casi todas las operaciones. */
@Injectable({ providedIn: 'root' })
export class ZonesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/zones`;
  private readonly tenant = inject(TenantContext);

  private tenantParams(tenantId: string): HttpParams {
    return new HttpParams().set('tenantId', tenantId);
  }

  list(): Observable<Zone[]> {
    return this.tenant.withTenant((tenantId) => this.http.get<Zone[]>(this.baseUrl, { params: this.tenantParams(tenantId) }));
  }

  get(id: string): Observable<Zone> {
    return this.tenant.withTenant((tenantId) =>
      this.http.get<Zone>(`${this.baseUrl}/${encodeURIComponent(id)}`, { params: this.tenantParams(tenantId) }),
    );
  }

  create(input: ZoneInput): Observable<Zone> {
    return this.tenant.withTenant((tenantId) => this.http.post<Zone>(this.baseUrl, input, { params: this.tenantParams(tenantId) }));
  }

  update(id: string, input: Partial<ZoneInput>): Observable<Zone> {
    return this.tenant.withTenant((tenantId) =>
      this.http.put<Zone>(`${this.baseUrl}/${encodeURIComponent(id)}`, input, { params: this.tenantParams(tenantId) }),
    );
  }

  remove(id: string): Observable<void> {
    return this.tenant.withTenant((tenantId) =>
      this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`, { params: this.tenantParams(tenantId) }),
    );
  }

  /** Zonas que contienen un punto (no lleva `tenantId`). */
  containing(point: LatLng): Observable<Zone[]> {
    const params = new HttpParams().set('longitude', point.lng).set('latitude', point.lat);
    return this.http.get<Zone[]>(`${this.baseUrl}/containing`, { params });
  }
}
