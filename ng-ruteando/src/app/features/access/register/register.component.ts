import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { ApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { passwordPolicy } from '../../../core/auth/password-policy';
import { firstErrorMessage } from '../../../shared/form/access.messages';
import { FocusFirstInvalidDirective } from '../../../shared/form/focus-first-invalid.directive';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { matchesSibling, revalidateOnPasswordChange } from '../shared/form-utils';
import { PasswordFieldComponent } from '../../../shared/form/password-field.component';

interface TextField {
  name: 'firstName' | 'lastName' | 'tenantName' | 'email';
  label: string;
  type: 'text' | 'email';
  autocomplete: string;
  required: string;
}

const RESEND_NEUTRAL = 'Si el correo existe, recibirás instrucciones de verificación';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    FocusFirstInvalidDirective,
    FormResultComponent,
    PasswordFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (registeredEmail(); as sentTo) {
      <h1>Revisa tu correo</h1>
      <p>
        Hemos enviado un enlace de verificación a <strong>{{ sentTo }}</strong
        >. Ábrelo para activar tu cuenta.
      </p>
      <app-form-result [error]="resendError()" [success]="resendDone() ? resendMessage : null" />
      <div class="actions">
        <button mat-stroked-button type="button" [disabled]="resending()" (click)="resend(sentTo)">Reenviar correo</button>
        <a mat-button routerLink="/acceso">Ir a iniciar sesión</a>
      </div>
    } @else {
      <h1>Crear cuenta</h1>
      <form [formGroup]="form" (ngSubmit)="submit()" appFocusFirstInvalid novalidate>
        @for (field of textFields; track field.name) {
          <mat-form-field class="field">
            <mat-label>{{ field.label }}</mat-label>
            <input matInput [type]="field.type" [formControlName]="field.name" [attr.autocomplete]="field.autocomplete" />
            <mat-error>{{ textError(field) }}</mat-error>
          </mat-form-field>
        }
        <app-password-field
          [control]="form.controls.password"
          label="Contraseña"
          autocomplete="new-password"
          [requirements]="true"
          [messages]="{ required: 'Introduce una contraseña' }"
        />
        <app-password-field
          [control]="form.controls.confirm"
          label="Confirmar contraseña"
          autocomplete="new-password"
          [messages]="{ required: 'Confirma tu contraseña' }"
        />
        <app-form-result [error]="error()" />
        @if (loading()) {
          <mat-progress-bar mode="indeterminate" aria-label="Creando la cuenta" />
        }
        <button mat-flat-button type="submit" [disabled]="loading()">Crear cuenta</button>
      </form>
      <p class="alt">¿Ya tienes cuenta? <a routerLink="/acceso">Iniciar sesión</a></p>
    }
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly textFields: readonly TextField[] = [
    { name: 'firstName', label: 'Nombre', type: 'text', autocomplete: 'given-name', required: 'Introduce tu nombre' },
    { name: 'lastName', label: 'Apellidos', type: 'text', autocomplete: 'family-name', required: 'Introduce tus apellidos' },
    { name: 'tenantName', label: 'Nombre de la empresa', type: 'text', autocomplete: 'organization', required: 'Introduce el nombre de tu empresa' },
    { name: 'email', label: 'Correo electrónico', type: 'email', autocomplete: 'username', required: 'Introduce tu correo' },
  ];

  protected readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    tenantName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordPolicy]],
    confirm: ['', [Validators.required, matchesSibling('password')]],
  });

  private readonly formDirective = viewChild(FormGroupDirective);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Correo con el que se registró: al tener valor se muestra el panel "Revisa tu correo". */
  protected readonly registeredEmail = signal<string | null>(null);
  protected readonly resending = signal(false);
  protected readonly resendDone = signal(false);
  protected readonly resendError = signal<string | null>(null);
  protected readonly resendMessage = RESEND_NEUTRAL;

  constructor() {
    revalidateOnPasswordChange(this.form, 'password', 'confirm');
  }

  protected textError(field: TextField): string {
    return firstErrorMessage(this.form.controls[field.name].errors, { required: field.required });
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { confirm: _confirm, ...input } = this.form.getRawValue();
    this.auth.register(input).subscribe({
      next: () => {
        this.loading.set(false);
        this.clearPasswords();
        this.registeredEmail.set(input.email);
      },
      error: (error: ApiError) => {
        this.loading.set(false);
        this.clearPasswords();
        this.error.set(error.message);
        if (error.code === 'PASSWORD_POLICY_VIOLATION') {
          // Las contraseñas se han vaciado: el foco vuelve a la primera para escribir otra
          setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('input[autocomplete="new-password"]')?.focus());
        }
      },
    });
  }

  protected resend(email: string): void {
    if (this.resending()) {
      return;
    }
    this.resending.set(true);
    this.resendDone.set(false);
    this.resendError.set(null);
    this.auth.resendVerification(email).subscribe({
      next: () => {
        this.resending.set(false);
        this.resendDone.set(true);
      },
      error: (error: ApiError) => {
        this.resending.set(false);
        this.resendError.set(error.message);
      },
    });
  }

  private clearPasswords(): void {
    // resetForm también borra «enviado»: sin él, los campos vacíos saldrían en rojo
    this.formDirective()?.resetForm({ ...this.form.getRawValue(), password: '', confirm: '' });
  }
}
