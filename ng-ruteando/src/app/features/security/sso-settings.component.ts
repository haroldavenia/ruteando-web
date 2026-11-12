import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Observable } from 'rxjs';

import { ApiError } from '../../core/api/api-error';
import { SsoApi } from '../../core/api/data/sso.api';
import { SsoEnterprise, SsoPolicy } from '../../core/auth/sso.model';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { FormResultComponent } from '../../shared/form/form-result.component';

/** Separa por comas, espacios o saltos de línea; minúsculas y sin repetidos. */
export function parseDomains(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

/**
 * Inicio de sesión único de la empresa (solo administradores): si se permite entrar con SSO y, si el servidor lo ofrece, el
 * proveedor OpenID Connect propio de la empresa (emisor, cliente, secreto y dominios de correo). El secreto se guarda cifrado y nunca
 * vuelve al navegador. No pinta nada si el servidor no tiene el SSO activado.
 */
@Component({
  selector: 'app-sso-settings',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    FormResultComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (policy(); as p) {
      <section class="card" aria-labelledby="sso-title">
        <h2 id="sso-title" class="card-title">{{ 'Inicio de sesión único' | t }}</h2>
        <p class="muted">
          {{
            'Permite que las personas de tu empresa entren con su cuenta de un proveedor, en lugar de la contraseña.'
              | t
          }}
        </p>
        <app-form-result [error]="error()" [success]="notice()" />
        <div class="row">
          <mat-icon aria-hidden="true">link</mat-icon>
          <div class="info">
            <strong>{{ 'Permitir el inicio de sesión único' | t }}</strong>
            <span class="muted">{{ providerNames() }}</span>
          </div>
          <mat-slide-toggle
            [checked]="p.enabled"
            [disabled]="busy()"
            [aria-label]="'Permitir el inicio de sesión único' | t"
            (change)="toggle($event.checked)"
          />
        </div>

        @if (enterprise(); as e) {
          @if (e.available) {
            <h3 class="sub">{{ 'Proveedor de tu empresa (OpenID Connect)' | t }}</h3>
            <p class="muted">
              {{ 'Registra esta dirección de regreso en tu proveedor y copia aquí sus datos.' | t }}
              <code>{{ e.redirectUri }}</code>
            </p>
            <form class="provider" [formGroup]="form" (ngSubmit)="save()" novalidate>
              <mat-form-field>
                <mat-label>{{ 'Nombre' | t }}</mat-label>
                <input matInput formControlName="name" maxlength="80" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>{{ 'Emisor (URL https)' | t }}</mat-label>
                <input matInput type="url" formControlName="issuer" placeholder="https://login.empresa.com" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>{{ 'Identificador de cliente' | t }}</mat-label>
                <input matInput formControlName="clientId" autocomplete="off" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>{{ 'Secreto de cliente' | t }}</mat-label>
                <input matInput type="password" formControlName="clientSecret" autocomplete="new-password" />
                @if (e.hasSecret) {
                  <mat-hint>{{ 'Déjalo vacío para conservar el guardado' | t }}</mat-hint>
                }
              </mat-form-field>
              <mat-form-field>
                <mat-label>{{ 'Dominios de correo' | t }}</mat-label>
                <input matInput formControlName="domains" placeholder="empresa.com, filial.com" />
                <mat-hint>{{ 'Separados por comas' | t }}</mat-hint>
              </mat-form-field>
              <div class="actions">
                <button mat-flat-button type="submit" class="primary-action" [disabled]="busy() || form.invalid">
                  {{ 'Guardar proveedor' | t }}
                </button>
                @if (e.configured) {
                  <button mat-button type="button" [disabled]="busy()" (click)="remove()">
                    {{ 'Quitar proveedor' | t }}
                  </button>
                }
              </div>
            </form>
          }
        }
      </section>
    }
  `,
  styles: `
    .muted {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
      padding: 12px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
    }
    .info {
      display: flex;
      flex: 1 1 14rem;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .sub {
      margin: 24px 0 4px;
      font: var(--mat-sys-title-medium);
    }
    code {
      display: block;
      margin-top: 4px;
      overflow-wrap: anywhere;
    }
    .provider {
      display: grid;
      gap: 4px;
      max-width: 36rem;
      margin-top: 16px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
  `,
})
export class SsoSettingsComponent implements OnInit {
  private readonly api = inject(SsoApi);

  protected readonly policy = signal<SsoPolicy | null>(null);
  protected readonly enterprise = signal<SsoEnterprise | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    issuer: ['', [Validators.required, Validators.pattern(/^https:\/\/\S+$/)]],
    clientId: ['', Validators.required],
    clientSecret: [''],
    domains: ['', Validators.required],
  });

  protected readonly providerNames = computed(() => {
    const names = (this.policy()?.providers ?? []).map((p) => (p.id === 'enterprise' ? t('SSO de empresa') : p.label));
    return names.length > 0 ? names.join(', ') : '';
  });

  ngOnInit(): void {
    // Sin SSO en el servidor las dos peticiones fallan y la sección no aparece
    this.api.policy().subscribe({
      next: (policy) => this.policy.set(policy),
      error: () => this.policy.set(null),
    });
    this.api.enterprise().subscribe({
      next: (enterprise) => this.applyEnterprise(enterprise),
      error: () => this.enterprise.set(null),
    });
  }

  private applyEnterprise(e: SsoEnterprise): void {
    this.enterprise.set(e);
    this.form.reset({
      name: e.name,
      issuer: e.issuer,
      clientId: e.clientId,
      clientSecret: '',
      domains: e.domains.join(', '),
    });
    // Sin secreto guardado hace falta uno; con él, vacío significa «conservar»
    this.form.controls.clientSecret.setValidators(e.hasSecret ? [] : [Validators.required]);
    this.form.controls.clientSecret.updateValueAndValidity();
  }

  protected toggle(enabled: boolean): void {
    this.run(this.api.setPolicy(enabled), () => {
      this.policy.update((p) => (p ? { ...p, enabled } : p));
      this.notice.set(enabled ? t('Inicio de sesión único permitido') : t('Inicio de sesión único desactivado'));
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    this.run(
      this.api.saveEnterprise({
        name: v.name.trim(),
        issuer: v.issuer.trim(),
        clientId: v.clientId.trim(),
        clientSecret: v.clientSecret,
        domains: parseDomains(v.domains),
      }),
      (e) => {
        this.applyEnterprise(e);
        this.notice.set(t('Proveedor guardado'));
      }
    );
  }

  protected remove(): void {
    this.run(this.api.deleteEnterprise(), (e) => {
      this.applyEnterprise(e);
      this.notice.set(t('Proveedor quitado'));
    });
  }

  private run<T>(request: Observable<T>, done: (out: T) => void): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    request.subscribe({
      next: (out) => {
        this.busy.set(false);
        done(out);
      },
      error: (err: ApiError) => {
        this.busy.set(false);
        this.error.set(err.message);
        // Si el servidor corrigió o rechazó algo, el formulario se queda como está para que se pueda reparar
      },
    });
  }
}
