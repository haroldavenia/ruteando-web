import { ChangeDetectionStrategy, Component, Injector, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { UsersApi } from '../../../core/api/data/users.api';
import { User } from '../../../core/api/models';
import { PASSWORD_MIN_LENGTH } from '../../access/shared/form-utils';
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

const DUPLICATE_EMAIL = 'Ya existe una cuenta con ese correo';
const MESSAGES: FieldMessages = { required: 'Este campo es obligatorio' };

@Component({
  selector: 'app-driver-form',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, FocusFirstInvalidDirective, FormResultComponent, PasswordFieldComponent, FormActionsComponent, FormHeadComponent, MatIconModule],
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
          </section>
          @if (isNew) {
            <section class="form-section">
              <h2><mat-icon aria-hidden="true" fontIcon="lock" />Acceso</h2>
              <app-password-field [control]="form.controls.password" label="Contraseña inicial" autocomplete="new-password" [messages]="{ required: 'Introduce una contraseña inicial' }" />
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
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly isNew = this.id === null;
  protected readonly submit = new SubmitState();
  protected readonly loader = new RecordLoader<User>(this.id, (id) => this.api.get(id));
  private readonly saved = signal(false);

  protected readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true }),
    // Solo se pide en el alta: en la edición el control no se usa ni se envía
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)] }),
  });

  constructor() {
    if (!this.isNew) {
      this.form.controls.password.disable();
    }
    this.loader.load((user) =>
      this.form.reset({ firstName: user.firstName ?? '', lastName: user.lastName ?? '', email: user.email, phone: user.phone ?? '', password: '' }),
    );
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved();
  }

  protected error(name: 'firstName' | 'lastName' | 'email'): string {
    return firstErrorMessage(this.form.controls[name].errors, MESSAGES);
  }

  protected save(): void {
    if (this.form.invalid) {
      return;
    }
    const { firstName, lastName, email, phone, password } = this.form.getRawValue();
    const person = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), role: 'driver' as const, phone: phone.trim() || null };
    const request$ = this.id === null ? this.api.create({ ...person, password }) : this.api.update(this.id, person);

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
