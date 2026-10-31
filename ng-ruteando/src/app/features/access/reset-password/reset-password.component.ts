import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, PLATFORM_ID, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { INVALID_LINK_MESSAGE } from '../../../core/auth/auth-messages';
import { passwordPolicy } from '../../../core/auth/password-policy';
import { FocusFirstInvalidDirective } from '../../../shared/form/focus-first-invalid.directive';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { matchesSibling, revalidateOnPasswordChange } from '../shared/form-utils';
import { notify } from '../../../shared/form/notify';
import { PasswordFieldComponent } from '../../../shared/form/password-field.component';

/** Estados del gateway que indican que el enlace ya no sirve (el gateway no documenta cuál usa). */
const LINK_ERRORS = [400, 401, 404, 410];
/** Códigos de un 400 que culpan a la contraseña o a los datos escritos, no al enlace: el token sigue valiendo. */
const FORM_ERROR_CODES = ['PASSWORD_POLICY_VIOLATION', 'VALIDATION_ERROR'];

@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    FocusFirstInvalidDirective,
    FormResultComponent,
    PasswordFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (linkInvalid()) {
      <div class="state">
        <span class="state-icon bad"><mat-icon aria-hidden="true">link_off</mat-icon></span>
        <h1>Restablecer contraseña</h1>
        <app-form-result [error]="invalidMessage" />
        <p class="alt"><a routerLink="/acceso/recuperar">Solicitar un enlace nuevo</a></p>
      </div>
    } @else {
      <h1>Restablecer contraseña</h1>
      <form [formGroup]="form" (ngSubmit)="submit()" appFocusFirstInvalid novalidate>
        <app-password-field
          [control]="form.controls.password"
          label="Contraseña nueva"
          leadingIcon="lock"
          autocomplete="new-password"
          [requirements]="true"
          [messages]="{ required: 'Introduce una contraseña' }"
        />
        <app-password-field
          [control]="form.controls.confirm"
          label="Confirmar contraseña"
          leadingIcon="lock"
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
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** El token se guarda en memoria hasta el envío; en la URL solo está hasta que se lee. */
  private readonly token = this.route.snapshot.queryParamMap.get('token');

  protected readonly invalidMessage = INVALID_LINK_MESSAGE;
  protected readonly linkInvalid = signal(!this.token);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    password: ['', [Validators.required, passwordPolicy]],
    confirm: ['', [Validators.required, matchesSibling('password')]],
  });
  private readonly formDirective = viewChild(FormGroupDirective);
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
        this.formDirective()?.resetForm({ password: '', confirm: '' });
        const blamesForm = error.code !== null && FORM_ERROR_CODES.includes(error.code);
        if (LINK_ERRORS.includes(error.status) && !blamesForm) {
          this.linkInvalid.set(true);
          return;
        }
        this.error.set(error.message);
        if (blamesForm) {
          // El enlace sigue siendo válido: con las contraseñas vacías, el foco vuelve a la nueva para reintentar
          setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('input[autocomplete="new-password"]')?.focus());
        }
      },
    });
  }
}
