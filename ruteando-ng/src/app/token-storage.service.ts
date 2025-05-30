import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private accessToken = '';

  set(token: {access_token: string, refresh_token: string, expires_in: number}): void {
    this.accessToken = token.access_token;
    localStorage.setItem('hanoitToken', token.refresh_token);
    const expires = new Date();
    expires.setSeconds(token.expires_in);
    localStorage.setItem('hanoitTokenExpiresDate', expires.toISOString());
    this.scheduleExpiration(token.expires_in);
  }

  setRefreshToken(tkn: string): void {
    localStorage.setItem('hanoitToken', tkn);
  }

  get(): string {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    const exp = localStorage.getItem('hanoitTokenExpiresDate');
    if (exp && new Date(exp) < new Date()) {
      this.resetToken();
    }
    return localStorage.getItem('hanoitToken');
  }

  resetToken(): void {
    this.accessToken = '';
    localStorage.removeItem('hanoitToken');
    localStorage.removeItem('hanoitTokenExpiresDate');
  }

  private scheduleExpiration(seconds: number): void {
    const time = (seconds - 5) * 1000;
    setTimeout(() => {
      // TODO: emit refresh event
    }, time);
  }
}
