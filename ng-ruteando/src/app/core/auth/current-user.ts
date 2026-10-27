import { Injectable, computed, signal } from '@angular/core';

import { UserProfile } from './session.model';

/** Usuario con sesión iniciada (o `null`, anónimo), con su rol y su `tenantId`. */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
  private readonly state = signal<UserProfile | null>(null);

  readonly user = this.state.asReadonly();
  readonly isAuthenticated = computed(() => this.state() !== null);
  readonly role = computed(() => this.state()?.role ?? null);
  readonly tenantId = computed(() => this.state()?.tenantId ?? null);

  set(user: UserProfile): void {
    this.state.set(user);
  }

  clear(): void {
    this.state.set(null);
  }
}
