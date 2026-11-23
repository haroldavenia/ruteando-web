import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { SsoApi } from '../../../core/api/data/sso.api';
import { SsoProvider } from '../../../core/auth/sso.model';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { rememberSsoReturn } from './sso-return';

/**
 * Botones «Continuar con …» de la pantalla de acceso: solo los proveedores que el servidor ofrece (sin ninguno, no se pinta nada).
 * Entrar es una navegación del navegador al servidor (`/gateway/sso/<proveedor>/start`), que lo lleva al proveedor; el destino al
 * volver se guarda antes en `sessionStorage` y pasa por `safeReturnUrl` al terminar. El SSO de empresa pide antes el correo: su
 * dominio decide a qué proveedor se va.
 */
@Component({
  selector: 'app-sso-buttons',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (providers().length > 0) {
      <div class="sso" role="group" [attr.aria-label]="'Otras formas de entrar' | t">
        <p class="or">{{ 'o continúa con' | t }}</p>
        @for (p of providers(); track p.id) {
          @if (p.id === 'enterprise') {
            @if (asking()) {
              <form class="enterprise" (submit)="$event.preventDefault(); enterprise()" novalidate>
                <mat-form-field class="field">
                  <mat-label>{{ 'Correo de tu empresa' | t }}</mat-label>
                  <mat-icon matPrefix aria-hidden="true">badge</mat-icon>
                  <input matInput type="email" [formControl]="email" autocomplete="username" />
                  @if (email.invalid && email.touched) {
                    <mat-error>{{ 'Introduce un correo válido' | t }}</mat-error>
                  }
                </mat-form-field>
                <button mat-stroked-button type="submit">{{ 'Continuar' | t }}</button>
              </form>
            } @else {
              <button mat-stroked-button type="button" (click)="asking.set(true)">
                <mat-icon aria-hidden="true">badge</mat-icon>{{ 'Continuar con el SSO de mi empresa' | t }}
              </button>
            }
          } @else {
            <a mat-stroked-button [href]="url(p.id)" (click)="remember()">
              {{ 'Continuar con {0}' | t: [p.label] }}
            </a>
          }
        }
      </div>
    }
  `,
  styles: `
    .sso {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }
    .or {
      margin: 0;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .enterprise {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  `,
})
export class SsoButtonsComponent implements OnInit {
  private readonly api = inject(SsoApi);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Destino tras iniciar sesión (`?returnUrl=` de la pantalla de acceso). */
  readonly returnUrl = input<string | null>(null);

  protected readonly providers = signal<SsoProvider[]>([]);
  protected readonly asking = signal(false);
  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }
    // Sin lista (SSO apagado, servidor caído) simplemente no hay botones: el acceso con contraseña sigue igual
    this.api.providers().subscribe({
      next: (out) => this.providers.set(out.providers),
      error: () => this.providers.set([]),
    });
  }

  protected url(provider: string): string {
    return this.api.startUrl(provider);
  }

  protected remember(): void {
    rememberSsoReturn(this.returnUrl());
  }

  protected enterprise(): void {
    this.email.markAsTouched();
    if (this.email.invalid) {
      return;
    }
    this.remember();
    this.document.defaultView?.location.assign(this.api.startUrl('enterprise', this.email.value.trim()));
  }
}
