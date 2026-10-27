import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';

import { ResourcesApi } from '../../../core/api/data/resources.api';
import { Resource } from '../../../core/api/models';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { messageFor } from '../../../shared/data/api-messages';
import { DataColumn, DataTableComponent } from '../../../shared/data/data-table.component';
import { DeleteFlow } from '../../../shared/data/delete-flow';
import { ListState } from '../../../shared/data/list-state';
import { PageHeaderComponent } from '../../../shared/data/page-header.component';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { driverName, vehicleLabel } from '../fleet-labels';

import { AssignDriverDialogComponent } from './assign-driver-dialog.component';

@Component({
  selector: 'app-resource-list',
  imports: [DataTableComponent, PageHeaderComponent, FormResultComponent, MatButtonModule, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Vehículos">
      <a mat-flat-button routerLink="/flota/vehiculos/nuevo"><mat-icon aria-hidden="true">add</mat-icon>Nuevo vehículo</a>
    </app-page-header>
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table [state]="state" [columns]="columns" entityPlural="vehículos" emptyMessage="Todavía no hay vehículos">
      <ng-template #rowActions let-row>
        <a mat-icon-button [routerLink]="['/flota/vehiculos', row.id]" [attr.aria-label]="'Editar vehículo ' + label(row)">
          <mat-icon aria-hidden="true">edit</mat-icon>
        </a>
        @if (row.assignedUser) {
          <button mat-icon-button type="button" (click)="unassign(row)" [attr.aria-label]="'Retirar conductor del vehículo ' + label(row)">
            <mat-icon aria-hidden="true">person_remove</mat-icon>
          </button>
        }
        <button mat-icon-button type="button" (click)="assign(row)" [attr.aria-label]="(row.assignedUser ? 'Cambiar conductor del vehículo ' : 'Asignar conductor al vehículo ') + label(row)">
          <mat-icon aria-hidden="true">person_add</mat-icon>
        </button>
        <button mat-icon-button type="button" (click)="remove(row)" [attr.aria-label]="'Eliminar vehículo ' + label(row)">
          <mat-icon aria-hidden="true">delete</mat-icon>
        </button>
      </ng-template>
      <a empty-action mat-stroked-button routerLink="/flota/vehiculos/nuevo">Crear el primer vehículo</a>
    </app-data-table>
  `,
})
export class ResourceListComponent {
  private readonly api = inject(ResourcesApi);
  private readonly dialog = inject(MatDialog);

  protected readonly deleter = new DeleteFlow();
  protected readonly state = new ListState<Resource>((params) => this.api.list(params));
  protected readonly columns: DataColumn<Resource>[] = [
    { id: 'name', header: 'Nombre', cell: (r) => r.name },
    { id: 'licensePlate', header: 'Matrícula', cell: (r) => r.licensePlate ?? '' },
    { id: 'type', header: 'Tipo', cell: (r) => r.resourceType?.name ?? '' },
    { id: 'driver', header: 'Conductor', cell: (r) => (r.assignedUser ? `${driverName(r.assignedUser)} (${r.assignedUser.email})` : 'Sin conductor') },
  ];

  constructor() {
    this.state.load(0);
  }

  protected label(row: Resource): string {
    return vehicleLabel(row);
  }

  protected remove(row: Resource): void {
    this.deleter.run({
      entity: 'vehículo',
      name: vehicleLabel(row),
      request: () => this.api.remove(row.id),
      reload: () => this.state.reload(),
    });
  }

  protected assign(row: Resource): void {
    this.reset();
    this.dialog
      .open<AssignDriverDialogComponent, { vehicle: string; currentDriverId: string | null }, string>(AssignDriverDialogComponent, {
        data: { vehicle: vehicleLabel(row), currentDriverId: row.driverId },
      })
      .afterClosed()
      .pipe(
        filter((driverId): driverId is string => !!driverId),
        switchMap((driverId) => this.api.assignDriver(row.id, driverId)),
      )
      .subscribe({
        next: (updated) => {
          this.deleter.success.set(`Conductor asignado al vehículo «${vehicleLabel(row)}»: ${updated.assignedUser ? driverName(updated.assignedUser) : ''}`.replace(/: $/, ''));
          this.state.reload();
        },
        error: (err: unknown) => this.deleter.error.set(messageFor(err)),
      });
  }

  protected unassign(row: Resource): void {
    this.reset();
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Retirar conductor',
          message: `¿Retirar a ${row.assignedUser ? driverName(row.assignedUser) : 'el conductor'} del vehículo «${vehicleLabel(row)}»?`,
          confirmLabel: 'Retirar',
        },
      })
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.api.unassignDriver(row.id)),
      )
      .subscribe({
        next: () => {
          this.deleter.success.set(`El vehículo «${vehicleLabel(row)}» ya no tiene conductor`);
          this.state.reload();
        },
        error: (err: unknown) => this.deleter.error.set(messageFor(err)),
      });
  }

  private reset(): void {
    this.deleter.success.set(null);
    this.deleter.error.set(null);
  }
}
