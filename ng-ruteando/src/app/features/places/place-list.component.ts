import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { PlacesApi } from '../../core/api/data/places.api';
import { Place } from '../../core/api/models';
import { DataColumn, DataTableComponent } from '../../shared/data/data-table.component';
import { DeleteFlow } from '../../shared/data/delete-flow';
import { ListState } from '../../shared/data/list-state';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { FormResultComponent } from '../../shared/form/form-result.component';

import { formatLocation, placeTypeLabel } from './place-labels';

const IN_USE = 'No se puede eliminar: el lugar se usa como depósito o en otros datos';

@Component({
  selector: 'app-place-list',
  imports: [DataTableComponent, PageHeaderComponent, FormResultComponent, MatButtonModule, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Lugares">
      <a mat-flat-button routerLink="/lugares/nuevo"><mat-icon aria-hidden="true">add</mat-icon>Nuevo lugar</a>
    </app-page-header>
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table [state]="state" [columns]="columns" entityPlural="lugares" emptyMessage="Todavía no hay lugares">
      <ng-template #rowActions let-row>
        <a mat-icon-button [routerLink]="['/lugares', row.id]" [attr.aria-label]="'Editar lugar ' + row.name">
          <mat-icon aria-hidden="true">edit</mat-icon>
        </a>
        <button mat-icon-button type="button" (click)="remove(row)" [attr.aria-label]="'Eliminar lugar ' + row.name">
          <mat-icon aria-hidden="true">delete</mat-icon>
        </button>
      </ng-template>
      <a empty-action mat-stroked-button routerLink="/lugares/nuevo">Crear el primer lugar</a>
    </app-data-table>
  `,
})
export class PlaceListComponent {
  private readonly api = inject(PlacesApi);

  protected readonly deleter = new DeleteFlow();
  protected readonly state = new ListState<Place>((params) => this.api.list(params));
  protected readonly columns: DataColumn<Place>[] = [
    { id: 'name', header: 'Nombre', cell: (p) => p.name },
    { id: 'type', header: 'Tipo', cell: (p) => placeTypeLabel(p.type) },
    { id: 'address', header: 'Dirección', cell: (p) => p.address ?? '' },
    { id: 'phoneNumber', header: 'Teléfono', cell: (p) => p.phoneNumber ?? '' },
    { id: 'location', header: 'Latitud / longitud', cell: (p) => formatLocation(p) },
  ];

  constructor() {
    this.state.load(0);
  }

  protected remove(row: Place): void {
    this.deleter.run({
      entity: 'lugar',
      name: row.name,
      request: () => this.api.remove(row.id),
      byStatus: { 400: IN_USE, 409: IN_USE },
      reload: () => this.state.reload(),
    });
  }
}
