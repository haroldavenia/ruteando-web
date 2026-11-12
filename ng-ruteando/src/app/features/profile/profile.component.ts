import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';

import { ApiError } from '../../core/api/api-error';
import { MfaApi } from '../../core/api/data/mfa.api';
import { CurrentUser } from '../../core/auth/current-user';
import { MfaMethod, MfaStatus } from '../../core/auth/mfa.model';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { MfaEnrollComponent, MfaEnrollment } from '../../shared/mfa/mfa-enroll.component';
import { mfaMethodHint, mfaMethodIcon, mfaMethodLabel } from '../../shared/mfa/mfa-labels';
import { MfaStepUp, MfaStepUpComponent } from '../../shared/mfa/mfa-step-up.component';
import { RecoveryCodesComponent } from '../../shared/mfa/recovery-codes.component';
import { SsoAccountsComponent } from '../../shared/sso/sso-accounts.component';
import { roleLabel } from '../../shared/ui/role-label';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { StatusTone } from '../../shared/ui/status-tone';

type Panel = { kind: 'enable'; method: MfaMethod } | { kind: 'disable'; method: MfaMethod } | { kind: 'regenerate' };

interface MethodRow {
  method: MfaMethod;
  destination: string | null;
  active: boolean;
  /** Se puede activar: la empresa lo permite y el servidor lo ofrece. */
  canEnable: boolean;
  badge: { label: string; tone: StatusTone };
}

/** Orden en que se ofrecen: la aplicación autenticadora primero (no depende de ningún envío). */
const ORDER: readonly MfaMethod[] = ['totp', 'email', 'sms'];

/**
 * Perfil de la persona con sesión: sus datos y su verificación en dos pasos. Cada persona activa o desactiva sus propios métodos
 * (los que su empresa permite), pide códigos de recuperación nuevos y, si la empresa exige el segundo factor, no puede quedarse sin
 * ninguno.
 */
