import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { CurrentUser } from '../../core/auth/current-user';
import { roleLabel } from '../../shared/ui/role-label';

/** «Sin permiso»: a donde llevan las guardas de rol. Dice el motivo y el rol de la sesión, y ofrece volver al inicio. */
@Component({
  selector: 'app-forbidden',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 480px;
      margin-inline: auto;
      padding: 40px 28px;
      text-align: center;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      margin-bottom: 20px;
      border-radius: 50%;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    p {
      margin: 12px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-large);
    }
    a {
      margin-top: 24px;
    }
  `,
  template: `
    <section class="card panel">
      <span class="icon" aria-hidden="true"><mat-icon fontIcon="shield" /></span>
      <h1>Sin permiso</h1>
      <p>No tienes permiso para ver esta página.</p>
      @if (role(); as name) {
        <p class="role">Tu rol es <strong>{{ name }}</strong>. Si necesitas esta área, pídela a quien administra tu empresa.</p>
      }
      <a mat-flat-button class="primary-action" routerLink="/">Volver al inicio</a>
    </section>
  `,
})
export class ForbiddenComponent {
  private readonly currentUser = inject(CurrentUser);

  /** Nombre del rol de la sesión; sin sesión no se dice ninguno. */
  protected readonly role = computed(() => {
    const role = this.currentUser.role();
    return role === null ? null : roleLabel(role);
  });
}
