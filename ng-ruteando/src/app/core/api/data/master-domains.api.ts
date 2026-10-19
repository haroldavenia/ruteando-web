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

  addValue(code: string, value: MasterDomainValueInput): Observable<MasterDomainValue> {
    return this.http.post<MasterDomainValue>(this.url(code, 'values'), value);
  }

  toggleValue(code: string, key: string): Observable<MasterDomainValue> {
    return this.http.patch<MasterDomainValue>(this.url(code, 'values', key, 'toggle'), null);
  }
}
