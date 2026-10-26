import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { DomainRoute } from '../../core/api/models';
import { formatCount, formatDateTime, formatDistance, formatDuration, formatLatLng, formatPercent } from '../../shared/format';

import { stopTypeLabel } from './journey-labels';
import { StopRef } from './routes-map.component';

/**
 * Rutas de una jornada en una tabla; cada fila se abre para ver sus paradas en orden. Lee el modelo de
 * dominio (`DomainRoute`), el mismo que usará el mapa de rutas.
 */
@Component({
  selector: 'app-journey-routes',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journey-routes.component.html',
  styleUrl: './journey-routes.component.scss',
})
export class JourneyRoutesComponent {
  readonly routes = input.required<readonly DomainRoute[]>();
  /** Ruta enfocada en el mapa, para marcar su fila. */
  readonly selectedRoute = input<number | null>(null);
  /** Se pide enfocar una ruta o una parada en el mapa. */
  readonly routeFocus = output<number>();
  readonly stopFocus = output<StopRef>();

  protected readonly open = signal<ReadonlySet<number>>(new Set());

  protected readonly distance = formatDistance;
  protected readonly duration = formatDuration;
  protected readonly percent = formatPercent;
  protected readonly dateTime = formatDateTime;
  protected readonly latLng = formatLatLng;
  protected readonly stopType = stopTypeLabel;

  protected vehicle(route: DomainRoute): string {
    const resource = route.resource;
    if (!resource) {
      return '—';
    }
    return resource.plate ? `${resource.name} (${resource.plate})` : resource.name;
  }

  protected stops(route: DomainRoute): string {
    return formatCount(route.waypoints.length);
  }

  protected isOpen(route: DomainRoute): boolean {
    return this.open().has(route.routeIndex);
  }

  protected toggle(route: DomainRoute): void {
    const next = new Set(this.open());
    if (!next.delete(route.routeIndex)) {
      next.add(route.routeIndex);
    }
    this.open.set(next);
  }
}
