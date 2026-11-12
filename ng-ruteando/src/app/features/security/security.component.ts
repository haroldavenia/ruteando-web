import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { ApiError } from '../../core/api/api-error';
import { MfaApi } from '../../core/api/data/mfa.api';
import { UsersApi } from '../../core/api/data/users.api';
import { User } from '../../core/api/models';
import { MfaMethod, MfaPolicy, MfaRequired } from '../../core/auth/mfa.model';
import { UserRole } from '../../core/auth/session.model';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { mfaMethodHint, mfaMethodIcon, mfaMethodLabel } from '../../shared/mfa/mfa-labels';
import { roleLabel } from '../../shared/ui/role-label';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { SsoSettingsComponent } from './sso-settings.component';

const METHODS: readonly MfaMethod[] = ['totp', 'email', 'sms'];
const ROLES: readonly UserRole[] = ['super_admin', 'tenant_admin', 'agent', 'driver'];

/**
 * Seguridad de la empresa (solo `tenant_admin` y `super_admin`): qué métodos de segundo factor se permiten, si es obligatorio (para
 * todas las personas o para ciertos roles) y quién ya lo tiene activo, con la opción de restablecérselo a quien perdió su método. Lo
 * que cada persona activa lo hace en su Perfil.
 */
@Component({
  selector: 'app-security',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatRadioModule,
    MatSlideToggleModule,
    FormResultComponent,
    PageHeaderComponent,
    SkeletonComponent,
    SsoSettingsComponent,
    StatusBadgeComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="'Seguridad' | t" [subtitle]="'Verificación en dos pasos de tu empresa' | t" />
    <app-form-result [error]="error()" [success]="notice()" />

    @if (loading()) {
      <app-skeleton variant="form" [label]="'Cargando…' | t" />
    } @else if (policy()) {
      <section class="card" aria-labelledby="methods-title">
        <h2 id="methods-title" class="card-title">{{ 'Métodos permitidos' | t }}</h2>
        <p class="muted">{{ 'Las personas solo pueden activar los métodos que permitas aquí.' | t }}</p>
        <ul class="methods">
          @for (m of methods; track m) {
            <li>
              <mat-icon aria-hidden="true">{{ icon(m) }}</mat-icon>
              <div class="info">
                <strong>{{ label(m) }}</strong>
                <span class="muted">{{
                  available()[m] ? hint(m) : ('El servidor no lo tiene configurado todavía.' | t)
                }}</span>
              </div>
              <mat-slide-toggle
                [checked]="allowed()[m]"
                [disabled]="!available()[m] && !allowed()[m]"
                [aria-label]="label(m)"
                (change)="toggle(m, $event.checked)"
              />
            </li>
          }
        </ul>
      </section>

      <section class="card" aria-labelledby="required-title">
        <h2 id="required-title" class="card-title">{{ 'Exigir la verificación en dos pasos' | t }}</h2>
        <mat-radio-group
          class="choices"
          [value]="required()"
          [aria-label]="'Quién debe usarla' | t"
          (change)="required.set($event.value)"
        >
          <mat-radio-button value="none">{{ 'Nadie: cada persona decide' | t }}</mat-radio-button>
          <mat-radio-button value="all">{{ 'Todas las personas de la empresa' | t }}</mat-radio-button>
          <mat-radio-button value="roles">{{ 'Solo ciertos roles' | t }}</mat-radio-button>
        </mat-radio-group>
        @if (required() === 'roles') {
          <div class="roles" role="group" [attr.aria-label]="'Roles obligados' | t">
            @for (r of roles; track r) {
              <mat-checkbox [checked]="selectedRoles().includes(r)" (change)="toggleRole(r, $event.checked)">
                {{ roleName(r) }}
              </mat-checkbox>
            }
          </div>
        }
        @if (problem(); as text) {
          <p class="problem" role="alert"><mat-icon aria-hidden="true">error</mat-icon>{{ text }}</p>
        }
        <div class="actions">
          <button
            mat-flat-button
            type="button"
            class="primary-action"
            [disabled]="saving() || !dirty() || !!problem()"
            (click)="save()"
          >
            {{ 'Guardar cambios' | t }}
          </button>
        </div>
      </section>

      <section class="card" aria-labelledby="people-title">
        <h2 id="people-title" class="card-title">{{ 'Personas' | t }}</h2>
        @if (users().length === 0) {
          <p class="muted">
            {{ usersFailed() ? ('No se pudo cargar la lista de personas.' | t) : ('Todavía no hay personas.' | t) }}
          </p>
        } @else {
          <table class="grid">
            <caption class="visually-hidden">
              {{
                'Personas de la empresa y si tienen activa la verificación en dos pasos' | t
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ 'Nombre' | t }}</th>
                <th scope="col">{{ 'Rol' | t }}</th>
                <th scope="col">{{ 'Verificación en dos pasos' | t }}</th>
                <th scope="col">
                  <span class="visually-hidden">{{ 'Acciones' | t }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td>
                    <strong>{{ fullName(u) }}</strong
                    ><br /><span class="muted">{{ u.email }}</span>
                  </td>
                  <td>{{ roleName(u.role) }}</td>
                  <td>
                    <app-status-badge
                      [label]="withMfa().has(u.id) ? ('Activa' | t) : ('Sin activar' | t)"
                      [tone]="withMfa().has(u.id) ? 'success' : 'neutral'"
                    />
                  </td>
                  <td>
                    @if (withMfa().has(u.id)) {
                      <button mat-button type="button" (click)="confirmReset(u)">{{ 'Restablecer' | t }}</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (total() > users().length) {
            <p class="muted">{{ 'Mostrando {0} de {1}' | t: [users().length, total()] }}</p>
          }
        }
      </section>
    }
    <app-sso-settings />
  `,
  styles: `
    .muted {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .methods {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 16px 0 0;
      padding: 0;
      list-style: none;
    }
    .methods li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
    }
    .info {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .choices,
    .roles {
      display: flex;
      flex-direction: column;
      margin-top: 8px;
    }
    .roles {
      padding-left: 32px;
    }
    .problem {
      display: flex;
      gap: 8px;
      margin: 12px 0 0;
      color: var(--mat-sys-error);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
  `,
})
export class SecurityComponent implements OnInit {
  private readonly api = inject(MfaApi);
  private readonly usersApi = inject(UsersApi);
  private readonly dialog = inject(MatDialog);

  protected readonly methods = METHODS;
  protected readonly roles = ROLES;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly saving = signal(false);

  /** Lo guardado en el servidor, y lo que se está editando. */
  protected readonly policy = signal<MfaPolicy | null>(null);
  protected readonly allowed = signal<Record<MfaMethod, boolean>>({ email: true, sms: true, totp: true });
  protected readonly required = signal<MfaRequired>('none');
  protected readonly selectedRoles = signal<UserRole[]>([]);
  protected readonly available = computed(() => this.policy()?.available ?? { email: true, sms: true, totp: true });

  protected readonly users = signal<User[]>([]);
  protected readonly total = signal(0);
  protected readonly withMfa = signal<ReadonlySet<string>>(new Set());
  protected readonly usersFailed = signal(false);

  protected readonly problem = computed(() => {
    if (this.required() === 'none') {
      return null;
    }
    if (!METHODS.some((m) => this.allowed()[m])) {
      return t('Para exigir el segundo factor hace falta permitir al menos un método');
    }
    return this.required() === 'roles' && this.selectedRoles().length === 0
      ? t('Elige al menos un rol o cambia la obligatoriedad')
      : null;
  });
  protected readonly dirty = computed(() => {
    const saved = this.policy();
    if (!saved) {
      return false;
    }
    const roles = this.required() === 'roles' ? [...this.selectedRoles()].sort() : [];
    return (
      METHODS.some((m) => this.allowed()[m] !== saved.methods[m]) ||
      this.required() !== saved.required ||
      JSON.stringify(roles) !== JSON.stringify([...saved.roles].sort())
    );
  });

  protected label = mfaMethodLabel;
  protected icon = mfaMethodIcon;
  protected hint = mfaMethodHint;
  protected roleName = roleLabel;

  ngOnInit(): void {
    this.api.policy().subscribe({
      next: (policy) => {
        this.apply(policy);
        this.loading.set(false);
        this.loadPeople();
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }

  private apply(policy: MfaPolicy): void {
    this.policy.set(policy);
    this.allowed.set({ ...policy.methods });
    this.required.set(policy.required);
    this.selectedRoles.set([...policy.roles]);
  }

  private loadPeople(): void {
    this.usersApi.list({ page: 0, size: 100 }).subscribe({
      next: (page) => {
        this.users.set(page.content);
        this.total.set(page.totalElements);
      },
      error: () => {
        this.users.set([]);
        this.usersFailed.set(true);
      },
    });
    this.loadWithMfa();
  }

  private loadWithMfa(): void {
    this.api.usersWithMfa().subscribe({ next: (out) => this.withMfa.set(new Set(out.userIds)) });
  }

  protected toggle(method: MfaMethod, checked: boolean): void {
    this.allowed.update((current) => ({ ...current, [method]: checked }));
  }

  protected toggleRole(role: UserRole, checked: boolean): void {
    this.selectedRoles.update((current) => (checked ? [...current, role] : current.filter((r) => r !== role)));
  }

  protected fullName(user: User): string {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  }

  protected save(): void {
    if (this.problem() || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api
      .savePolicy({
        methods: this.allowed(),
        required: this.required(),
        roles: this.required() === 'roles' ? this.selectedRoles() : [],
      })
      .subscribe({
        next: (policy) => {
          this.saving.set(false);
          this.apply(policy);
          this.notice.set(t('Cambios guardados'));
        },
        error: (err: ApiError) => {
          this.saving.set(false);
          this.error.set(err.message);
        },
      });
  }

  protected confirmReset(user: User): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: t('Restablecer la verificación en dos pasos'),
          message: t(
            '{0} perderá sus métodos y sus códigos de recuperación. En su próximo inicio de sesión se aplicará la política de la empresa.',
            [this.fullName(user)]
          ),
          confirmLabel: t('Restablecer'),
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean | undefined) => {
        if (confirmed !== true) {
          return;
        }
        this.error.set(null);
        this.notice.set(null);
        this.api.resetUser(user.id).subscribe({
          next: () => {
            this.notice.set(t('Se restableció la verificación en dos pasos de {0}', [this.fullName(user)]));
            this.loadWithMfa();
          },
          error: (err: ApiError) => this.error.set(err.message),
        });
      });
  }
}
