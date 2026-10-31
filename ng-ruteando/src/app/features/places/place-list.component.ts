import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { PlacesApi } from '../../core/api/data/places.api';
import { Place } from '../../core/api/models';
import { DataColumn, DataFacet, DataTableComponent } from '../../shared/data/data-table.component';
import { DeleteFlow } from '../../shared/data/delete-flow';
import { FullListState } from '../../shared/data/full-list-state';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';

import { PlacesMapComponent } from './places-map.component';
import { PLACE_TYPE_LABELS, formatLocation, placeTypeLabel } from './place-labels';

const IN_USE = 'No se puede eliminar: el lugar se usa como depósito o en otros datos';

@Component({
  selector: 'app-place-list',
  imports: [DataTableComponent, PlacesMapComponent, PageHeaderComponent, FormResultComponent, MatButtonModule, MatIconModule, RouterLink, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './place-list.component.scss',
  template: `
    <app-page-header title="Lugares" [subtitle]="state.countText('lugar', 'lugares')">
      <a mat-flat-button class="primary-action" routerLink="/lugares/nuevo"><mat-icon aria-hidden="true">add</mat-icon>Nuevo lugar</a>
    </app-page-header>
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <!-- Desde 1100px el mapa queda fijo a un lado y la lista al otro; por debajo, uno sobre otra -->
    <div [class.split-view]="state.rows().length > 0">
      @if (state.rows().length > 0) {
        <section class="card sticky" aria-labelledby="places-map-title">
          <h2 id="places-map-title">Mapa de los lugares</h2>
          <app-places-map [places]="mapPlaces()" [selectedId]="selected()?.id ?? null" (placeSelect)="select($event)" />
          @if (selected(); as place) {
            <div class="ficha" role="status">
              <div class="ficha-text">
                <b>{{ place.name }}</b>
                <span>{{ typeLabel(place.type) }}{{ place.address ? ' · ' + place.address : '' }}</span>
              </div>
              <a mat-stroked-button [routerLink]="['/lugares', place.id]" [attr.aria-label]="'Editar lugar ' + place.name">Editar</a>
              <button mat-icon-button type="button" (click)="selected.set(null)" aria-label="Cerrar la ficha del lugar">
                <mat-icon aria-hidden="true">close</mat-icon>
              </button>
            </div>
          }
        </section>
      }
      <app-data-table
        [state]="state"
        [columns]="columns"
        [facet]="facet()"
        entityPlural="lugares"
        emptyMessage="Todavía no hay lugares"
        searchPlaceholder="Buscar por nombre o dirección"
      >
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
    </div>
  `,
})
export class PlaceListComponent {
  private readonly api = inject(PlacesApi);
  private readonly table = viewChild<DataTableComponent<Place>>(DataTableComponent);

  protected readonly deleter = new DeleteFlow();
  /** Todos los lugares en el cliente (hasta 1000): el mapa y la búsqueda necesitan tenerlos todos. */
  protected readonly state = new FullListState<Place>((params) => this.api.list(params));
  protected readonly typeLabel = placeTypeLabel;
  /** El lugar que se eligió en el mapa. */
  protected readonly selected = signal<Place | null>(null);

  /** Chips de tipo: los que conoce la aplicación, en su orden, y al final cualquier tipo desconocido que traigan los lugares. */
  protected readonly facet = computed<DataFacet<Place>>(() => {
    const known = Object.keys(PLACE_TYPE_LABELS);
    const unknown = [...new Set(this.state.rows().map((p) => p.type))].filter((key) => !known.includes(key));
    return { label: 'Tipo', of: (p) => p.type, options: [...known, ...unknown].map((key) => ({ key, label: placeTypeLabel(key) })) };
  });

  /** Los lugares del mapa son los que cumplen la búsqueda y el chip elegidos, no solo los de la página que se ve. */
  protected readonly mapPlaces = computed(() => this.table()?.filtered() ?? this.state.rows());

  protected readonly columns: DataColumn<Place>[] = [
    { id: 'name', header: 'Nombre', cell: (p) => p.name, kind: 'strong' },
    { id: 'type', header: 'Tipo', cell: (p) => placeTypeLabel(p.type) },
    { id: 'address', header: 'Dirección', cell: (p) => p.address ?? '', kind: 'muted' },
    { id: 'phoneNumber', header: 'Teléfono', cell: (p) => p.phoneNumber ?? '', kind: 'muted' },
    { id: 'location', header: 'Latitud / longitud', cell: (p) => formatLocation(p), kind: 'muted' },
  ];

  constructor() {
    this.state.load();
  }

  protected select(id: string | null): void {
    this.selected.set(id ? (this.state.rows().find((p) => p.id === id) ?? null) : null);
  }

  protected remove(row: Place): void {
    this.deleter.run({
      entity: 'lugar',
      name: row.name,
      request: () => this.api.remove(row.id),
      byStatus: { 400: IN_USE, 409: IN_USE },
      reload: () => {
        this.selected.set(null);
        this.state.reload();
      },
    });
  }
}
