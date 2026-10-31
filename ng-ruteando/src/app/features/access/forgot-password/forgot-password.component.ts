import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { ApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { FocusFirstInvalidDirective } from '../../../shared/form/focus-first-invalid.directive';
import { FormResultComponent } from '../../../shared/form/form-result.component';

/** Texto fijo: no depende de la respuesta del gateway para no revelar si la cuenta existe. */
const NEUTRAL_MESSAGE = 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña';

@Component({
  selector: 'app-forgot-password',
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sent()) {
      <div class="state">
        <span class="state-icon"><mat-icon aria-hidden="true">mark_email_unread</mat-icon></span>
        <h1>Revisa tu correo</h1>
        <app-form-result [success]="neutralMessage" />
      </div>
    } @else {
      <h1>Recuperar contraseña</h1>
      <p class="lead">Escribe tu correo y te enviaremos un enlace para elegir una contraseña nueva.</p>
      <form [formGroup]="form" (ngSubmit)="submit()" appFocusFirstInvalid novalidate>
        <mat-form-field class="field">
          <mat-label>Correo electrónico</mat-label>
          <mat-icon matPrefix aria-hidden="true">mail</mat-icon>
          <input matInput type="email" formControlName="email" autocomplete="username" />
          <mat-error>{{ emailError() }}</mat-error>
        </mat-form-field>
        <app-form-result [error]="error()" />
        @if (loading()) {
          <mat-progress-bar mode="indeterminate" aria-label="Enviando la solicitud" />
        }
        <button mat-flat-button type="submit" [disabled]="loading()">Enviar enlace</button>
      </form>
    }
    <p class="alt"><a routerLink="/acceso">Volver a iniciar sesión</a></p>
  `,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sent = signal(false);
  protected readonly neutralMessage = NEUTRAL_MESSAGE;

  protected emailError(): string {
    const errors = this.form.controls.email.errors;
    if (errors?.['required']) {
      return 'Introduce tu correo';
    }
    return errors?.['email'] ? 'Introduce un correo válido' : '';
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: (error: ApiError) => {
        this.loading.set(false);
        this.error.set(error.message);
      },
    });
  }
}
