import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { ZonesApi } from '../../core/api/data/zones.api';
import { Zone } from '../../core/api/models';
import { ClientPaging } from '../../shared/data/client-paging';
import { DataColumn, DataTableComponent } from '../../shared/data/data-table.component';
import { DeleteFlow } from '../../shared/data/delete-flow';
import { ListState } from '../../shared/data/list-state';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { colorName } from '../../shared/map/route-colors';
import { verticesFromRing } from '../../shared/map/polygon-geometry';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';

export const ZONE_IN_USE = 'No se puede eliminar: la zona se usa en lugares, paquetes o configuraciones';

@Component({
  selector: 'app-zone-list',
  imports: [DataTableComponent, PageHeaderComponent, FormResultComponent, MatButtonModule, MatIconModule, RouterLink, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Zonas" [subtitle]="state.countText('zona', 'zonas')">
      <a mat-flat-button class="primary-action" routerLink="/zonas/nueva"><mat-icon aria-hidden="true">add</mat-icon>Nueva zona</a>
    </app-page-header>
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table [state]="state" [columns]="columns" entityPlural="zonas" emptyMessage="Todavía no hay zonas">
      <ng-template #rowActions let-row>
        <a mat-icon-button [routerLink]="['/zonas', row.id]" [attr.aria-label]="'Editar zona ' + row.name">
          <mat-icon aria-hidden="true">edit</mat-icon>
        </a>
        <button mat-icon-button type="button" (click)="remove(row)" [attr.aria-label]="'Eliminar zona ' + row.name">
          <mat-icon aria-hidden="true">delete</mat-icon>
        </button>
      </ng-template>
      <a empty-action mat-stroked-button routerLink="/zonas/nueva">Crear la primera zona</a>
    </app-data-table>
  `,
})
export class ZoneListComponent {
  private readonly api = inject(ZonesApi);
  private readonly paging = new ClientPaging<Zone>(() => this.api.list());

  protected readonly deleter = new DeleteFlow();
  protected readonly state = new ListState<Zone>(this.paging.fetch);
  protected readonly columns: DataColumn<Zone>[] = [
    { id: 'color', header: 'Color', cell: (z) => colorName(z.color), swatch: (z) => z.color },
    { id: 'name', header: 'Nombre', cell: (z) => z.name, kind: 'strong' },
    { id: 'code', header: 'Código', cell: (z) => z.code },
    { id: 'vertices', header: 'Vértices', cell: (z) => String(verticesFromRing(z.boundary?.coordinates?.[0]).length) },
    { id: 'active', header: 'Estado', cell: (z) => (z.active ? 'Activa' : 'Inactiva') },
  ];

  constructor() {
    this.state.load(0);
  }

  protected remove(row: Zone): void {
    this.deleter.run({
      entity: 'zona',
      name: row.name,
      request: () => this.api.remove(row.id),
      byStatus: { 400: ZONE_IN_USE, 409: ZONE_IN_USE },
      reload: () => {
        this.paging.invalidate();
        this.state.reload();
      },
    });
  }
}
