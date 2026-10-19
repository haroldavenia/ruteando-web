import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';

import { API_BASE_URL } from '../api/api-config';
import { REFRESH_MARGIN_MS } from '../api/refresh.interceptor';
import { CurrentUser } from './current-user';
import { SessionRefreshService } from './session-refresh.service';
import { SessionResponse, UserProfile } from './session.model';
import { TokenStorageService } from './token-storage.service';

/**
 * Ciclo de vida de la sesión: inicio, restauración al arrancar, cierre y renovación programada.
 * La contraseña solo viaja en la petición de login: no se guarda en ningún sitio.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly tokens = inject(TokenStorageService);
  private readonly refresher = inject(SessionRefreshService);
  private readonly currentUser = inject(CurrentUser);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Una renovación (del interceptor, del temporizador o del arranque) actualiza usuario y temporizador
    this.refresher.refreshed$.pipe(takeUntilDestroyed()).subscribe((session) => {
      this.currentUser.set(session.user);
      this.scheduleRefresh();
    });
    this.refresher.expired$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.currentUser.clear();
      this.cancelRefresh();
    });
  }

  login(email: string, password: string): Observable<UserProfile> {
    return this.http.post<SessionResponse>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
      map((session) => {
        this.tokens.set({
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          expires_in: session.expiresIn,
        });
        this.currentUser.set(session.user);
        this.scheduleRefresh();
        return session.user;
      }),
    );
  }

  refresh(): Observable<UserProfile> {
    return this.refresher.refresh().pipe(map((session) => session.user));
  }

  loadProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/auth/me`).pipe(tap((user) => this.currentUser.set(user)));
  }

  /** Avisa al gateway y limpia siempre la sesión local, aunque la llamada falle. */
  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout`, null).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      tap(() => {
        this.endSession();
        void this.router.navigate(['/acceso']);
      }),
    );
  }

  /**
   * Restaura la sesión al arrancar con el token de refresco guardado: renueva el acceso y carga el
   * perfil. Cualquier fallo deja al usuario anónimo, sin error ni redirección. En el servidor no hace nada.
   */
  async restoreSession(): Promise<void> {
    if (!this.isBrowser || !this.tokens.getRefreshToken()) {
      return;
    }
    try {
      await firstValueFrom(this.refresher.refresh());
      await firstValueFrom(this.loadProfile());
    } catch {
      this.endSession();
    }
  }

  private endSession(): void {
    this.tokens.resetToken();
    this.currentUser.clear();
    this.cancelRefresh();
  }

  /** Renueva el acceso 30 s antes de que caduque aunque no haya peticiones (como el temporizador del legacy). */
  private scheduleRefresh(): void {
    this.cancelRefresh();
    const expiresAt = this.tokens.expiresAt;
    if (!this.isBrowser || expiresAt === null) {
      return;
    }
    const delay = Math.max(expiresAt.getTime() - Date.now() - REFRESH_MARGIN_MS, 0);
    // Fuera de la zona: un temporizador pendiente no debe mantener la aplicación "inestable"
    this.refreshTimer = this.zone.runOutsideAngular(() =>
      setTimeout(() => {
        this.refreshTimer = null;
        this.zone.run(() => this.refresher.refresh().subscribe({ error: () => this.refresher.expireSession() }));
      }, delay),
    );
  }

  private cancelRefresh(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