@Component({
  selector: 'app-profile',
  imports: [
    MatButtonModule,
    MatIconModule,
    FormResultComponent,
    MfaEnrollComponent,
    MfaStepUpComponent,
    PageHeaderComponent,
    RecoveryCodesComponent,
    SkeletonComponent,
    SsoAccountsComponent,
    StatusBadgeComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="'Perfil' | t" [subtitle]="user()?.email ?? null" />

    <section class="card" aria-labelledby="account-title">
      <h2 id="account-title" class="card-title">{{ 'Tu cuenta' | t }}</h2>
      <dl class="stat-grid">
        <div>
          <dt>{{ 'Nombre' | t }}</dt>
          <dd>{{ name() }}</dd>
        </div>
        <div>
          <dt>{{ 'Correo electrónico' | t }}</dt>
          <dd>{{ user()?.email }}</dd>
        </div>
        <div>
          <dt>{{ 'Rol' | t }}</dt>
          <dd>{{ role() }}</dd>
        </div>
      </dl>
    </section>

    <section class="card" aria-labelledby="mfa-title">
      <h2 id="mfa-title" class="card-title">{{ 'Verificación en dos pasos' | t }}</h2>
      <p class="muted">
        {{ 'Añade un segundo paso al iniciar sesión: un código además de tu contraseña.' | t }}
      </p>
      <app-form-result [error]="loadError()" [success]="notice()" />

      @if (loading()) {
        <app-skeleton variant="list" [label]="'Cargando…' | t" />
      } @else if (status(); as s) {
        @if (s.required) {
          <p class="note" role="note">
            <mat-icon aria-hidden="true">info</mat-icon>
            <span>{{ 'Tu empresa exige la verificación en dos pasos.' | t }}</span>
          </p>
        }
        <ul class="methods">
          @for (row of rows(); track row.method) {
            <li>
              <mat-icon aria-hidden="true">{{ icon(row.method) }}</mat-icon>
              <div class="info">
                <strong>{{ label(row.method) }}</strong>
                <span class="muted">{{ row.active && row.destination ? row.destination : hint(row.method) }}</span>
              </div>
              <app-status-badge [label]="row.badge.label" [tone]="row.badge.tone" />
              @if (row.active) {
                <button
                  mat-button
                  type="button"
                  [disabled]="lastLocked()"
                  [attr.title]="lastLocked() ? lockedHint : null"
                  (click)="open({ kind: 'disable', method: row.method })"
                >
                  {{ 'Desactivar' | t }}
                </button>
              } @else if (row.canEnable) {
                <button mat-stroked-button type="button" (click)="open({ kind: 'enable', method: row.method })">
                  {{ 'Activar' | t }}
                </button>
              }
            </li>
          }
        </ul>
        @if (lastLocked()) {
          <p class="muted locked">{{ lockedHint }}</p>
        }

        @if (panel(); as p) {
          <div class="panel" role="group" [attr.aria-label]="'Activar o desactivar un método' | t">
            @switch (p.kind) {
              @case ('enable') {
                <h3>{{ 'Activar {0}' | t: [label(p.method)] }}</h3>
                <app-mfa-enroll
                  [methods]="[p.method]"
                  [initial]="p.method"
                  (enrolled)="enrolled($event)"
                  (cancelled)="close()"
                />
              }
              @case ('disable') {
                <h3>{{ 'Desactivar {0}' | t: [label(p.method)] }}</h3>
                <app-mfa-step-up
                  [methods]="otherActive(p.method)"
                  [hasRecovery]="s.recoveryCodesLeft > 0"
                  [confirmLabel]="'Desactivar' | t"
                  [busy]="busy()"
                  [error]="actionError()"
                  (confirmed)="disable(p.method, $event)"
                  (cancelled)="close()"
                />
              }
              @case ('regenerate') {
                <h3>{{ 'Códigos de recuperación nuevos' | t }}</h3>
                <app-mfa-step-up
                  [methods]="activeMethods()"
                  [hasRecovery]="s.recoveryCodesLeft > 0"
                  [confirmLabel]="'Generar códigos' | t"
                  [busy]="busy()"
                  [error]="actionError()"
                  (confirmed)="regenerate($event)"
                  (cancelled)="close()"
                />
              }
            }
          </div>
        }

        @if (s.activeCount > 0) {
          <div class="recovery">
            <mat-icon aria-hidden="true">key</mat-icon>
            <div class="info">
              <strong>{{ 'Códigos de recuperación' | t }}</strong>
              <span class="muted">{{
                s.recoveryCodesLeft === 1
                  ? ('Te queda 1 código sin usar' | t)
                  : ('Te quedan {0} códigos sin usar' | t: [s.recoveryCodesLeft])
              }}</span>
            </div>
            <button mat-stroked-button type="button" (click)="open({ kind: 'regenerate' })">
              {{ 'Generar nuevos' | t }}
            </button>
          </div>
        }
      }
    </section>

    <app-sso-accounts />

    @if (codes(); as list) {
      <section class="card" aria-labelledby="codes-title">
        <h2 id="codes-title" class="card-title">{{ 'Guarda tus códigos de recuperación' | t }}</h2>
        <app-recovery-codes [codes]="list" (saved)="codes.set(null)" />
      </section>
    }
  `,
  styles: `
    .muted {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .locked {
      margin-top: 8px;
    }
    .note {
      display: flex;
      gap: 10px;
      margin: 12px 0;
      padding: 12px 16px;
      border-radius: 12px;
      background: var(--app-info-container);
      color: var(--app-on-info-container);
    }
    .methods {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 16px 0 0;
      padding: 0;
      list-style: none;
    }
    .methods li,
    .recovery {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
    }
    .recovery {
      margin-top: 16px;
    }
    .info {
      display: flex;
      flex: 1 1 14rem;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .panel {
      margin-top: 16px;
      padding: 16px;
      border-radius: 12px;
      background: var(--mat-sys-surface-container);
    }
    .panel h3 {
      margin: 0 0 12px;
      font: var(--mat-sys-title-medium);
    }
  `,
})
export class ProfileComponent implements OnInit {
  private readonly api = inject(MfaApi);
  private readonly currentUser = inject(CurrentUser);

  protected readonly user = this.currentUser.user;
  protected readonly status = signal<MfaStatus | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly panel = signal<Panel | null>(null);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  /** Códigos de recuperación recién generados: se muestran una sola vez. */
  protected readonly codes = signal<string[] | null>(null);

  protected readonly lockedHint = t('Tu empresa exige el segundo factor: no puedes quitar el último método');

  protected readonly name = computed(() => {
    const u = this.user();
    return [u?.firstName, u?.lastName].filter(Boolean).join(' ') || '—';
  });
  protected readonly role = computed(() => roleLabel(this.user()?.role ?? ''));

  protected readonly rows = computed<MethodRow[]>(() => {
    const s = this.status();
    if (!s) {
      return [];
    }
    return ORDER.map((method) => {
      const m = s.methods[method];
      const badge: MethodRow['badge'] = m.active
        ? { label: t('Activo'), tone: 'success' }
        : !m.allowed
          ? { label: t('No permitido por tu empresa'), tone: 'warning' }
          : !m.available
            ? { label: t('No disponible en el servidor'), tone: 'neutral' }
            : { label: t('Sin activar'), tone: 'neutral' };
      return { method, destination: m.destination, active: m.active, canEnable: m.allowed && m.available, badge };
    });
  });
  protected readonly activeMethods = computed(() =>
    this.rows()
      .filter((r) => r.active)
      .map((r) => r.method)
  );
  /** La empresa lo exige y solo queda un método: ese no se puede quitar. */
  protected readonly lastLocked = computed(() => {
    const s = this.status();
    return !!s && s.required && s.activeCount <= 1;
  });

  protected label = mfaMethodLabel;
  protected icon = mfaMethodIcon;
  protected hint = mfaMethodHint;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.api.status().subscribe({
      next: (status) => {
        this.status.set(status);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message);
      },
    });
  }

  /** Métodos activos distintos del que se quiere quitar: con ellos (o un código de recuperación) se confirma. */
  protected otherActive(method: MfaMethod): MfaMethod[] {
    return this.activeMethods().filter((m) => m !== method);
  }

  protected open(panel: Panel): void {
    this.notice.set(null);
    this.actionError.set(null);
    this.panel.set(panel);
  }

  protected close(): void {
    this.panel.set(null);
    this.actionError.set(null);
  }

  protected enrolled(result: MfaEnrollment): void {
    this.panel.set(null);
    this.notice.set(t('Método activado: {0}', [mfaMethodLabel(result.method)]));
    if (result.recoveryCodes?.length) {
      this.codes.set(result.recoveryCodes);
    }
    this.load();
  }

  protected disable(method: MfaMethod, step: MfaStepUp): void {
    this.run(this.api.disable(method, step.via, step.code), () => {
      this.notice.set(t('Método desactivado: {0}', [mfaMethodLabel(method)]));
    });
  }

  protected regenerate(step: MfaStepUp): void {
    this.run(this.api.regenerateRecoveryCodes(step.via, step.code), (out) => {
      this.codes.set(out.recoveryCodes);
      this.notice.set(t('Códigos de recuperación nuevos generados'));
    });
  }

  private run<T>(request: Observable<T>, done: (out: T) => void): void {
    this.busy.set(true);
    this.actionError.set(null);
    request.subscribe({
      next: (out) => {
        this.busy.set(false);
        this.panel.set(null);
        done(out);
        this.load();
      },
      error: (err: ApiError) => {
        this.busy.set(false);
        this.actionError.set(err.message);
      },
    });
  }
}
