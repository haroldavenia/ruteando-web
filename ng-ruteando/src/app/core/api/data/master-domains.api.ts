import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api-config';
import { MasterDomain, MasterDomainValue, MasterDomainValueInput } from '../models';

@Injectable({ providedIn: 'root' })
export class MasterDomainsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/master-domains`;

  private url(...parts: string[]): string {
    return [this.baseUrl, ...parts.map(encodeURIComponent)].join('/');
  }

  list(): Observable<MasterDomain[]> {
    return this.http.get<MasterDomain[]>(this.baseUrl);
  }

  get(code: string): Observable<MasterDomain> {
    return this.http.get<MasterDomain>(this.url(code));
  }

  values(code: string): Observable<MasterDomainValue[]> {
    return this.http.get<MasterDomainValue[]>(this.url(code, 'values'));
  }

  /** El gateway responde con el dominio completo (con sus valores), no con el valor creado. */
  addValue(code: string, value: MasterDomainValueInput): Observable<MasterDomain> {
    return this.http.post<MasterDomain>(this.url(code, 'values'), value);
  }

  /** Igual que `addValue`: responde con el dominio completo. */
  toggleValue(code: string, key: string): Observable<MasterDomain> {
    return this.http.patch<MasterDomain>(this.url(code, 'values', key, 'toggle'), null);
  }
}
