import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ApiError } from '../../../core/api/api-error';
import { MfaApi } from '../../../core/api/data/mfa.api';
import { AuthService } from '../../../core/auth/auth.service';
import { MfaChallenge, MfaChallengeMethod, MfaMethodOption } from '../../../core/auth/mfa.model';
import { t } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { cleanCode, mfaMethodIcon, mfaMethodLabel } from '../../../shared/mfa/mfa-labels';

/** Códigos del servidor tras los que el reto ya no sirve: hay que volver a escribir la contraseña. */
const DEAD_CHALLENGE = ['CHALLENGE_EXPIRED', 'TOO_MANY_ATTEMPTS', 'TOO_MANY_FAILURES'];

/**
 * Segundo paso del acceso: la persona supera el reto con un método activo (correo, SMS, aplicación autenticadora) o con un código
 * de recuperación. La sesión solo se abre al acertar (`AuthService.verifyMfa`); hasta entonces no hay ningún token en el navegador.
 */
@Component({
  selector: 'app-mfa-verify-step',
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
    <h1>{{ 'Verificación en dos pasos' | t }}</h1>
    @if (picking()) {
      <p class="lead">{{ 'Elige cómo quieres verificar tu identidad.' | t }}</p>
      <ul class="choices">
        @for (m of choices(); track m.method) {
          <li>
            <button type="button" class="choice" (click)="select(m.method)">
              <mat-icon aria-hidden="true">{{ icon(m.method) }}</mat-icon>
              <span class="choice-text">
                <strong>{{ label(m.method) }}</strong>
                <small>{{ hint(m) }}</small>
              </span>
              <mat-icon aria-hidden="true">chevron_right</mat-icon>
            </button>
          </li>
        }
      </ul>
      @if (hasRecovery()) {
        <p class="alt">
          <button type="button" class="link" (click)="select('recovery')">
            {{ '¿No puedes usar ninguno? Usa un código de recuperación' | t }}
          </button>
        </p>
      }
      <p class="alt">
        <button type="button" class="link" (click)="cancelled.emit('')">{{ 'Volver' | t }}</button>
      </p>
    } @else {
      <p class="lead">{{ prompt() }}</p>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <mat-form-field class="field">
          <mat-label>{{ method() === 'recovery' ? ('Código de recuperación' | t) : ('Código' | t) }}</mat-label>
          <mat-icon matPrefix aria-hidden="true">{{ icon(method()) }}</mat-icon>
          <input
            #codeInput
            matInput
            [attr.inputmode]="method() === 'recovery' ? 'text' : 'numeric'"
            autocomplete="one-time-code"
            formControlName="code"
          />
          @if (code.invalid && code.touched) {
            <mat-error>{{ 'Escribe el código' | t }}</mat-error>
          }
        </mat-form-field>
        <app-form-result [error]="error()" [success]="info()" />
        @if (loading()) {
          <mat-progress-bar mode="indeterminate" [attr.aria-label]="'Verificando' | t" />
        }
        <button mat-flat-button type="submit" [disabled]="loading()">{{ 'Verificar' | t }}</button>
      </form>
      @if (canResend()) {
        <p class="alt">
          <button type="button" class="link" [disabled]="loading()" (click)="send()">
            {{ 'Reenviar código' | t }}
          </button>
        </p>
      }
      @if (choices().length > 1) {
        <p class="alt">
          <button type="button" class="link" (click)="back()">{{ 'Elegir otro método' | t }}</button>
        </p>
      } @else if (others().length) {
        <p class="alt">
          {{ 'Usar otro método:' | t }}
          @for (m of others(); track m.method; let last = $last) {
            <button type="button" class="link" (click)="select(m.method)">{{ label(m.method) }}</button
            >{{ last ? '' : ' · ' }}
          }
        </p>
      }
      <p class="alt">
        <button type="button" class="link" (click)="cancelled.emit('')">{{ 'Volver' | t }}</button>
      </p>
    }
  `,
  styles: `
    .choices {
      display: grid;
      gap: 10px;
      margin: 0 0 8px;
      padding: 0;
      list-style: none;
    }
    .choice {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      min-height: 64px;
      padding: 12px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .choice:hover {
      background: var(--mat-sys-surface-container);
      border-color: var(--mat-sys-primary);
    }
    .choice:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }
    .choice-text {
      display: grid;
      flex: 1;
      min-width: 0;
      gap: 2px;
    }
    .choice-text strong {
      font-weight: 500;
    }
    .choice-text small {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.8125rem;
      overflow-wrap: anywhere;
    }
    .link {
      padding: 0;
      border: 0;
      background: none;
      color: var(--mat-sys-primary);
      font: inherit;
      text-decoration: underline;
      cursor: pointer;
    }
    .link:disabled {
      opacity: 0.6;
      cursor: default;
    }
  `,
})
export class MfaVerifyStepComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(MfaApi);

  readonly challenge = input.required<MfaChallenge>();
  /** La sesión ya está abierta. */
  readonly verified = output<void>();
  /** Hay que volver al primer paso; el texto explica por qué (vacío si la persona solo volvió). */
  readonly cancelled = output<string>();

  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');
  private readonly chosen = signal<MfaChallengeMethod | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  protected readonly code = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  // `(ngSubmit)` solo existe dentro de un formGroup: sin él el formulario recargaría la página
  protected readonly form = new FormGroup({ code: this.code });

  /** Los métodos que la persona tiene activos (correo, SMS, aplicación); el código de recuperación va aparte. */
  protected readonly choices = computed(() => this.challenge().methods.filter((m) => m.method !== 'recovery'));
  protected readonly hasRecovery = computed(() => this.challenge().methods.some((m) => m.method === 'recovery'));
  /** Con más de un método activo se pregunta cuál usar antes de pedir o enviar nada; con uno solo se va directo. */
  protected readonly picking = computed(() => this.chosen() === null && this.choices().length > 1);
  protected readonly method = computed<MfaChallengeMethod>(
    () => this.chosen() ?? this.choices()[0]?.method ?? 'recovery'
  );
  protected readonly others = computed(() => this.challenge().methods.filter((m) => m.method !== this.method()));
  protected readonly canResend = computed(() => this.method() === 'email' || this.method() === 'sms');
  protected readonly prompt = computed(() => {
    const method = this.method();
    const destination = this.challenge().methods.find((m) => m.method === method)?.destination ?? '';
    switch (method) {
      case 'totp':
        return t('Escribe el código de 6 dígitos de tu aplicación autenticadora.');
      case 'recovery':
        return t('Escribe uno de tus códigos de recuperación. Cada uno sirve una sola vez.');
      default:
        return t('Te enviamos un código a {0}. Escríbelo para continuar.', [destination]);
    }
  });

  protected label = mfaMethodLabel;
  protected icon = mfaMethodIcon;

  constructor() {
    // Al elegir o cambiar de método el foco va al campo del código (si el selector está abierto no hay campo)
    effect(() => {
      this.method();
      this.picking();
      setTimeout(() => this.codeInput()?.nativeElement.focus());
    });
  }

  ngOnInit(): void {
    if (!this.picking() && this.canResend()) {
      this.send();
    }
  }

  protected hint(option: MfaMethodOption): string {
    return option.method === 'totp'
      ? t('Código de 6 dígitos de tu aplicación')
      : t('Te enviaremos un código a {0}', [option.destination ?? '']);
  }

  /** Vuelve al selector de método. */
  protected back(): void {
    this.chosen.set(null);
    this.code.reset('');
    this.error.set(null);
    this.info.set(null);
  }

  protected select(method: MfaChallengeMethod): void {
    this.chosen.set(method);
    this.code.reset('');
    this.error.set(null);
    this.info.set(null);
    if (this.canResend()) {
      this.send();
    }
  }

  protected send(): void {
    const method = this.method();
    if ((method !== 'email' && method !== 'sms') || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.api.loginSend(this.challenge().challengeId, method).subscribe({
      next: (out) => {
        this.loading.set(false);
        this.info.set(t('Código enviado a {0}', [out.destination ?? '']));
      },
      error: (err: ApiError) => this.fail(err),
    });
  }

  protected submit(): void {
    this.code.markAsTouched();
    if (this.code.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.info.set(null);
    this.auth.verifyMfa(this.challenge().challengeId, this.method(), cleanCode(this.code.value)).subscribe({
      next: () => this.verified.emit(),
      error: (err: ApiError) => {
        this.fail(err);
        this.code.reset('');
        setTimeout(() => this.codeInput()?.nativeElement.focus());
      },
    });
  }

  private fail(err: ApiError): void {
    this.loading.set(false);
    if (err.code && DEAD_CHALLENGE.includes(err.code)) {
      this.cancelled.emit(err.message);
      return;
    }
    this.error.set(err.message);
  }
}
