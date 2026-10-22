import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { INVALID_LINK_MESSAGE } from '../../../core/auth/auth-messages';
import { FocusFirstInvalidDirective } from '../shared/focus-first-invalid.directive';
import { FormResultComponent } from '../shared/form-result.component';
import { PASSWORD_MIN_LENGTH, matchesSibling, revalidateOnPasswordChange } from '../shared/form-utils';
import { notify } from '../shared/notify';
import { PasswordFieldComponent } from '../shared/password-field.component';

/** Estados del gateway que indican que el enlace ya no sirve (el gateway no documenta cuál usa). */
const LINK_ERRORS = [400, 401, 404, 410];

@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatProgressBarModule,
    FocusFirstInvalidDirective,
    FormResultComponent,
    PasswordFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Restablecer contraseña</h1>
    @if (linkInvalid()) {
      <app-form-result [error]="invalidMessage" />
      <p class="alt"><a routerLink="/acceso/recuperar">Solicitar un enlace nuevo</a></p>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" appFocusFirstInvalid novalidate>
        <app-password-field
          [control]="form.controls.password"
          label="Contraseña nueva"
          autocomplete="new-password"
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
          <mat-progress-bar mode="indeterminate" aria-label="Cambiando la contraseña" />
        }
        <button mat-flat-button type="submit" [disabled]="loading()">Cambiar contraseña</button>
      </form>
    }
  `,
  styles: `
    h1 {
      margin: 0 0 16px;
      font: var(--mat-sys-headline-small);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .alt {
      margin-top: 16px;
    }
  `,
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  /** El token se guarda en memoria hasta el envío; en la URL solo está hasta que se lee. */
  private readonly token = this.route.snapshot.queryParamMap.get('token');

  protected readonly invalidMessage = INVALID_LINK_MESSAGE;
  protected readonly linkInvalid = signal(!this.token);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
    confirm: ['', [Validators.required, matchesSibling('password')]],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    revalidateOnPasswordChange(this.form, 'password', 'confirm');
    afterNextRender(() => {
      if (this.isBrowser) {
        // Fuera del historial y de la barra de direcciones
        void this.router.navigate([], { relativeTo: this.route, queryParams: { token: null }, queryParamsHandling: 'merge', replaceUrl: true });
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.loading() || !this.token) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: () => {
        void this.router.navigateByUrl('/acceso').then(() => notify(this.injector, 'Contraseña actualizada, ya puedes iniciar sesión'));
      },
      error: (error: ApiError) => {
        this.loading.set(false);
        this.form.reset({ password: '', confirm: '' });
        if (LINK_ERRORS.includes(error.status)) {
          this.linkInvalid.set(true);
        } else {
          this.error.set(error.message);
        }
      },
    });
  }
}
