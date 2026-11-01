import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';

import { UsersApi } from '../../../core/api/data/users.api';
import { User } from '../../../core/api/models';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { messageFor } from '../../../shared/data/api-messages';
import { ClientPaging } from '../../../shared/data/client-paging';
import { DataColumn, DataTableComponent } from '../../../shared/data/data-table.component';
import { DeleteFlow } from '../../../shared/data/delete-flow';
import { FullListState } from '../../../shared/data/full-list-state';
import { PageHeaderComponent } from '../../../shared/data/page-header.component';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { ActionTitleDirective } from '../../../shared/ui/action-title.directive';
import { FleetTabsComponent } from '../fleet-tabs.component';
import { driversToCsv } from '../fleet-export';
import { driverName, identifierText } from '../fleet-labels';
import { FleetListActions } from '../fleet-list-actions';

const ASSIGNED = 'No se puede eliminar: el conductor está asignado a un vehículo';

@Component({
  selector: 'app-driver-list',
  imports: [DataTableComponent, FleetTabsComponent, PageHeaderComponent, FormResultComponent, MatButtonModule, MatIconModule, RouterLink, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Conductores" [subtitle]="state.countText('conductor', 'conductores')">
      <button mat-stroked-button type="button" (click)="exportFiltered()" [disabled]="state.total() === 0">
        <mat-icon aria-hidden="true">download</mat-icon>Exportar CSV
      </button>
      <a mat-flat-button class="primary-action" routerLink="/flota/conductores/nuevo"><mat-icon aria-hidden="true">add</mat-icon>Nuevo conductor</a>
    </app-page-header>
    <app-fleet-tabs />
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table
      [state]="state"
      [columns]="columns"
      [selectable]="true"
      entityPlural="conductores"
      emptyMessage="Todavía no hay conductores"
      searchPlaceholder="Buscar por nombre, correo o documento"
    >
      <ng-template #rowActions let-row>
        <a mat-icon-button [routerLink]="['/flota/conductores', row.id]" [attr.aria-label]="'Editar conductor ' + name(row)">
          <mat-icon aria-hidden="true">edit</mat-icon>
        </a>
        <button mat-icon-button type="button" (click)="sendReset(row)" [attr.aria-label]="'Enviar enlace de restablecimiento a ' + name(row)">
          <mat-icon aria-hidden="true">lock_reset</mat-icon>
        </button>
        <button mat-icon-button type="button" (click)="remove(row)" [attr.aria-label]="'Eliminar conductor ' + name(row)">
          <mat-icon aria-hidden="true">delete</mat-icon>
        </button>
      </ng-template>
      <ng-template #selectionActions let-rows let-clear="clear">
        <button mat-button type="button" (click)="actions.removeMany(rows, clear)"><mat-icon aria-hidden="true">delete</mat-icon>Eliminar</button>
        <button mat-button type="button" (click)="actions.exportRows(rows)"><mat-icon aria-hidden="true">download</mat-icon>Exportar</button>
      </ng-template>
      <a empty-action mat-stroked-button routerLink="/flota/conductores/nuevo">Crear el primer conductor</a>
    </app-data-table>
  `,
})
export class DriverListComponent {
  private readonly api = inject(UsersApi);
  private readonly dialog = inject(MatDialog);

  private readonly paging = new ClientPaging<User>(() => this.api.drivers());
  protected readonly deleter = new DeleteFlow();
  /** Todos los conductores en el cliente (hasta 1000): la búsqueda y el recuento son sobre todos, como en la aplicación anterior. */
  protected readonly state = new FullListState<User>(this.paging.fetch);
  private readonly table = viewChild<DataTableComponent<User>>(DataTableComponent);
  protected readonly actions = new FleetListActions<User>(this.deleter, {
    singular: 'conductor',
    plural: 'conductores',
    fileBase: 'conductores',
    label: driverName,
    remove: (id) => this.api.remove(id),
    byStatus: { 400: ASSIGNED, 409: ASSIGNED },
    reload: () => this.reloadAll(),
    csv: driversToCsv,
  });
  protected readonly columns: DataColumn<User>[] = [
    { id: 'name', header: 'Nombre', cell: (u) => driverName(u), kind: 'strong' },
    { id: 'email', header: 'Correo', cell: (u) => u.email },
    { id: 'phone', header: 'Teléfono', cell: (u) => u.phone ?? '' },
    { id: 'document', header: 'Documento', cell: (u) => identifierText(u) },
    { id: 'active', header: 'Estado', cell: (u) => (u.active ? 'Activo' : 'Inactivo') },
  ];

  constructor() {
    this.state.load();
  }

  protected name(user: User): string {
    return driverName(user);
  }

  protected remove(user: User): void {
    this.deleter.run({
      entity: 'conductor',
      name: driverName(user),
      request: () => this.api.remove(user.id),
      byStatus: { 400: ASSIGNED, 409: ASSIGNED },
      reload: () => this.reloadAll(),
    });
  }

  /** La lista de conductores se guarda mientras se pagina: tras borrar hay que volver a pedirla. */
  private reloadAll(): void {
    this.paging.invalidate();
    this.state.reload();
  }

  /** Exporta lo que dejan la búsqueda y los filtros de la tabla. */
  protected exportFiltered(): void {
    this.actions.exportRows(this.table()?.filtered() ?? this.state.rows());
  }

  /** Pide confirmación y envía al conductor el enlace para restablecer su contraseña. */
  protected sendReset(user: User): void {
    this.deleter.success.set(null);
    this.deleter.error.set(null);
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Enviar enlace de restablecimiento',
          message: `Se enviará a ${user.email} un enlace para restablecer su contraseña.`,
          confirmLabel: 'Enviar enlace',
        },
      })
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.api.sendPasswordReset(user.id)),
      )
      .subscribe({
        next: () => this.deleter.success.set(`Enlace de restablecimiento enviado a ${user.email}`),
        error: (err: unknown) => this.deleter.error.set(messageFor(err)),
      });
  }
}
