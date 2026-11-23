import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { MfaChallenge, MfaEnrollChallenge } from '../../../core/auth/mfa.model';
import { ssoErrorMessage } from '../../../core/auth/sso-messages';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { MfaEnrollStepComponent } from '../login/mfa-enroll-step.component';
import { MfaVerifyStepComponent } from '../login/mfa-verify-step.component';
import { takeSsoReturn } from './sso-return';

/**
 * Regreso del proveedor (`/access/sso#ticket=…` o `#error=…`). El servidor deja el resultado en el fragmento (no viaja en peticiones
 * ni en `Referer`); aquí se quita de la dirección, se canjea el ticket (de un solo uso) y se sigue como un inicio de sesión normal: sesión,
 * o el segundo paso si la persona o su empresa lo exigen.
 */
@Component({
  selector: 'app-sso-complete',
  imports: [
    MatButtonModule,
    MatProgressBarModule,
    RouterLink,
    FormResultComponent,
    MfaEnrollStepComponent,
    MfaVerifyStepComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (step()) {
      @case ('verify') {
        @if (challenge(); as pending) {
          <app-mfa-verify-step [challenge]="pending" (verified)="finish()" (cancelled)="fail($event)" />
        }
      }
      @case ('enroll') {
        @if (enroll(); as pending) {
          <app-mfa-enroll-step [enroll]="pending" (verified)="finish()" (cancelled)="fail($event)" />
        }
      }
      @case ('error') {
        <h1>{{ 'No se pudo iniciar sesión' | t }}</h1>
        <app-form-result [error]="error()" />
        <a mat-flat-button routerLink="/access">{{ 'Volver al inicio de sesión' | t }}</a>
      }
      @default {
        <h1>{{ 'Iniciando sesión' | t }}</h1>
        <mat-progress-bar mode="indeterminate" [attr.aria-label]="'Iniciando sesión' | t" />
      }
    }
  `,
})
export class SsoCompleteComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  protected readonly step = signal<'working' | 'verify' | 'enroll' | 'error'>('working');
  protected readonly error = signal<string | null>(null);
  protected readonly challenge = signal<MfaChallenge | null>(null);
  protected readonly enroll = signal<MfaEnrollChallenge | null>(null);

  ngOnInit(): void {
    const params = new URLSearchParams(this.route.snapshot.fragment ?? '');
    // El ticket no debe quedarse en la barra de direcciones ni en el historial
    this.location.replaceState(this.location.path().split('#')[0]);
    const ticket = params.get('ticket');
    if (!ticket) {
      this.fail(ssoErrorMessage(params.get('error')));
      return;
    }
    this.auth.completeSso(ticket).subscribe({
      next: (result) => {
        if (result.kind === 'session') {
          this.finish();
        } else if (result.kind === 'challenge') {
          this.challenge.set(result.challenge);
          this.step.set('verify');
        } else {
          this.enroll.set(result.enroll);
          this.step.set('enroll');
        }
      },
      error: (error: ApiError) => this.fail(error.message),
    });
  }

  /** Sesión abierta (con o sin segundo factor): al destino que se guardó antes de salir. */
  protected finish(): void {
    void this.router.navigateByUrl(takeSsoReturn());
  }

  protected fail(message: string): void {
    this.challenge.set(null);
    this.enroll.set(null);
    this.error.set(message || ssoErrorMessage(null));
    this.step.set('error');
  }
}
