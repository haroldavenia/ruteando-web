import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { JourneysApi } from '../../core/api/data/journeys.api';
import { Journey } from '../../core/api/models';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { DataColumn, DataFacet, DataTableComponent } from '../../shared/data/data-table.component';
import { DeleteFlow } from '../../shared/data/delete-flow';
import { FullListState } from '../../shared/data/full-list-state';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { formatCount, formatDateTime } from '../../shared/format';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';
import { statusTone } from '../../shared/ui/status-tone';
import { JOURNEY_STATUS_LABELS, journeyStatusLabel } from './journey-labels';

@Component({
  selector: 'app-journey-list',
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
    <app-page-header [title]="'Jornadas' | t" [subtitle]="state.countText('jornada', 'jornadas')">
      <a mat-flat-button class="primary-action" routerLink="/journeys/new"
        ><mat-icon aria-hidden="true">add</mat-icon>{{ 'Planificar jornada' | t }}</a
      >
    </app-page-header>
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table
      [state]="state"
      [columns]="columns"
      [facet]="facet()"
      [entityPlural]="'jornadas' | t"
      [emptyMessage]="'Todavía no hay jornadas' | t"
      [searchPlaceholder]="'Buscar por nombre o configuración' | t"
    >
      <ng-template #rowActions let-row>
        <a mat-icon-button [routerLink]="['/journeys', row.id]" [attr.aria-label]="('Ver la jornada ' | t) + row.name">
          <mat-icon aria-hidden="true">visibility</mat-icon>
        </a>
        <button
          mat-icon-button
          type="button"
          (click)="remove(row)"
          [attr.aria-label]="('Eliminar la jornada ' | t) + row.name"
        >
          <mat-icon aria-hidden="true">delete</mat-icon>
        </button>
      </ng-template>
      <a empty-action mat-stroked-button routerLink="/journeys/new">{{ 'Planificar la primera jornada' | t }}</a>
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
    return {
      label: t('Estado'),
      of: (j) => j.status,
      options: [...known, ...unknown].map((key) => ({ key, label: journeyStatusLabel(key) })),
    };
  });

  protected readonly columns: DataColumn<Journey>[] = [
    { id: 'name', header: t('Nombre'), cell: (j) => j.name, link: (j) => ['/journeys', j.id] },
    {
      id: 'status',
      header: t('Estado'),
      cell: (j) => journeyStatusLabel(j.status),
      tone: (j) => statusTone('journey', j.status),
    },
    { id: 'settings', header: t('Configuración'), cell: (j) => j.settings?.name ?? '' },
    {
      id: 'services',
      header: t('Servicios'),
      cell: (j) => (j.totalServices === null ? '' : formatCount(j.totalServices)),
    },
    {
      id: 'resources',
      header: t('Vehículos'),
      cell: (j) => (j.totalResources === null ? '' : formatCount(j.totalResources)),
    },
    { id: 'createdAt', header: t('Creada'), cell: (j) => formatDateTime(j.createdAt) },
  ];

  constructor() {
    this.state.load();
  }

  protected remove(row: Journey): void {
    this.deleter.run({
      entity: t('jornada'),
      name: row.name,
      request: () => this.api.remove(row.id),
      reload: () => this.state.reload(),
    });
  }
}
