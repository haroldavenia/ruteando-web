import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { DomainRoute } from '../../core/api/models';
import { ThemeService } from '../../core/theme/theme.service';
import { formatCount, formatDateTime, formatDistance, formatDuration, formatLatLng, formatPercent } from '../../shared/format';

import { routeColorFor } from '../../shared/map/route-colors';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';

import { stopTypeLabel } from './journey-labels';
import { StopRef } from './routes-map.component';

/**
 * Rutas de una jornada, una tarjeta por ruta con sus cifras (y una barra para el uso de peso y de volumen) y la franja del color que
 * tiene en el mapa; cada una se abre para ver sus paradas en orden. Lee el modelo de dominio (`DomainRoute`), el mismo que usa el
 * mapa de rutas.
 */
@Component({
  selector: 'app-journey-routes',
  imports: [MatButtonModule, MatIconModule, RouterLink, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journey-routes.component.html',
  styleUrl: './journey-routes.component.scss',
})
export class JourneyRoutesComponent {
  readonly routes = input.required<readonly DomainRoute[]>();
  /** Jornada a la que pertenecen las rutas, para enlazar a cada una. */
  readonly journeyId = input.required<string>();
  /** Ruta enfocada en el mapa, para marcar su fila. */
  readonly selectedRoute = input<number | null>(null);
  /** Se pide enfocar una ruta o una parada en el mapa. */
  readonly routeFocus = output<number>();
  readonly stopFocus = output<StopRef>();

  protected readonly open = signal<ReadonlySet<number>>(new Set());
  private readonly theme = inject(ThemeService);

  protected readonly distance = formatDistance;
  protected readonly duration = formatDuration;
  protected readonly percent = formatPercent;
  protected readonly dateTime = formatDateTime;
  protected readonly latLng = formatLatLng;
  protected readonly stopType = stopTypeLabel;

  /** El color de la ruta en el mapa, para el tema que se ve. */
  protected color(route: DomainRoute): string {
    return routeColorFor(route.routeIndex, this.theme.scheme());
  }

  /** Relleno de una barra de uso, de 0 a 100; sin dato, vacía. */
  protected level(percent: number | null): number {
    return percent === null || !Number.isFinite(percent) ? 0 : Math.max(0, Math.min(100, percent));
  }

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
