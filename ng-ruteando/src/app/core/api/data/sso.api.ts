import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { LoginResponse } from '../../auth/mfa.model';
import { SsoEnterprise, SsoEnterpriseInput, SsoIdentity, SsoPolicy, SsoProvider } from '../../auth/sso.model';
import { ssoErrors } from '../../auth/sso-messages';
import { API_BASE_URL } from '../api-config';

/**
 * Inicio de sesión único (`/gateway/sso/**`, lo atiende nuestro servidor). Entrar es una navegación del navegador a
 * `startUrl()`; al volver, `complete` canjea el ticket del regreso por lo mismo que daría un login.
 */
@Injectable({ providedIn: 'root' })
export class SsoApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/sso`;
  private readonly options = () => ({ context: ssoErrors() });

  /** Dirección a la que navegar para empezar con un proveedor (`email` solo en el empresarial). */
  startUrl(provider: string, email?: string): string {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return `${this.baseUrl}/${encodeURIComponent(provider)}/start${query}`;
  }

  providers(): Observable<{ providers: SsoProvider[] }> {
    return this.http.get<{ providers: SsoProvider[] }>(`${this.baseUrl}/providers`);
  }

  complete(ticket: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/complete`, { ticket }, this.options());
  }

  identities(): Observable<{ identities: SsoIdentity[] }> {
    return this.http.get<{ identities: SsoIdentity[] }>(`${this.baseUrl}/identities`, this.options());
  }

  unlink(provider: string): Observable<{ unlinked: true }> {
    return this.http.delete<{ unlinked: true }>(
      `${this.baseUrl}/identities/${encodeURIComponent(provider)}`,
      this.options()
    );
  }

  policy(): Observable<SsoPolicy> {
    return this.http.get<SsoPolicy>(`${this.baseUrl}/policy`, this.options());
  }

  setPolicy(enabled: boolean): Observable<{ tenantId: string; enabled: boolean }> {
    return this.http.put<{ tenantId: string; enabled: boolean }>(`${this.baseUrl}/policy`, { enabled }, this.options());
  }

  enterprise(): Observable<SsoEnterprise> {
    return this.http.get<SsoEnterprise>(`${this.baseUrl}/enterprise`, this.options());
  }

  saveEnterprise(input: SsoEnterpriseInput): Observable<SsoEnterprise> {
    return this.http.put<SsoEnterprise>(`${this.baseUrl}/enterprise`, input, this.options());
  }

  deleteEnterprise(): Observable<SsoEnterprise> {
    return this.http.delete<SsoEnterprise>(`${this.baseUrl}/enterprise`, this.options());
  }
}
