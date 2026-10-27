import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { UsersApi } from '../../../core/api/data/users.api';
import { User } from '../../../core/api/models';
import { messageFor } from '../../../shared/data/api-messages';
import { driverName } from '../fleet-labels';

export interface AssignDriverData {
  vehicle: string;
  currentDriverId: string | null;
}

/** Elige entre los conductores del tenant; se cierra con el id elegido o sin valor al cancelar. */
@Component({
  selector: 'app-assign-driver-dialog',
  imports: [ReactiveFormsModule, RouterLink, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Asignar conductor a {{ data.vehicle }}</h2>
    <mat-dialog-content>
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando conductores" />
      } @else if (error()) {
        <p role="alert">{{ error() }}</p>
      } @else if (drivers().length === 0) {
        <p>No hay conductores creados. <a routerLink="/flota/conductores" mat-dialog-close>Crear un conductor</a></p>
      } @else {
        <mat-form-field class="field">
          <mat-label>Conductor</mat-label>
          <mat-select [formControl]="driver" cdkFocusInitial>
            @for (user of drivers(); track user.id) {
              <mat-option [value]="user.id">{{ name(user) }} ({{ user.email }})</mat-option>
            }
          </mat-select>
          <mat-error>Elige un conductor</mat-error>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="button" [disabled]="drivers().length === 0" (click)="confirm()">Asignar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .field {
      width: 100%;
      min-width: 280px;
    }
  `,
})
export class AssignDriverDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AssignDriverDialogComponent, string>);
  protected readonly data = inject<AssignDriverData>(MAT_DIALOG_DATA);
  protected readonly drivers = signal<readonly User[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly driver = new FormControl<string | null>(this.data.currentDriverId, { validators: [Validators.required] });
  protected readonly name = driverName;

  constructor() {
    inject(UsersApi)
      .drivers()
      .subscribe({
        next: (list) => {
          this.drivers.set(list);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(messageFor(err));
          this.loading.set(false);
        },
      });
  }

  protected confirm(): void {
    if (this.driver.invalid) {
      this.driver.markAsTouched();
      return;
    }
    this.dialogRef.close(this.driver.value as string);
  }
}
