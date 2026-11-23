import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Observable } from 'rxjs';

import { ApiError } from '../../core/api/api-error';
import { MfaApi } from '../../core/api/data/mfa.api';
import { MfaCodesSent, MfaMethod, MfaTotpSetup } from '../../core/auth/mfa.model';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { FormResultComponent } from '../form/form-result.component';
import { cleanCode, mfaMethodHint, mfaMethodIcon, mfaMethodLabel } from './mfa-labels';
import { QrCodeComponent } from './qr-code.component';

/** Lo que cuenta la activación al terminar: el método y, si era el primero, los códigos de recuperación (una sola vez). */
export interface MfaEnrollment {
  method: MfaMethod;
  recoveryCodes: string[] | null;
}

type Step = 'choose' | 'start' | 'confirm';

/**
 * Activa un método de segundo factor: elegir, empezar (teléfono si es SMS; clave y QR si es la aplicación autenticadora) y confirmar
 * con el código. Lo usan el perfil (con sesión) y el acceso obligatorio (con `challengeId`, sin sesión todavía).
 */
@Component({
  selector: 'app-mfa-enroll',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    FormResultComponent,
    QrCodeComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (step()) {
      @case ('choose') {
        <ul class="choices">
          @for (m of methods(); track m) {
            <li>
              <button type="button" class="choice" (click)="choose(m)">
                <mat-icon aria-hidden="true">{{ icon(m) }}</mat-icon>
                <span class="text">
                  <strong>{{ label(m) }}</strong>
                  <span>{{ hint(m) }}</span>
                </span>
                <mat-icon aria-hidden="true">chevron_right</mat-icon>
              </button>
            </li>
          }
        </ul>
      }
      @case ('start') {
        @if (method() === 'sms') {
          <form [formGroup]="phoneForm" (ngSubmit)="sendPhone()" novalidate>
            <mat-form-field class="field">
              <mat-label>{{ 'Teléfono' | t }}</mat-label>
              <mat-icon matPrefix aria-hidden="true">smartphone</mat-icon>
              <input matInput type="tel" autocomplete="tel" formControlName="phone" placeholder="+573001234567" />
              <mat-hint>{{ 'Con el prefijo del país, por ejemplo +573001234567' | t }}</mat-hint>
              @if (phone.invalid && phone.touched) {
                <mat-error>{{
                  'Escribe el teléfono en formato internacional, por ejemplo +573001234567' | t
                }}</mat-error>
              }
            </mat-form-field>
            <app-form-result [error]="error()" />
            <div class="row">
              <button mat-stroked-button type="button" (click)="back()">{{ 'Atrás' | t }}</button>
              <button mat-flat-button type="submit" class="primary-action" [disabled]="loading()">
                {{ 'Enviar código' | t }}
              </button>
            </div>
          </form>
        } @else {
          <app-form-result [error]="error()" />
        }
      }
      @case ('confirm') {
        <form [formGroup]="codeForm" (ngSubmit)="confirm()" novalidate>
          @if (totp(); as setup) {
            <p class="lead">
              {{
                'Escanea el código con tu aplicación autenticadora y escribe el código de 6 dígitos que muestra.' | t
              }}
            </p>
            <app-qr-code [text]="setup.otpauthUri" />
            <p class="manual">
              {{ '¿No puedes escanear? Escribe esta clave en la aplicación:' | t }}
              <code>{{ setup.secret }}</code>
            </p>
          } @else {
            <p class="lead">
              {{ 'Te enviamos un código a {0}. Escríbelo para activar este método.' | t: [destination()] }}
            </p>
          }
          <mat-form-field class="field">
            <mat-label>{{ 'Código' | t }}</mat-label>
            <mat-icon matPrefix aria-hidden="true">pin</mat-icon>
            <input matInput inputmode="numeric" autocomplete="one-time-code" formControlName="code" />
            @if (code.invalid && code.touched) {
              <mat-error>{{ 'Escribe el código de 6 dígitos' | t }}</mat-error>
            }
          </mat-form-field>
          <app-form-result [error]="error()" />
          @if (loading()) {
            <mat-progress-bar mode="indeterminate" [attr.aria-label]="'Verificando' | t" />
          }
          <div class="row">
            <button mat-stroked-button type="button" (click)="back()">{{ 'Atrás' | t }}</button>
            <button mat-flat-button type="submit" class="primary-action" [disabled]="loading()">
              {{ 'Activar' | t }}
            </button>
          </div>
        </form>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .choices {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .choice {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 64px;
      padding: 12px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-body-medium);
      text-align: left;
      cursor: pointer;
    }
    .choice:hover {
      background: var(--mat-sys-surface-container-high);
    }
    .choice .text {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 2px;
      color: var(--mat-sys-on-surface-variant);
    }
    .choice strong {
      color: var(--mat-sys-on-surface);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .field {
      width: 100%;
    }
    .row {
      display: flex;
      gap: 8px;
      justify-content: space-between;
    }
    .lead,
    .manual {
      margin: 0;
    }
    .manual code {
      display: block;
      margin-top: 4px;
      font:
        500 15px/1.4 ui-monospace,
        'JetBrains Mono',
        monospace;
      letter-spacing: 0.08em;
      word-break: break-all;
    }
  `,
})
export class MfaEnrollComponent implements OnInit {
  private readonly api = inject(MfaApi);

  /** Métodos que se pueden activar (los que la empresa permite y el servidor ofrece). */
  readonly methods = input.required<MfaMethod[]>();
  /** Reto de activación obligatoria; sin él se usa la sesión. */
  readonly challengeId = input<string | null>(null);
  /** Método ya elegido (desde el perfil): salta la lista y empieza directamente. */
  readonly initial = input<MfaMethod | null>(null);
  readonly enrolled = output<MfaEnrollment>();
  /** Se volvió atrás desde el primer paso de un método elegido de antemano. */
  readonly cancelled = output<void>();

  protected readonly step = signal<Step>('choose');
  protected readonly method = signal<MfaMethod | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly destination = signal('');
  protected readonly totp = signal<MfaTotpSetup | null>(null);

  protected readonly phone = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\+[1-9][\d\s()-]{7,18}$/)],
  });
  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{3}\s?\d{3}$/)],
  });

  // `(ngSubmit)` solo existe dentro de un formGroup: sin él el formulario recargaría la página
  protected readonly phoneForm = new FormGroup({ phone: this.phone });
  protected readonly codeForm = new FormGroup({ code: this.code });

  protected label = mfaMethodLabel;
  protected icon = mfaMethodIcon;
  protected hint = mfaMethodHint;

  protected choose(method: MfaMethod): void {
    this.method.set(method);
    this.error.set(null);
    this.code.reset('');
    this.phone.reset('');
    this.totp.set(null);
    this.step.set('start');
    if (method !== 'sms') {
      this.begin();
    }
  }

  protected sendPhone(): void {
    this.phone.markAsTouched();
    if (this.phone.valid) {
      this.begin();
    }
  }

  /** Pide al servidor empezar: manda el código (correo, SMS) o genera la clave (aplicación autenticadora). */
  private begin(): void {
    const method = this.method();
    const id = this.challengeId();
    if (!method || this.loading()) {
      return;
    }
    const request$: Observable<MfaCodesSent | MfaTotpSetup> =
      method === 'email'
        ? this.api.emailSetup(id)
        : method === 'sms'
          ? this.api.smsSetup(this.phone.value.replace(/[\s()-]/g, ''), id)
          : this.api.totpSetup(id);
    this.run(request$, (out) => {
      if ('secret' in out) {
        this.totp.set(out);
      } else {
        this.destination.set(out.destination ?? '');
      }
      this.step.set('confirm');
    });
  }

  protected confirm(): void {
    this.code.markAsTouched();
    const method = this.method();
    const id = this.challengeId();
    if (!method || this.code.invalid || this.loading()) {
      return;
    }
    const code = cleanCode(this.code.value);
    this.run(
      method === 'email'
        ? this.api.emailConfirm(code, id)
        : method === 'sms'
          ? this.api.smsConfirm(code, id)
          : this.api.totpConfirm(code, id),
      (out) => this.enrolled.emit({ method, recoveryCodes: out.recoveryCodes ?? null })
    );
  }

  ngOnInit(): void {
    const method = this.initial();
    if (method) {
      this.choose(method);
    }
  }

  protected back(): void {
    this.error.set(null);
    this.code.reset('');
    this.step.set(this.step() === 'confirm' && this.method() === 'sms' ? 'start' : 'choose');
    if (this.step() === 'choose') {
      if (this.initial()) {
        this.cancelled.emit();
        return;
      }
      this.method.set(null);
      this.totp.set(null);
    }
  }

  private run<T>(request: Observable<T>, done: (out: T) => void): void {
    this.loading.set(true);
    this.error.set(null);
    request.subscribe({
      next: (out) => {
        this.loading.set(false);
        done(out);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.error.set(err.message || t('No se pudo completar la solicitud'));
      },
    });
  }
}
