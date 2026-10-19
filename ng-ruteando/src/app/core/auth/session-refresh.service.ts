import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, finalize, map, shareReplay, throwError } from 'rxjs';

import { API_BASE_URL } from '../api/api-config';
import { SessionResponse } from './session.model';
import { TokenStorageService } from './token-storage.service';

/** No hay token de refresco con el que renovar la sesión. */
export class NoRefreshTokenError extends Error {
  constructor() {
    super('No hay token de refresco');
    this.name = 'NoRefreshTokenError';
  }
}

/**
 * Renueva la sesión con `POST /auth/refresh`. Mientras hay una renovación en curso todas las
 * llamadas comparten la misma petición; el gateway rota el token de refresco, así que dos
 * peticiones simultáneas invalidarían la sesión.
 */
@Injectable({ providedIn: 'root' })
export class SessionRefreshService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly tokens = inject(TokenStorageService);
  private readonly router = inject(Router);
  private inFlight: Observable<SessionResponse> | null = null;

  /** Emite cuando la sesión se da por caducada (renovación imposible). */
  readonly expired$ = new Subject<void>();

  refresh(): Observable<SessionResponse> {
    if (this.inFlight) {
      return this.inFlight;
    }
    const refreshToken = this.tokens.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new NoRefreshTokenError());
    }
    this.inFlight = this.http.post<SessionResponse>(`${this.baseUrl}/auth/refresh`, { refreshToken }).pipe(
      map((session) => {
        this.tokens.set({
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          expires_in: session.expiresIn,
        });
        return session;
      }),
      finalize(() => (this.inFlight = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inFlight;
  }

  /** Borra la sesión y lleva al usuario a iniciar sesión de nuevo, recordando dónde estaba. */
  expireSession(): void {
    this.tokens.resetToken();
    this.expired$.next();
    const url = this.router.url;
    if (!url.startsWith('/acceso')) {
      void this.router.navigate(['/acceso'], url === '/' ? {} : { queryParams: { returnUrl: url } });
    }
  }
}
