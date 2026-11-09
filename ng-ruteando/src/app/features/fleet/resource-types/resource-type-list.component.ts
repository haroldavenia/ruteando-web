import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { ResourceTypesApi } from '../../../core/api/data/resource-types.api';
import { ResourceType } from '../../../core/api/models';
import { t } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { DataColumn, DataTableComponent } from '../../../shared/data/data-table.component';
import { DeleteFlow } from '../../../shared/data/delete-flow';
import { FullListState } from '../../../shared/data/full-list-state';
import { PageHeaderComponent } from '../../../shared/data/page-header.component';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { ActionTitleDirective } from '../../../shared/ui/action-title.directive';
import { typesToCsv } from '../fleet-export';
import { capacitySummary, profileLabel } from '../fleet-labels';
import { FleetListActions } from '../fleet-list-actions';
import { FleetTabsComponent } from '../fleet-tabs.component';

const IN_USE = t('No se puede eliminar: hay vehículos de este tipo');

@Component({
  selector: 'app-resource-type-list',
  imports: [
    DataTableComponent,
    FleetTabsComponent,
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
    <app-page-header [title]="'Tipos de vehículo' | t" [subtitle]="state.countText('tipo', 'tipos')">
      <button mat-stroked-button type="button" (click)="exportFiltered()" [disabled]="state.total() === 0">
        <mat-icon aria-hidden="true">download</mat-icon>{{ 'Exportar CSV' | t }}
      </button>
      <a mat-flat-button class="primary-action" routerLink="/flota/tipos/nuevo"
        ><mat-icon aria-hidden="true">add</mat-icon>{{ 'Nuevo tipo' | t }}</a
      >
    </app-page-header>
    <app-fleet-tabs />
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table
      [state]="state"
      [columns]="columns"
      [selectable]="true"
      [entityPlural]="'tipos de vehículo' | t"
      [emptyMessage]="'Todavía no hay tipos de vehículo' | t"
      [searchPlaceholder]="'Buscar por nombre o categoría' | t"
    >
      <ng-template #rowActions let-row>
        <a mat-icon-button [routerLink]="['/flota/tipos', row.id]" [attr.aria-label]="('Editar tipo ' | t) + row.name">
          <mat-icon aria-hidden="true">edit</mat-icon>
        </a>
        <button
          mat-icon-button
          type="button"
          (click)="remove(row)"
          [attr.aria-label]="('Eliminar tipo ' | t) + row.name"
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
      <a empty-action mat-stroked-button routerLink="/flota/tipos/nuevo">{{ 'Crear el primer tipo' | t }}</a>
    </app-data-table>
  `,
})
export class ResourceTypeListComponent {
  private readonly api = inject(ResourceTypesApi);
  private readonly table = viewChild<DataTableComponent<ResourceType>>(DataTableComponent);

  protected readonly deleter = new DeleteFlow();
  /** Todos los tipos en el cliente (hasta 1000): la búsqueda y el recuento son sobre todos, como en la aplicación anterior. */
  protected readonly state = new FullListState<ResourceType>((params) => this.api.list(params));
  protected readonly actions = new FleetListActions<ResourceType>(this.deleter, {
    singular: t('tipo'),
    plural: t('tipos'),
    fileBase: 'tipos-de-vehiculo',
    label: (type) => type.name,
    remove: (id) => this.api.remove(id),
    byStatus: { 400: IN_USE, 409: IN_USE },
    reload: () => this.state.reload(),
    csv: typesToCsv,
  });
  protected readonly columns: DataColumn<ResourceType>[] = [
    { id: 'name', header: t('Nombre'), cell: (r) => r.name, kind: 'strong' },
    { id: 'category', header: t('Categoría'), cell: (r) => r.category },
    { id: 'capacity', header: t('Capacidad'), cell: (r) => capacitySummary(r) },
    { id: 'osrmProfile', header: t('Perfil de ruteo'), cell: (r) => profileLabel(r.osrmProfile) },
  ];

  constructor() {
    this.state.load();
  }

  protected remove(row: ResourceType): void {
    this.deleter.run({
      entity: t('tipo de vehículo'),
      name: row.name,
      request: () => this.api.remove(row.id),
      byStatus: { 400: IN_USE, 409: IN_USE },
      reload: () => this.state.reload(),
    });
  }

  /** Exporta lo que dejan la búsqueda y los filtros de la tabla. */
  protected exportFiltered(): void {
    this.actions.exportRows(this.table()?.filtered() ?? this.state.rows());
  }
}
