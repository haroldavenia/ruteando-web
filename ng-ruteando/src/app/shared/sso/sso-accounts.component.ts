import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ApiError } from '../../core/api/api-error';
import { SsoApi } from '../../core/api/data/sso.api';
import { SsoIdentity } from '../../core/auth/sso.model';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { FormResultComponent } from '../form/form-result.component';

/**
 * Cuentas del proveedor (Google, GitHub, Apple, SSO de empresa) con las que la persona ya entró: se vinculan solas la primera vez que
 * entra con un correo verificado, y desde aquí se desvinculan. No pinta nada si no hay ninguna (o el servidor no tiene SSO).
 */
@Component({
  selector: 'app-sso-accounts',
  imports: [MatButtonModule, MatIconModule, FormResultComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (identities().length > 0) {
      <section class="card" aria-labelledby="sso-accounts-title">
        <h2 id="sso-accounts-title" class="card-title">{{ 'Cuentas vinculadas' | t }}</h2>
        <p class="muted">{{ 'Cuentas de otros proveedores con las que entras sin contraseña.' | t }}</p>
        <app-form-result [error]="error()" [success]="notice()" />
        <ul class="accounts">
          @for (item of identities(); track item.provider) {
            <li>
              <mat-icon aria-hidden="true">link</mat-icon>
              <div class="info">
                <strong>{{ item.label }}</strong>
                <span class="muted">{{ item.email }}</span>
              </div>
              <button mat-button type="button" [disabled]="busy()" (click)="unlink(item)">
                {{ 'Desvincular' | t }}
              </button>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    .muted {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .accounts {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 16px 0 0;
      padding: 0;
      list-style: none;
    }
    .accounts li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
    }
    .info {
      display: flex;
      flex: 1 1 14rem;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
  `,
})
export class SsoAccountsComponent implements OnInit {
  private readonly api = inject(SsoApi);
  private readonly dialog = inject(MatDialog);

  protected readonly identities = signal<SsoIdentity[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    // Si falla (SSO apagado, sin conexión) no se muestra nada: el resto del Perfil no depende de esto
    this.api.identities().subscribe({
      next: (out) => this.identities.set(out.identities),
      error: () => this.identities.set([]),
    });
  }

  protected unlink(item: SsoIdentity): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: t('Desvincular {0}', [item.label]),
          message: t('Ya no podrás entrar con esta cuenta. Podrás vincularla de nuevo al volver a entrar con ella.'),
          confirmLabel: t('Desvincular'),
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed !== true) {
          return;
        }
        this.busy.set(true);
        this.error.set(null);
        this.notice.set(null);
        this.api.unlink(item.provider).subscribe({
          next: () => {
            this.busy.set(false);
            this.notice.set(t('Cuenta desvinculada: {0}', [item.label]));
            this.load();
          },
          error: (err: ApiError) => {
            this.busy.set(false);
            this.error.set(err.message);
          },
        });
      });
  }
}
