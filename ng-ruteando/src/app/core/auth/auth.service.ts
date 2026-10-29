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
import { loginErrors, linkErrors, registerErrors } from './auth-messages';
import { MessageResponse, RegisterRequest, RegisterResponse, SessionResponse, UserProfile } from './session.model';
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
    return this.http
      .post<SessionResponse>(`${this.baseUrl}/auth/login`, { email, password }, { context: loginErrors() })
      .pipe(map((session) => this.startSession(session)));
  }

  /** Crea la cuenta y su tenant. No inicia sesión: eso ocurre al verificar el correo. */
  register(input: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/auth/register`, input, { context: registerErrors() });
  }

  /** Verifica el correo con el token del enlace; el gateway devuelve una sesión, así que inicia sesión. */
  verifyEmail(token: string): Observable<UserProfile> {
    return this.http
      .post<SessionResponse>(`${this.baseUrl}/auth/verify-email`, { token }, { context: linkErrors() })
      .pipe(map((session) => this.startSession(session)));
  }

  resendVerification(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.baseUrl}/auth/resend-verification`, { email });
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.baseUrl}/auth/forgot-password`, { email });
  }

  /** Fija la contraseña nueva con el token del correo. No inicia sesión. */
  resetPassword(token: string, newPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${this.baseUrl}/auth/reset-password`,
      { token, newPassword },
      { context: linkErrors() },
    );
  }

  refresh(): Observable<UserProfile> {
    return this.refresher.refresh().pipe(map((session) => session.user));
  }

  loadProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/auth/me`).pipe(tap((user) => this.currentUser.set(user)));
  }

  /**
   * Avisa al gateway con el token de refresco (para que lo revoque) y limpia siempre la sesión local,
   * aunque la llamada falle. Sin token de refresco no hay nada que revocar: solo limpia.
   */
  logout(): Observable<void> {
    const refreshToken = this.tokens.getRefreshToken();
    const notified$: Observable<void> = refreshToken
      ? this.http.post<MessageResponse>(`${this.baseUrl}/auth/logout`, { refreshToken }).pipe(
          map(() => undefined),
          catchError(() => of(undefined)),
        )
      : of(undefined);
    return notified$.pipe(
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

  private startSession(session: SessionResponse): UserProfile {
    this.tokens.set({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      expires_in: session.expiresIn,
    });
    this.currentUser.set(session.user);
    this.scheduleRefresh();
    return session.user;
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
