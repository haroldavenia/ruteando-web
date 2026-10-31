import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { JourneysApi } from '../../core/api/data/journeys.api';
import { Journey } from '../../core/api/models';
import { DataColumn, DataFacet, DataTableComponent } from '../../shared/data/data-table.component';
import { DeleteFlow } from '../../shared/data/delete-flow';
import { FullListState } from '../../shared/data/full-list-state';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { formatCount, formatDateTime } from '../../shared/format';
import { statusTone } from '../../shared/ui/status-tone';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';

import { JOURNEY_STATUS_LABELS, journeyStatusLabel } from './journey-labels';

@Component({
  selector: 'app-journey-list',
  imports: [DataTableComponent, PageHeaderComponent, FormResultComponent, MatButtonModule, MatIconModule, RouterLink, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Jornadas" [subtitle]="state.countText('jornada', 'jornadas')">
      <a mat-flat-button class="primary-action" routerLink="/jornadas/nueva"><mat-icon aria-hidden="true">add</mat-icon>Planificar jornada</a>
    </app-page-header>
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table
      [state]="state"
      [columns]="columns"
      [facet]="facet()"
      entityPlural="jornadas"
      emptyMessage="Todavía no hay jornadas"
      searchPlaceholder="Buscar por nombre o configuración"
    >
      <ng-template #rowActions let-row>
        <a mat-icon-button [routerLink]="['/jornadas', row.id]" [attr.aria-label]="'Ver la jornada ' + row.name">
          <mat-icon aria-hidden="true">visibility</mat-icon>
        </a>
        <button mat-icon-button type="button" (click)="remove(row)" [attr.aria-label]="'Eliminar la jornada ' + row.name">
          <mat-icon aria-hidden="true">delete</mat-icon>
        </button>
      </ng-template>
      <a empty-action mat-stroked-button routerLink="/jornadas/nueva">Planificar la primera jornada</a>
    </app-data-table>
  `,
})
export class JourneyListComponent {
  private readonly api = inject(JourneysApi);

  protected readonly deleter = new DeleteFlow();
  /** Todas las jornadas en el cliente (hasta 1000): el gateway no filtra por estado, así que los chips y la búsqueda necesitan tenerlas todas. */
  protected readonly state = new FullListState<Journey>((params) => this.api.list(params));

  /** Chips de estado: los que conoce la aplicación, en su orden, y al final cualquier estado desconocido que traigan las jornadas. */
  protected readonly facet = computed<DataFacet<Journey>>(() => {
    const known = Object.keys(JOURNEY_STATUS_LABELS);
    const unknown = [...new Set(this.state.rows().map((j) => j.status))].filter((key) => !known.includes(key));
    return { label: 'Estado', of: (j) => j.status, options: [...known, ...unknown].map((key) => ({ key, label: journeyStatusLabel(key) })) };
  });

  protected readonly columns: DataColumn<Journey>[] = [
    { id: 'name', header: 'Nombre', cell: (j) => j.name, link: (j) => ['/jornadas', j.id] },
    { id: 'status', header: 'Estado', cell: (j) => journeyStatusLabel(j.status), tone: (j) => statusTone('journey', j.status) },
    { id: 'settings', header: 'Configuración', cell: (j) => j.settings?.name ?? '' },
    { id: 'services', header: 'Servicios', cell: (j) => (j.totalServices === null ? '' : formatCount(j.totalServices)) },
    { id: 'resources', header: 'Vehículos', cell: (j) => (j.totalResources === null ? '' : formatCount(j.totalResources)) },
    { id: 'createdAt', header: 'Creada', cell: (j) => formatDateTime(j.createdAt) },
  ];

  constructor() {
    this.state.load();
  }

  protected remove(row: Journey): void {
    this.deleter.run({
      entity: 'jornada',
      name: row.name,
      request: () => this.api.remove(row.id),
      reload: () => this.state.reload(),
    });
  }
}
