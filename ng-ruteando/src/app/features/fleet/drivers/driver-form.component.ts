import { ChangeDetectionStrategy, Component, Injector, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MasterDomainsService } from '../../../core/api/data/master-domains.service';
import { UsersApi } from '../../../core/api/data/users.api';
import { User } from '../../../core/api/models';
import { PASSWORD_MIN_LENGTH, matchesSibling, revalidateOnPasswordChange } from '../../access/shared/form-utils';
import { RecordLoader } from '../../../shared/data/record-loader';
import { SubmitState } from '../../../shared/data/submit-state';
import { HasUnsavedChanges } from '../../../shared/data/unsaved-changes.guard';
import { FieldMessages, firstErrorMessage } from '../../../shared/form/access.messages';
import { FocusFirstInvalidDirective } from '../../../shared/form/focus-first-invalid.directive';
import { FormActionsComponent } from '../../../shared/form/form-actions.component';
import { FormHeadComponent } from '../../../shared/form/form-head.component';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { notify } from '../../../shared/form/notify';
import { PasswordFieldComponent } from '../../../shared/form/password-field.component';
import { IDENTIFIER_KEYS, identifierLabel } from '../fleet-labels';

const DUPLICATE_EMAIL = 'Ya existe una cuenta con ese correo';
const MESSAGES: FieldMessages = {
  required: 'Este campo es obligatorio',
  documentType: 'Elige el tipo de documento',
  documentValue: 'Escribe el número del documento',
};

/** Tipo y número de documento van juntos: si se escribe uno hace falta el otro. */
function documentValidator(missing: 'type' | 'value'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const sibling = control.parent?.get(missing === 'type' ? 'identifierValue' : 'identifierType')?.value;
    const other = typeof sibling === 'string' ? sibling.trim() : '';
    const own = typeof control.value === 'string' ? control.value.trim() : '';
    if (!other || own) {
      return null;
    }
    return missing === 'type' ? { documentType: true } : { documentValue: true };
  };
}

