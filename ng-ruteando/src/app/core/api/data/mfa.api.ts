import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  MfaChallengeMethod,
  MfaCodesSent,
  MfaEnabled,
  MfaMethod,
  MfaPolicy,
  MfaSessionResponse,
  MfaStatus,
  MfaTotpSetup,
} from '../../auth/mfa.model';
import { mfaErrors } from '../../auth/mfa-messages';
import { SessionResponse } from '../../auth/session.model';
import { API_BASE_URL } from '../api-config';
import { MFA_CHALLENGE_HEADER } from '../api-paths';

/**
 * Segundo factor (`/gateway/mfa/**`, lo atiende nuestro servidor, no el gateway). Dos formas de autenticarse:
 *  - con la sesión (token de acceso), la normal de `/profile` y `/security`;
 *  - con `challengeId`, cuando la empresa exige el segundo factor y la persona aún no tiene sesión: el reto de activación
 *    obligatoria viaja en la cabecera `X-MFA-Challenge` (las altas lo aceptan en lugar del token).
 */
@Injectable({ providedIn: 'root' })
export class MfaApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/mfa`;

  private options(challengeId?: string | null) {
    return {
      context: mfaErrors(),
      headers: challengeId ? new HttpHeaders({ [MFA_CHALLENGE_HEADER]: challengeId }) : undefined,
    };
  }

  // ---------- reto de inicio de sesión (sin sesión) ----------
  loginSend(challengeId: string, method: MfaMethod): Observable<MfaCodesSent> {
    return this.http.post<MfaCodesSent>(`${this.baseUrl}/login/send`, { challengeId, method }, this.options());
  }

  loginVerify(challengeId: string, method: MfaChallengeMethod, code: string): Observable<MfaSessionResponse> {
    return this.http.post<MfaSessionResponse>(
      `${this.baseUrl}/login/verify`,
      { challengeId, method, code },
      this.options()
    );
  }

  /** Cierra una activación obligatoria cuando ya hay un método activo: entrega la sesión. */
  loginComplete(challengeId: string): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.baseUrl}/login/complete`, { challengeId }, this.options());
  }

  // ---------- estado y altas (sesión o reto de activación) ----------
  status(challengeId?: string | null): Observable<MfaStatus> {
    return this.http.get<MfaStatus>(`${this.baseUrl}/status`, this.options(challengeId));
  }

  emailSetup(challengeId?: string | null): Observable<MfaCodesSent> {
    return this.http.post<MfaCodesSent>(`${this.baseUrl}/email/setup`, {}, this.options(challengeId));
  }

  emailConfirm(code: string, challengeId?: string | null): Observable<MfaEnabled> {
    return this.http.post<MfaEnabled>(`${this.baseUrl}/email/confirm`, { code }, this.options(challengeId));
  }

  smsSetup(phone: string, challengeId?: string | null): Observable<MfaCodesSent> {
    return this.http.post<MfaCodesSent>(`${this.baseUrl}/sms/setup`, { phone }, this.options(challengeId));
  }

  smsConfirm(code: string, challengeId?: string | null): Observable<MfaEnabled> {
    return this.http.post<MfaEnabled>(`${this.baseUrl}/sms/confirm`, { code }, this.options(challengeId));
  }

  totpSetup(challengeId?: string | null): Observable<MfaTotpSetup> {
    return this.http.post<MfaTotpSetup>(`${this.baseUrl}/totp/setup`, {}, this.options(challengeId));
  }

  totpConfirm(code: string, challengeId?: string | null): Observable<MfaEnabled> {
    return this.http.post<MfaEnabled>(`${this.baseUrl}/totp/confirm`, { code }, this.options(challengeId));
  }

  // ---------- acciones sensibles (solo con sesión) ----------
  /** Envía un código por correo o SMS para confirmar una acción sensible. */
  sessionSend(via: MfaMethod): Observable<MfaCodesSent> {
    return this.http.post<MfaCodesSent>(`${this.baseUrl}/session/send`, { via }, this.options());
  }

  /** Quita un método; `via` y `code` son el código de un método activo (o de recuperación) que lo autoriza. */
  disable(method: MfaMethod, via: MfaChallengeMethod, code: string): Observable<{ active: false }> {
    return this.http.delete<{ active: false }>(`${this.baseUrl}/methods/${method}`, {
      ...this.options(),
      body: { via, code },
    });
  }

  regenerateRecoveryCodes(via: MfaChallengeMethod, code: string): Observable<{ recoveryCodes: string[] }> {
    return this.http.post<{ recoveryCodes: string[] }>(
      `${this.baseUrl}/recovery-codes/regenerate`,
      { via, code },
      this.options()
    );
  }

  // ---------- administración ----------
  policy(tenantId?: string | null): Observable<MfaPolicy> {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return this.http.get<MfaPolicy>(`${this.baseUrl}/policy${query}`, this.options());
  }

  savePolicy(
    policy: Pick<MfaPolicy, 'methods' | 'required' | 'roles'>,
    tenantId?: string | null
  ): Observable<MfaPolicy> {
    return this.http.put<MfaPolicy>(
      this.baseUrl + '/policy',
      { ...policy, ...(tenantId ? { tenantId } : {}) },
      this.options()
    );
  }

  /** Quién tiene al menos un método activo en la empresa. */
  usersWithMfa(tenantId?: string | null): Observable<{ userIds: string[] }> {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return this.http.get<{ userIds: string[] }>(`${this.baseUrl}/users${query}`, this.options());
  }

  resetUser(userId: string): Observable<{ reset: true }> {
    return this.http.post<{ reset: true }>(
      `${this.baseUrl}/users/${encodeURIComponent(userId)}/reset`,
      {},
      this.options()
    );
  }
}
