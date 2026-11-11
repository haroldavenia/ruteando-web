import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { MfaEnrollChallenge } from '../../../core/auth/mfa.model';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { MfaEnrollComponent, MfaEnrollment } from '../../../shared/mfa/mfa-enroll.component';
import { RecoveryCodesComponent } from '../../../shared/mfa/recovery-codes.component';

/**
 * Segundo paso cuando la empresa exige el segundo factor y la persona aún no tiene ninguno: activa un método con el reto (sin sesión),
 * guarda los códigos de recuperación y solo entonces el servidor entrega la sesión.
 */
@Component({
  selector: 'app-mfa-enroll-step',
  imports: [MatProgressBarModule, FormResultComponent, MfaEnrollComponent, RecoveryCodesComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ 'Activa la verificación en dos pasos' | t }}</h1>
    @if (codes(); as list) {
      <p class="lead">{{ 'Método activado. Guarda tus códigos de recuperación antes de entrar.' | t }}</p>
      <app-recovery-codes [codes]="list" (saved)="finish()" />
    } @else {
      <p class="lead">{{ 'Tu empresa exige un segundo factor. Activa uno para poder entrar.' | t }}</p>
      <app-mfa-enroll [methods]="enroll().methods" [challengeId]="enroll().challengeId" (enrolled)="enrolled($event)" />
    }
    <app-form-result [error]="error()" />
    @if (loading()) {
      <mat-progress-bar mode="indeterminate" [attr.aria-label]="'Entrando' | t" />
    }
  `,
})
export class MfaEnrollStepComponent {
  private readonly auth = inject(AuthService);

  readonly enroll = input.required<MfaEnrollChallenge>();
  readonly verified = output<void>();
  readonly cancelled = output<string>();

  protected readonly codes = signal<string[] | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected enrolled(result: MfaEnrollment): void {
    if (result.recoveryCodes?.length) {
      this.codes.set(result.recoveryCodes);
    } else {
      this.finish();
    }
  }

  protected finish(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.completeMfaEnrollment(this.enroll().challengeId).subscribe({
      next: () => this.verified.emit(),
      error: (err: ApiError) => {
        this.loading.set(false);
        if (err.code === 'CHALLENGE_EXPIRED') {
          this.cancelled.emit(err.message);
        } else {
          this.error.set(err.message);
        }
      },
    });
  }
}
