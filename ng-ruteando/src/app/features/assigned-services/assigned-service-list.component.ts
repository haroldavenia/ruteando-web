import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { AssignedServicesApi } from '../../core/api/data/assigned-services.api';
import { readAssignment } from '../../core/api/data/assigned-services-contract';
import { JourneysApi } from '../../core/api/data/journeys.api';
import { ResourcesApi } from '../../core/api/data/resources.api';
import { UsersApi } from '../../core/api/data/users.api';
import { AssignedService } from '../../core/api/models';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ClientPaging } from '../../shared/data/client-paging';
import { DataColumn, DataTableComponent } from '../../shared/data/data-table.component';
import { DeleteFlow } from '../../shared/data/delete-flow';
import { FullListState } from '../../shared/data/full-list-state';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';
import { statusTone } from '../../shared/ui/status-tone';
import { FleetListActions } from '../fleet/fleet-list-actions';
import {
  assignedRouteLabel,
  assignedServicesToCsv,
  AssignmentLookups,
  dateLabel,
  driverLabel,
  EMPTY_LOOKUPS,
  loadLookups,
  stateLabel,
  vehicleName,
} from './assignment-lookups';

@Component({
  selector: 'app-assigned-service-list',
  imports: [
    DataTableComponent,
    PageHeaderComponent,
    FormResultComponent,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    ActionTitleDirective,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="'Servicios asignados' | t" [subtitle]="state.countText('servicio', 'servicios')">
      <button mat-stroked-button type="button" (click)="exportFiltered()" [disabled]="state.total() === 0">
        <mat-icon aria-hidden="true">download</mat-icon>{{ 'Exportar CSV' | t }}
      </button>
      <a mat-flat-button class="primary-action" routerLink="/assigned-services/new"
        ><mat-icon aria-hidden="true">add</mat-icon>{{ 'Asignar ruta' | t }}</a
      >
    </app-page-header>
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table
      [state]="state"
      [columns]="columns"
      [selectable]="true"
      [entityPlural]="'servicios asignados' | t"
      [emptyMessage]="'Todavía no hay servicios asignados' | t"
      [searchPlaceholder]="'Buscar por ruta, vehículo o conductor' | t"
    >
      <ng-template #rowActions let-row>
        <a
          mat-icon-button
          [routerLink]="['/assigned-services', row.id]"
          [attr.aria-label]="('Editar servicio asignado ' | t) + label(row)"
        >
          <mat-icon aria-hidden="true">edit</mat-icon>
        </a>
        <button
          mat-icon-button
          type="button"
          (click)="remove(row)"
          [attr.aria-label]="('Eliminar servicio asignado ' | t) + label(row)"
        >
          <mat-icon aria-hidden="true">delete</mat-icon>
        </button>
      </ng-template>
      <ng-template #selectionActions let-rows let-clear="clear">
        <button mat-button type="button" (click)="actions.removeMany(rows, clear)">
          <mat-icon aria-hidden="true">delete</mat-icon>{{ 'Eliminar' | t }}
        </button>
        <button mat-button type="button" (click)="actions.exportRows(rows)">
          <mat-icon aria-hidden="true">download</mat-icon>{{ 'Exportar' | t }}
        </button>
      </ng-template>
      <a empty-action mat-stroked-button routerLink="/assigned-services/new">{{ 'Asignar la primera ruta' | t }}</a>
    </app-data-table>
  `,
})
export class AssignedServiceListComponent {
  private readonly api = inject(AssignedServicesApi);
  private readonly journeys = inject(JourneysApi);
  private readonly resources = inject(ResourcesApi);
  private readonly users = inject(UsersApi);

  private lookups: AssignmentLookups = EMPTY_LOOKUPS;
  private readonly paging = new ClientPaging<AssignedService>(() => this.api.list());
  protected readonly deleter = new DeleteFlow();
  /** Todos los servicios en el cliente; se pide después de las jornadas, vehículos y conductores para pintar sus nombres. */
  protected readonly state = new FullListState<AssignedService>(this.paging.fetch);
  private readonly table = viewChild<DataTableComponent<AssignedService>>(DataTableComponent);
  protected readonly actions = new FleetListActions<AssignedService>(this.deleter, {
    singular: t('servicio asignado'),
    plural: t('servicios asignados'),
    fileBase: 'servicios-asignados',
    label: (row) => this.label(row),
    remove: (id) => this.api.remove(id),
    reload: () => this.reloadAll(),
    csv: (rows) => assignedServicesToCsv(this.lookups, rows),
  });
  protected readonly columns: DataColumn<AssignedService>[] = [
    { id: 'route', header: t('Ruta'), cell: (s) => this.label(s), kind: 'strong' },
    { id: 'vehicle', header: t('Vehículo'), cell: (s) => vehicleName(this.lookups, readAssignment(s).vehicleId) },
    { id: 'driver', header: t('Conductor'), cell: (s) => driverLabel(this.lookups, readAssignment(s).driverId) },
    { id: 'date', header: t('Fecha'), cell: (s) => dateLabel(readAssignment(s).executionDate) },
    {
      id: 'state',
      header: t('Estado'),
      cell: (s) => stateLabel(s.state),
      tone: (s) => statusTone('assigned', s.state),
    },
  ];

  constructor() {
    loadLookups(this.journeys, this.resources, this.users).subscribe((lookups) => {
      this.lookups = lookups;
      this.state.load();
    });
  }

  protected label(service: AssignedService): string {
    return assignedRouteLabel(this.lookups, service);
  }

  protected remove(service: AssignedService): void {
    this.deleter.run({
      entity: t('servicio asignado'),
      name: this.label(service),
      request: () => this.api.remove(service.id),
      reload: () => this.reloadAll(),
    });
  }

  /** La lista se guarda mientras se pagina: tras borrar hay que volver a pedirla. */
  private reloadAll(): void {
    this.paging.invalidate();
    this.state.reload();
  }

  /** Exporta lo que dejan la búsqueda y los filtros de la tabla. */
  protected exportFiltered(): void {
    this.actions.exportRows(this.table()?.filtered() ?? this.state.rows());
  }
}
