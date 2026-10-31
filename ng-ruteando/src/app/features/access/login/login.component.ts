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
import { safeReturnUrl } from '../../../core/auth/return-url';
import { FocusFirstInvalidDirective } from '../../../shared/form/focus-first-invalid.directive';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { PasswordFieldComponent } from '../../../shared/form/password-field.component';

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
    PasswordFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Bienvenido de nuevo</h1>
    <p class="lead">Inicia sesión para seguir tus rutas.</p>
    <form [formGroup]="form" (ngSubmit)="submit()" appFocusFirstInvalid novalidate>
      <mat-form-field class="field">
        <mat-label>Correo electrónico</mat-label>
        <mat-icon matPrefix aria-hidden="true">mail</mat-icon>
        <input matInput type="email" formControlName="email" autocomplete="username" />
        <mat-error>{{ emailError() }}</mat-error>
      </mat-form-field>
      <app-password-field
        [control]="form.controls.password"
        label="Contraseña"
        leadingIcon="lock"
        autocomplete="current-password"
        [messages]="{ required: 'Introduce tu contraseña' }"
      />
      <div class="forgot"><a routerLink="/acceso/recuperar">¿Olvidaste tu contraseña?</a></div>
      <app-form-result [error]="error()" />
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" aria-label="Iniciando sesión" />
      }
      <button mat-flat-button type="submit" [disabled]="loading()">Iniciar sesión</button>
    </form>
    <p class="alt">¿No tienes cuenta? <a routerLink="/acceso/registro">Crear cuenta</a></p>
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
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

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
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        const destination = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
        void this.router.navigateByUrl(destination);
      },
      error: (error: ApiError) => {
        this.loading.set(false);
        this.error.set(error.message);
        if (error.status === 401) {
          // Credenciales rechazadas: se vacía la contraseña y recibe el foco (el correo se conserva)
          // resetForm también borra «enviado»: sin él, el campo vacío saldría en rojo
          this.formDirective()?.resetForm({ email, password: '' });
          setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('input[autocomplete="current-password"]')?.focus());
        }
      },
    });
  }
}
