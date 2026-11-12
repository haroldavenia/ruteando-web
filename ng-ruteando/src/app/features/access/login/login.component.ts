import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { MfaChallenge, MfaEnrollChallenge } from '../../../core/auth/mfa.model';
import { safeReturnUrl } from '../../../core/auth/return-url';
import { t } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FocusFirstInvalidDirective } from '../../../shared/form/focus-first-invalid.directive';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { PasswordFieldComponent } from '../../../shared/form/password-field.component';
import { SsoButtonsComponent } from '../sso/sso-buttons.component';
import { MfaEnrollStepComponent } from './mfa-enroll-step.component';
import { MfaVerifyStepComponent } from './mfa-verify-step.component';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    FocusFirstInvalidDirective,
    FormResultComponent,
    MfaEnrollStepComponent,
    MfaVerifyStepComponent,
    PasswordFieldComponent,
    SsoButtonsComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (step()) {
      @case ('verify') {
        @if (challenge(); as pending) {
          <app-mfa-verify-step [challenge]="pending" (verified)="finish()" (cancelled)="restart($event)" />
        }
      }
      @case ('enroll') {
        @if (enroll(); as pending) {
          <app-mfa-enroll-step [enroll]="pending" (verified)="finish()" (cancelled)="restart($event)" />
        }
      }
      @default {
        <h1>{{ 'Bienvenido de nuevo' | t }}</h1>
        <p class="lead">{{ 'Inicia sesión para seguir tus rutas.' | t }}</p>
        <form [formGroup]="form" (ngSubmit)="submit()" appFocusFirstInvalid novalidate>
          <mat-form-field class="field">
            <mat-label>{{ 'Correo electrónico' | t }}</mat-label>
            <mat-icon matPrefix aria-hidden="true">mail</mat-icon>
            <input matInput type="email" formControlName="email" autocomplete="username" />
            <mat-error>{{ emailError() }}</mat-error>
          </mat-form-field>
          <app-password-field
            [control]="form.controls.password"
            [label]="'Contraseña' | t"
            leadingIcon="lock"
            autocomplete="current-password"
            [messages]="{ required: ('Introduce tu contraseña' | t) }"
          />
          <div class="forgot">
            <a routerLink="/access/recover">{{ '¿Olvidaste tu contraseña?' | t }}</a>
          </div>
          <app-form-result [error]="error()" />
          @if (loading()) {
            <mat-progress-bar mode="indeterminate" [attr.aria-label]="'Iniciando sesión' | t" />
          }
          <button mat-flat-button type="submit" [disabled]="loading()">{{ 'Iniciar sesión' | t }}</button>
        </form>
        <app-sso-buttons [returnUrl]="returnUrl" />
        <p class="alt">
          {{ '¿No tienes cuenta?' | t }} <a routerLink="/access/register">{{ 'Crear cuenta' | t }}</a>
        </p>
      }
    }
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  private readonly formDirective = viewChild(FormGroupDirective);
  protected readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Primer paso (credenciales), o el reto de segundo factor que el servidor devolvió. */
  protected readonly step = signal<'credentials' | 'verify' | 'enroll'>('credentials');
  protected readonly challenge = signal<MfaChallenge | null>(null);
  protected readonly enroll = signal<MfaEnrollChallenge | null>(null);

  protected emailError(): string {
    const errors = this.form.controls.email.errors;
    if (errors?.['required']) {
      return t('Introduce tu correo');
    }
    return errors?.['email'] ? t('Introduce un correo válido') : '';
  }

  /** Sesión abierta (con o sin segundo factor): al destino de siempre. */
  protected finish(): void {
    const destination = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
    void this.router.navigateByUrl(destination);
  }

  /** El reto ya no sirve (caducó, se agotaron los intentos) o la persona volvió: otra vez las credenciales. */
  protected restart(message: string): void {
    this.challenge.set(null);
    this.enroll.set(null);
    this.step.set('credentials');
    this.loading.set(false);
    this.error.set(message || null);
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (result) => {
        if (result.kind === 'session') {
          this.finish();
          return;
        }
        // Segundo factor: la contraseña ya no hace falta y no se conserva; la sesión llegará al superar el reto
        this.form.controls.password.reset('');
        this.loading.set(false);
        if (result.kind === 'challenge') {
          this.challenge.set(result.challenge);
          this.step.set('verify');
        } else {
          this.enroll.set(result.enroll);
          this.step.set('enroll');
        }
      },
      error: (error: ApiError) => {
        this.loading.set(false);
        this.error.set(error.message);
        if (error.status === 401) {
          // Credenciales rechazadas: se vacía la contraseña y recibe el foco (el correo se conserva)
          // resetForm también borra «enviado»: sin él, el campo vacío saldría en rojo
          this.formDirective()?.resetForm({ email, password: '' });
          setTimeout(() =>
            this.host.nativeElement.querySelector<HTMLInputElement>('input[autocomplete="current-password"]')?.focus()
          );
        }
      },
    });
  }
}