@Component({
  selector: 'app-driver-form',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule, FocusFirstInvalidDirective, FormResultComponent, PasswordFieldComponent, FormActionsComponent, FormHeadComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-form-head [title]="isNew ? 'Nuevo conductor' : 'Editar conductor'" backLabel="Conductores" backLink="/flota/conductores" />
    @switch (loader.status()) {
      @case ('loading') {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando" />
      }
      @case ('missing') {
        <app-form-result [error]="loader.error()" />
        <a mat-stroked-button routerLink="/flota/conductores">Volver al listado</a>
      }
      @case ('error') {
        <app-form-result [error]="loader.error()" />
        <a mat-stroked-button routerLink="/flota/conductores">Volver al listado</a>
      }
      @default {
        <form class="card form-grid" [formGroup]="form" (ngSubmit)="save()" appFocusFirstInvalid novalidate>
          <section class="form-section">
            <h2><mat-icon aria-hidden="true" fontIcon="person" />Datos del conductor</h2>
            <mat-form-field>
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="firstName" autocomplete="off" />
              <mat-error>{{ error('firstName') }}</mat-error>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Apellidos</mat-label>
              <input matInput formControlName="lastName" autocomplete="off" />
              <mat-error>{{ error('lastName') }}</mat-error>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Correo electrónico</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="off" />
              <mat-error>{{ error('email') }}</mat-error>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Teléfono (opcional)</mat-label>
              <input matInput type="tel" formControlName="phone" autocomplete="off" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Tipo de documento</mat-label>
              <mat-select formControlName="identifierType">
                <mat-option value="">Sin documento</mat-option>
                @for (type of documentTypes(); track type.key) {
                  <mat-option [value]="type.key">{{ type.label }}</mat-option>
                }
              </mat-select>
              <mat-error>{{ error('identifierType') }}</mat-error>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Número de documento</mat-label>
              <input matInput formControlName="identifierValue" autocomplete="off" />
              <mat-error>{{ error('identifierValue') }}</mat-error>
            </mat-form-field>
          </section>
          @if (isNew) {
            <section class="form-section">
              <h2><mat-icon aria-hidden="true" fontIcon="lock" />Acceso</h2>
              <app-password-field [control]="form.controls.password" label="Contraseña inicial" autocomplete="new-password" [messages]="{ required: 'Introduce una contraseña inicial' }" />
              <app-password-field [control]="form.controls.repeatPassword" label="Repetir contraseña" autocomplete="new-password" [messages]="{ required: 'Repite la contraseña inicial' }" />
            </section>
          }
          <app-form-result [error]="submit.error()" />
          <app-form-actions [dirty]="hasUnsavedChanges()">
            <a mat-button routerLink="/flota/conductores">Cancelar</a>
            <button mat-flat-button class="primary-action" type="submit" [disabled]="submit.submitting()">Guardar</button>
          </app-form-actions>
        </form>
      }
    }
  `,
})
export class DriverFormComponent implements HasUnsavedChanges {
  private readonly api = inject(UsersApi);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly masters = inject(MasterDomainsService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly isNew = this.id === null;
  protected readonly submit = new SubmitState();
  protected readonly loader = new RecordLoader<User>(this.id, (id) => this.api.get(id));
  private readonly saved = signal(false);
  /** El tipo de documento que ya traía el conductor, por si el gateway lo tiene y el dominio maestro no. */
  private readonly storedType = signal('');

  /** Tipos de documento del dominio maestro `IdentifierType` (o los conocidos si aún no cargó), con su etiqueta en español. */
  protected readonly documentTypes = computed(() => {
    const keys = this.masters.activeValues('IdentifierType').map((value) => value.key);
    const all = keys.length > 0 ? keys : IDENTIFIER_KEYS;
    const stored = this.storedType();
    return (stored && !all.includes(stored) ? [...all, stored] : all).map((key) => ({ key, label: identifierLabel(key) }));
  });

  protected readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true }),
    identifierType: new FormControl('', { nonNullable: true, validators: [documentValidator('type')] }),
    identifierValue: new FormControl('', { nonNullable: true, validators: [documentValidator('value')] }),
    // Solo se piden en el alta: en la edición los controles no se usan ni se envían
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)] }),
    repeatPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, matchesSibling('password')] }),
  });

  constructor() {
    this.masters.load().subscribe({ error: () => undefined });
    if (!this.isNew) {
      this.form.controls.password.disable();
      this.form.controls.repeatPassword.disable();
    } else {
      revalidateOnPasswordChange(this.form, 'password', 'repeatPassword');
    }
    // El tipo y el número se exigen el uno al otro: al cambiar uno se revalida el otro
    this.form.controls.identifierType.valueChanges.subscribe(() => this.form.controls.identifierValue.updateValueAndValidity({ emitEvent: false }));
    this.form.controls.identifierValue.valueChanges.subscribe(() => this.form.controls.identifierType.updateValueAndValidity({ emitEvent: false }));
    this.loader.load((user) => {
      this.storedType.set(user.identifierType ?? '');
      this.form.reset({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email,
        phone: user.phone ?? '',
        identifierType: user.identifierType ?? '',
        identifierValue: user.identifierValue ?? '',
        password: '',
        repeatPassword: '',
      });
    });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved();
  }

  protected error(name: 'firstName' | 'lastName' | 'email' | 'identifierType' | 'identifierValue'): string {
    return firstErrorMessage(this.form.controls[name].errors, MESSAGES);
  }

  protected save(): void {
    if (this.form.invalid) {
      return;
    }
    const { firstName, lastName, email, phone, password, identifierType, identifierValue } = this.form.getRawValue();
    const document = { identifierType: identifierType.trim() || null, identifierValue: identifierValue.trim() || null };
    const person = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), role: 'driver' as const, phone: phone.trim() || null };
    // Al editar se envía el documento que muestra el formulario (el del conductor si no se tocó, así guardar no lo borra); en el alta, solo si se escribió
    const request$ =
      this.id === null
        ? this.api.create({ ...person, ...(document.identifierValue ? document : {}), password })
        : this.api.update(this.id, { ...person, ...document });

    this.submit.submit(
      request$,
      () => {
        this.saved.set(true);
        void notify(this.injector, this.id === null ? 'Conductor creado' : 'Conductor guardado');
        void this.router.navigateByUrl('/flota/conductores');
      },
      { 409: DUPLICATE_EMAIL },
    );
  }
}
