import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

export interface TokenSession {
  access_token: string;
  refresh_token: string;
  /** Segundos de vida del token de acceso, contados desde ahora. */
  expires_in: number;
}

// Mismas claves que la aplicación AngularJS, para poder leer una sesión abierta con ella.
const REFRESH_TOKEN_KEY = 'hanoitToken';
const EXPIRES_KEY = 'hanoitTokenExpiresDate';

/**
 * Token de acceso solo en memoria; token de refresco y su caducidad en `localStorage`.
 * En el servidor (SSR) no toca el navegador: no hay sesión y escribir no tiene efecto.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private accessToken = '';

  set(session: TokenSession): void {
    if (!this.isBrowser) {
      return;
    }
    this.accessToken = session.access_token;
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
    const expiresAt = new Date(Date.now() + session.expires_in * 1000);
    localStorage.setItem(EXPIRES_KEY, expiresAt.toISOString());
  }

  setRefreshToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  }

  get(): string {
    return this.accessToken;
  }

  /** Token de refresco vigente o `null`; si ha caducado (o la fecha no se entiende) borra la sesión. */
  getRefreshToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    const raw = localStorage.getItem(EXPIRES_KEY);
    if (raw !== null) {
      const expiresAt = this.parse(raw);
      if (expiresAt === null || expiresAt <= new Date()) {
        this.resetToken();
        return null;
      }
    }
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /** Instante de caducidad guardado, o `null` si no hay sesión o no se puede interpretar. */
  get expiresAt(): Date | null {
    if (!this.isBrowser) {
      return null;
    }
    const raw = localStorage.getItem(EXPIRES_KEY);
    return raw === null ? null : this.parse(raw);
  }

  resetToken(): void {
    this.accessToken = '';
    if (this.isBrowser) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    }
  }

  /** Acepta ISO y también el formato de `Date.toString()` que escribía AngularJS. */
  private parse(value: string): Date | null {
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : new Date(time);
  }
}
