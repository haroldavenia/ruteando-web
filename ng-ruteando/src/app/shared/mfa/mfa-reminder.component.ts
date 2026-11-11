import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import { MfaApi } from '../../core/api/data/mfa.api';
import { MfaStatus } from '../../core/auth/mfa.model';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

const PROFILE = '/perfil';
const onProfile = (url: string) => url.split(/[?#]/)[0] === PROFILE;

/** Hay algo que activar: la persona no tiene ningún método y la empresa permite y el servidor ofrece al menos uno. */
export function needsMfaActivation(status: MfaStatus): boolean {
  return status.activeCount === 0 && Object.values(status.methods).some((m) => m.allowed && m.available);
}

/**
 * Aviso bajo la barra del área privada: si la persona no tiene ningún método de segundo factor activo (cuando la empresa lo exige
 * ya se pidió al iniciar sesión), la invita a activar uno en el perfil. «Más tarde» lo oculta hasta el próximo inicio de sesión.
 * Con el módulo apagado (503) o sin métodos disponibles no aparece; en el propio perfil tampoco (ahí se activa), y al salir de él
 * se vuelve a comprobar por si ya activó uno.
 */
@Component({
  selector: 'app-mfa-reminder',
  imports: [MatButtonModule, MatIconModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="mfa-reminder" role="status">
        <mat-icon aria-hidden="true">shield</mat-icon>
        <p>
          <strong>{{ 'Protege tu cuenta con la verificación en dos pasos' | t }}</strong>
          <span>{{ 'Aún no tienes ningún método activo: elige correo, SMS o una aplicación autenticadora.' | t }}</span>
        </p>
        <span class="actions">
          <a mat-flat-button routerLink="/perfil">{{ 'Activar ahora' | t }}</a>
          <button mat-button type="button" (click)="dismissed.set(true)">{{ 'Más tarde' | t }}</button>
        </span>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      flex: none;
    }
    .mfa-reminder {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      background: var(--app-warning-container);
      color: var(--app-on-warning-container);
    }
    p {
      display: grid;
      flex: 1 1 280px;
      gap: 2px;
      margin: 0;
      font: var(--mat-sys-body-medium);
    }
    p strong {
      font-weight: 500;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
})
export class MfaReminderComponent {
  private readonly api = inject(MfaApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly needed = signal(false);
  private readonly url = signal(this.router.url);
  protected readonly dismissed = signal(false);
  protected readonly visible = computed(() => this.needed() && !this.dismissed() && !onProfile(this.url()));

  constructor() {
    // Solo en el navegador (en el servidor no hay sesión de la persona)
    afterNextRender(() => {
      this.refresh();
      let last = this.router.url;
      const sub = this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => {
          this.url.set(e.urlAfterRedirects);
          if (onProfile(last) && !onProfile(e.urlAfterRedirects)) {
            this.refresh();
          }
          last = e.urlAfterRedirects;
        });
      this.destroyRef.onDestroy(() => sub.unsubscribe());
    });
  }

  private refresh(): void {
    this.api.status().subscribe({
      next: (status) => this.needed.set(needsMfaActivation(status)),
      // 503 con el módulo apagado, o cualquier fallo: sin aviso, nunca se estorba
      error: () => this.needed.set(false),
    });
  }
}
