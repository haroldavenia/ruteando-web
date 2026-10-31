import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { ResourceTypesApi } from '../../../core/api/data/resource-types.api';
import { ResourceType } from '../../../core/api/models';
import { DataColumn, DataTableComponent } from '../../../shared/data/data-table.component';
import { DeleteFlow } from '../../../shared/data/delete-flow';
import { ListState } from '../../../shared/data/list-state';
import { PageHeaderComponent } from '../../../shared/data/page-header.component';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { ActionTitleDirective } from '../../../shared/ui/action-title.directive';
import { FleetTabsComponent } from '../fleet-tabs.component';
import { profileLabel } from '../fleet-labels';

@Component({
  selector: 'app-resource-type-list',
  imports: [DataTableComponent, FleetTabsComponent, PageHeaderComponent, FormResultComponent, MatButtonModule, MatIconModule, RouterLink, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Tipos de vehículo" [subtitle]="state.countText('tipo', 'tipos')">
      <a mat-flat-button class="primary-action" routerLink="/flota/tipos/nuevo"><mat-icon aria-hidden="true">add</mat-icon>Nuevo tipo</a>
    </app-page-header>
    <app-fleet-tabs />
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table [state]="state" [columns]="columns" entityPlural="tipos de vehículo" emptyMessage="Todavía no hay tipos de vehículo">
      <ng-template #rowActions let-row>
        <a mat-icon-button [routerLink]="['/flota/tipos', row.id]" [attr.aria-label]="'Editar tipo ' + row.name">
          <mat-icon aria-hidden="true">edit</mat-icon>
        </a>
        <button mat-icon-button type="button" (click)="remove(row)" [attr.aria-label]="'Eliminar tipo ' + row.name">
          <mat-icon aria-hidden="true">delete</mat-icon>
        </button>
      </ng-template>
      <a empty-action mat-stroked-button routerLink="/flota/tipos/nuevo">Crear el primer tipo</a>
    </app-data-table>
  `,
})
export class ResourceTypeListComponent {
  private readonly api = inject(ResourceTypesApi);

  protected readonly deleter = new DeleteFlow();
  protected readonly state = new ListState<ResourceType>((params) => this.api.list(params));
  protected readonly columns: DataColumn<ResourceType>[] = [
    { id: 'name', header: 'Nombre', cell: (r) => r.name, kind: 'strong' },
    { id: 'category', header: 'Categoría', cell: (r) => r.category },
    { id: 'osrmProfile', header: 'Perfil de ruteo', cell: (r) => profileLabel(r.osrmProfile) },
  ];

  constructor() {
    this.state.load(0);
  }

  protected remove(row: ResourceType): void {
    this.deleter.run({
      entity: 'tipo de vehículo',
      name: row.name,
      request: () => this.api.remove(row.id),
      byStatus: { 400: IN_USE, 409: IN_USE },
      reload: () => this.state.reload(),
    });
  }
}

const IN_USE = 'No se puede eliminar: hay vehículos de este tipo';
