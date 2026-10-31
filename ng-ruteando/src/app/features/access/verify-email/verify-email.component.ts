import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { INVALID_LINK_MESSAGE } from '../../../core/auth/auth-messages';
import { FocusFirstInvalidDirective } from '../../../shared/form/focus-first-invalid.directive';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { notify } from '../../../shared/form/notify';

const RESEND_NEUTRAL = 'Si el correo existe, recibirás instrucciones de verificación';

/**
 * Verifica el correo con el `token` del enlace. El token es de un solo uso: se lee al crear la pantalla,
 * se retira de la URL (sin añadir una entrada al historial) y la llamada se hace una sola vez y solo en
 * el navegador, para que el render de servidor no lo consuma antes que el cliente.
 */
@Component({
  selector: 'app-verify-email',
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
    @if (state() === 'loading') {
      <div class="state">
        <span class="state-icon spin"><mat-icon aria-hidden="true">route</mat-icon></span>
        <h1>Verificar correo</h1>
        <p role="status">Verificando tu correo…</p>
        <mat-progress-bar mode="indeterminate" aria-label="Verificando el correo" />
      </div>
    } @else {
      <div class="state">
        <span class="state-icon bad"><mat-icon aria-hidden="true">link_off</mat-icon></span>
        <h1>Verificar correo</h1>
        <app-form-result [error]="message()" [success]="resendDone() ? resendMessage : null" />
        <p class="lead">Puedes pedir que te enviemos un enlace nuevo.</p>
        <form [formGroup]="form" (ngSubmit)="resend()" appFocusFirstInvalid novalidate>
          <mat-form-field class="field">
            <mat-label>Correo electrónico</mat-label>
            <mat-icon matPrefix aria-hidden="true">mail</mat-icon>
            <input matInput type="email" formControlName="email" autocomplete="username" />
            <mat-error>{{ emailError() }}</mat-error>
          </mat-form-field>
          <button mat-flat-button type="submit" [disabled]="resending()">Reenviar verificación</button>
        </form>
        <p class="alt"><a routerLink="/acceso">Ir a iniciar sesión</a></p>
      </div>
    }
  `,
})
export class VerifyEmailComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private started = false;
  private readonly token = this.route.snapshot.queryParamMap.get('token');

  protected readonly state = signal<'loading' | 'failed'>('loading');
  protected readonly message = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly resending = signal(false);
  protected readonly resendDone = signal(false);
  protected readonly resendMessage = RESEND_NEUTRAL;

  constructor() {
    // afterNextRender no se ejecuta en el servidor: allí no se consume el token
    afterNextRender(() => this.start());
  }

  protected emailError(): string {
    const errors = this.form.controls.email.errors;
    if (errors?.['required']) {
      return 'Introduce tu correo';
    }
    return errors?.['email'] ? 'Introduce un correo válido' : '';
  }

  private start(): void {
    // El token es de un solo uso: el servidor nunca lo consume (aunque el hook de render llegara a ejecutarse)
    if (!this.isBrowser || this.started) {
      return;
    }
    this.started = true;
    // Fuera del historial y de la barra de direcciones, antes de cualquier otra cosa
    void this.router.navigate([], { relativeTo: this.route, queryParams: { token: null }, queryParamsHandling: 'merge', replaceUrl: true });

    if (!this.token) {
      this.fail(INVALID_LINK_MESSAGE);
      return;
    }
    this.auth.verifyEmail(this.token).subscribe({
      next: () => {
        void this.router.navigateByUrl('/').then(() => notify(this.injector, 'Correo verificado'));
      },
      error: (error: ApiError) => this.fail(error.message),
    });
  }

  private fail(message: string): void {
    this.message.set(message);
    this.state.set('failed');
  }

  protected resend(): void {
    if (this.form.invalid || this.resending()) {
      return;
    }
    this.resending.set(true);
    this.resendDone.set(false);
    this.message.set(null);
    this.auth.resendVerification(this.form.getRawValue().email).subscribe({
      next: () => {
        this.resending.set(false);
        this.resendDone.set(true);
      },
      error: (error: ApiError) => {
        this.resending.set(false);
        this.message.set(error.message);
      },
    });
  }
}
