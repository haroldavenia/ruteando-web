import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ApiError } from '../../core/api/api-error';
import { MfaApi } from '../../core/api/data/mfa.api';
import { MfaChallengeMethod, MfaMethod } from '../../core/auth/mfa.model';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { FormResultComponent } from '../form/form-result.component';
import { cleanCode, mfaMethodIcon, mfaMethodLabel } from './mfa-labels';

/** Código con el que la persona autoriza una acción sensible: de qué método viene y el código. */
export interface MfaStepUp {
  via: MfaChallengeMethod;
  code: string;
}

/**
 * Pide un código de un método activo (o de recuperación) para autorizar una acción sensible: desactivar un método o pedir códigos de
 * recuperación nuevos. Con correo o SMS envía el código al elegirlo; la acción en sí la hace quien lo usa (`error` y `busy` vienen de él).
 */
@Component({
  selector: 'app-mfa-step-up',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    FormResultComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <p class="lead">{{ prompt() }}</p>
      @if (options().length > 1) {
        <div class="vias" role="group" [attr.aria-label]="'Método de confirmación' | t">
          @for (m of options(); track m) {
            <button
              type="button"
              mat-stroked-button
              [class.selected]="m === via()"
              [attr.aria-pressed]="m === via()"
              (click)="choose(m)"
            >
              <mat-icon aria-hidden="true">{{ icon(m) }}</mat-icon
              >{{ label(m) }}
            </button>
          }
        </div>
      }
      <mat-form-field class="field">
        <mat-label>{{ 'Código' | t }}</mat-label>
        <mat-icon matPrefix aria-hidden="true">{{ icon(via()) }}</mat-icon>
        <input
          matInput
          [attr.inputmode]="via() === 'recovery' ? 'text' : 'numeric'"
          autocomplete="one-time-code"
          formControlName="code"
        />
        @if (code.invalid && code.touched) {
          <mat-error>{{ 'Escribe el código' | t }}</mat-error>
        }
      </mat-form-field>
      <app-form-result [error]="error() || sendError()" [success]="info()" />
      @if (busy() || sending()) {
        <mat-progress-bar mode="indeterminate" [attr.aria-label]="'Verificando' | t" />
      }
      <div class="row">
        <button mat-stroked-button type="button" (click)="cancelled.emit()">{{ 'Cancelar' | t }}</button>
        @if (canSend()) {
          <button mat-button type="button" [disabled]="sending()" (click)="send()">{{ 'Enviar código' | t }}</button>
        }
        <button mat-flat-button type="submit" class="primary-action" [disabled]="busy()">
          {{ confirmLabel() }}
        </button>
      </div>
    </form>
  `,
  styles: `
    form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .lead {
      margin: 0;
    }
    .vias,
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .vias .selected {
      background: var(--mat-sys-secondary-container);
    }
    .field {
      width: 100%;
    }
  `,
})
export class MfaStepUpComponent {
  private readonly api = inject(MfaApi);

  /** Métodos activos con los que se puede confirmar. */
  readonly methods = input.required<MfaMethod[]>();
  /** Si quedan códigos de recuperación, también valen. */
  readonly hasRecovery = input(false);
  readonly confirmLabel = input(t('Confirmar'));
  readonly busy = input(false);
  /** Fallo de la acción, que sabe quien usa este componente. */
  readonly error = input<string | null>(null);
  readonly confirmed = output<MfaStepUp>();
  readonly cancelled = output<void>();

  protected readonly chosen = signal<MfaChallengeMethod | null>(null);
  protected readonly sending = signal(false);
  protected readonly sendError = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  protected readonly code = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  // `(ngSubmit)` solo existe dentro de un formGroup: sin él el formulario recargaría la página
  protected readonly form = new FormGroup({ code: this.code });

  protected readonly options = computed<MfaChallengeMethod[]>(() => [
    ...this.methods(),
    ...(this.hasRecovery() ? (['recovery'] as const) : []),
  ]);
  /** La aplicación autenticadora primero (no manda nada); si no, lo primero que haya. */
  protected readonly via = computed<MfaChallengeMethod>(() => {
    const options = this.options();
    const chosen = this.chosen();
    return chosen && options.includes(chosen) ? chosen : options.includes('totp') ? 'totp' : (options[0] ?? 'recovery');
  });
  protected readonly canSend = computed(() => this.via() === 'email' || this.via() === 'sms');
  protected readonly prompt = computed(() => {
    switch (this.via()) {
      case 'totp':
        return t('Para confirmar, escribe el código de tu aplicación autenticadora.');
      case 'recovery':
        return t('Para confirmar, escribe uno de tus códigos de recuperación.');
      default:
        return t('Para confirmar, pide un código y escríbelo aquí.');
    }
  });

  protected label = mfaMethodLabel;
  protected icon = mfaMethodIcon;

  protected choose(method: MfaChallengeMethod): void {
    this.chosen.set(method);
    this.code.reset('');
    this.sendError.set(null);
    this.info.set(null);
  }

  protected send(): void {
    const via = this.via();
    if ((via !== 'email' && via !== 'sms') || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.sendError.set(null);
    this.api.sessionSend(via).subscribe({
      next: (out) => {
        this.sending.set(false);
        this.info.set(t('Código enviado a {0}', [out.destination ?? '']));
      },
      error: (err: ApiError) => {
        this.sending.set(false);
        this.sendError.set(err.message);
      },
    });
  }

  protected submit(): void {
    this.code.markAsTouched();
    if (this.code.invalid || this.busy()) {
      return;
    }
    this.confirmed.emit({ via: this.via(), code: cleanCode(this.code.value) });
  }
}
