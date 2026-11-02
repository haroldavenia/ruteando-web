import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { FullListState } from '../../../shared/data/full-list-state';
import { PageHeaderComponent } from '../../../shared/data/page-header.component';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { ActionTitleDirective } from '../../../shared/ui/action-title.directive';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { FleetTabsComponent } from '../fleet-tabs.component';
import { vehiclesToCsv } from '../fleet-export';
import { driverName, vehicleLabel } from '../fleet-labels';
import { FleetListActions } from '../fleet-list-actions';

import { AssignDriverDialogComponent } from './assign-driver-dialog.component';


import { t } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
@Component({
  selector: 'app-resource-list',
  imports: [
    DataTableComponent,
    FleetTabsComponent,
    PageHeaderComponent,
    FormResultComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    RouterLink,
    ActionTitleDirective,
    StatusBadgeComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './resource-list.component.scss',
  template: `
    <app-page-header [title]="'Vehículos' | t" [subtitle]="state.countText('vehículo', 'vehículos')">
      <button mat-stroked-button type="button" (click)="exportFiltered()" [disabled]="state.total() === 0">
        <mat-icon aria-hidden="true">download</mat-icon>{{ 'Exportar CSV' | t }}
      </button>
      <a mat-flat-button class="primary-action" routerLink="/flota/vehiculos/nuevo"><mat-icon aria-hidden="true">add</mat-icon>{{ 'Nuevo vehículo' | t }}</a>
    </app-page-header>
    <app-fleet-tabs />
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table
      [state]="state"
      [columns]="columns"
      [selectable]="true"
      [entityPlural]="'vehículos' | t"
      [emptyMessage]="'Todavía no hay vehículos' | t"
      [searchPlaceholder]="'Buscar por nombre, matrícula o conductor' | t"
    >
      <ng-template #card let-row let-selectable="selectable" let-selected="selected" let-toggle="toggle">
        <article class="vehicle" [class.selected]="selected">
          <header>
            <span class="vehicle-icon"><mat-icon aria-hidden="true">local_shipping</mat-icon></span>
            <div class="vehicle-name">
              <h3>{{ row.name }}</h3>
              <span>{{ row.resourceType?.name ?? '' }}</span>
            </div>
            @if (row.licensePlate) {
              <span class="plate">{{ row.licensePlate }}</span>
            }
          </header>
          <div class="driver">
            @if (row.assignedUser) {
              <span class="avatar" aria-hidden="true">{{ initials(row) }}</span>
              <span class="driver-name">{{ driverLabel(row) }}<small>{{ row.assignedUser.email }}</small></span>
              @if (!row.active) {
                <app-status-badge [label]="'Inactivo' | t" tone="neutral" />
              }
            } @else {
              <span class="avatar none" aria-hidden="true"><mat-icon>person</mat-icon></span>
              <span class="driver-name none">{{ 'Sin conductor' | t }}</span>
              <button mat-stroked-button type="button" (click)="assign(row)" [attr.aria-label]="('Asignar conductor al vehículo ' | t) + label(row)">{{ 'Asignar' | t }}</button>
            }
          </div>
          <footer>
            @if (selectable) {
              <mat-checkbox class="pick" [checked]="selected" (change)="toggle(row)" [aria-label]="('Elegir vehículo ' | t) + label(row)" [attr.title]="'Elegir' | t" />
            }
            <a mat-icon-button [routerLink]="['/flota/vehiculos', row.id]" [attr.aria-label]="('Editar vehículo ' | t) + label(row)">
              <mat-icon aria-hidden="true">edit</mat-icon>
            </a>
            @if (row.assignedUser) {
              <button mat-icon-button type="button" (click)="unassign(row)" [attr.aria-label]="('Retirar conductor del vehículo ' | t) + label(row)">
                <mat-icon aria-hidden="true">person_remove</mat-icon>
              </button>
              <button mat-icon-button type="button" (click)="assign(row)" [attr.aria-label]="('Cambiar conductor del vehículo ' | t) + label(row)">
                <mat-icon aria-hidden="true">person_add</mat-icon>
              </button>
            }
            <button mat-icon-button type="button" (click)="remove(row)" [attr.aria-label]="('Eliminar vehículo ' | t) + label(row)">
              <mat-icon aria-hidden="true">delete</mat-icon>
            </button>
          </footer>
        </article>
      </ng-template>
      <ng-template #rowActions let-row>
        <a mat-icon-button [routerLink]="['/flota/vehiculos', row.id]" [attr.aria-label]="('Editar vehículo ' | t) + label(row)">
          <mat-icon aria-hidden="true">edit</mat-icon>
        </a>
        @if (row.assignedUser) {
          <button mat-icon-button type="button" (click)="unassign(row)" [attr.aria-label]="('Retirar conductor del vehículo ' | t) + label(row)">
            <mat-icon aria-hidden="true">person_remove</mat-icon>
          </button>
        }
        <button mat-icon-button type="button" (click)="assign(row)" [attr.aria-label]="(row.assignedUser ? ('Cambiar conductor del vehículo ' | t) : ('Asignar conductor al vehículo ' | t)) + label(row)">
          <mat-icon aria-hidden="true">person_add</mat-icon>
        </button>
        <button mat-icon-button type="button" (click)="remove(row)" [attr.aria-label]="('Eliminar vehículo ' | t) + label(row)">
          <mat-icon aria-hidden="true">delete</mat-icon>
        </button>
      </ng-template>
      <ng-template #selectionActions let-rows let-clear="clear">
        <button mat-button type="button" (click)="actions.removeMany(rows, clear)"><mat-icon aria-hidden="true">delete</mat-icon>{{ 'Eliminar' | t }}</button>
        <button mat-button type="button" (click)="actions.exportRows(rows)"><mat-icon aria-hidden="true">download</mat-icon>{{ 'Exportar' | t }}</button>
      </ng-template>
      <a empty-action mat-stroked-button routerLink="/flota/vehiculos/nuevo">{{ 'Crear el primer vehículo' | t }}</a>
    </app-data-table>
  `,
})
export class ResourceListComponent {
  private readonly api = inject(ResourcesApi);
  private readonly dialog = inject(MatDialog);

  protected readonly deleter = new DeleteFlow();
  /** Todos los vehículos en el cliente (hasta 1000): la búsqueda y las tarjetas necesitan tenerlos todos. */
  protected readonly state = new FullListState<Resource>((params) => this.api.list(params));
  protected readonly actions = new FleetListActions<Resource>(this.deleter, {
    singular: t('vehículo'),
    plural: t('vehículos'),
    fileBase: 'vehiculos',
    label: vehicleLabel,
    remove: (id) => this.api.remove(id),
    reload: () => this.state.reload(),
    csv: vehiclesToCsv,
  });
  private readonly table = viewChild<DataTableComponent<Resource>>(DataTableComponent);
  protected readonly columns: DataColumn<Resource>[] = [
    { id: 'name', header: t('Nombre'), cell: (r) => r.name, kind: 'strong' },
    { id: 'licensePlate', header: t('Matrícula'), cell: (r) => r.licensePlate ?? '', kind: 'id' },
    { id: 'type', header: t('Tipo'), cell: (r) => r.resourceType?.name ?? '', kind: 'muted' },
    { id: 'driver', header: t('Conductor'), cell: (r) => (r.assignedUser ? `${driverName(r.assignedUser)} (${r.assignedUser.email})` : t('Sin conductor')) },
  ];

  constructor() {
    this.state.load();
  }

  protected label(row: Resource): string {
    return vehicleLabel(row);
  }

  /** Exporta lo que dejan la búsqueda y los filtros de la tabla. */
  protected exportFiltered(): void {
    this.actions.exportRows(this.table()?.filtered() ?? this.state.rows());
  }

  protected driverLabel(row: Resource): string {
    return row.assignedUser ? driverName(row.assignedUser) : '';
  }

  /** Las iniciales del conductor (hasta dos) para el círculo de la tarjeta. */
  protected initials(row: Resource): string {
    return this.driverLabel(row)
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('');
  }

  protected remove(row: Resource): void {
    this.deleter.run({
      entity: t('vehículo'),
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
          this.deleter.success.set(t('Conductor asignado al vehículo «{0}»: {1}', [vehicleLabel(row), updated.assignedUser ? driverName(updated.assignedUser) : '']).replace(/: $/, ''));
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
          title: t('Retirar conductor'),
          message: t('¿Retirar a {0} del vehículo «{1}»?', [row.assignedUser ? driverName(row.assignedUser) : 'el conductor', vehicleLabel(row)]),
          confirmLabel: t('Retirar'),
        },
      })
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.api.unassignDriver(row.id)),
      )
      .subscribe({
        next: () => {
          this.deleter.success.set(t('El vehículo «{0}» ya no tiene conductor', [vehicleLabel(row)]));
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
