import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { JourneysApi } from '../../core/api/data/journeys.api';
import { DomainRoute, PlannedJourney } from '../../core/api/models';
import { RECORD_GONE, RecordLoader } from '../../shared/data/record-loader';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { formatCount, formatDateTime, formatDistance, formatDuration, formatPercent } from '../../shared/format';

import { RouteVisitsComponent } from './route-visits.component';
import { RoutesMapComponent, StopRef } from './routes-map.component';

/**
 * Detalle de una ruta de una jornada: resumen, mapa de esa sola ruta y sus paradas. Carga la jornada
 * completa (el gateway no tiene un endpoint de una ruta) y elige la ruta por `routeIndex`.
 */
@Component({
  selector: 'app-route-detail',
  imports: [RouterLink, MatButtonModule, MatProgressBarModule, FormResultComponent, RoutesMapComponent, RouteVisitsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './route-detail.component.html',
  styleUrl: './route-detail.component.scss',
})
export class RouteDetailComponent {
  private readonly api = inject(JourneysApi);
  private readonly params = inject(ActivatedRoute).snapshot.paramMap;

  protected readonly journeyId = this.params.get('id') as string;
  /** `null` si el parámetro no es un entero no negativo. */
  private readonly routeIndex = /^\d+$/.test(this.params.get('routeIndex') ?? '') ? Number(this.params.get('routeIndex')) : null;

  protected readonly loader = new RecordLoader<PlannedJourney>(this.journeyId, (id) => this.api.get(id));

  protected readonly route = computed<DomainRoute | null>(() => {
    const journey = this.loader.record();
    return journey && this.routeIndex !== null ? (journey.routes.find((r) => r.routeIndex === this.routeIndex) ?? null) : null;
  });
  /** La ruta como lista de una sola, estable mientras no cambie la jornada: el mapa no se redibuja. */
  protected readonly routes = computed(() => {
    const route = this.route();
    return route ? [route] : [];
  });
  /** La jornada cargó pero no tiene esa ruta (o el índice no es válido). */
  protected readonly routeMissing = computed(() => this.loader.status() === 'ready' && this.route() === null);
  protected readonly gone = RECORD_GONE;

  protected readonly selectedStop = signal<StopRef | null>(null);
  private readonly mapSection = viewChild<ElementRef<HTMLElement>>('mapSection');

  protected readonly distance = formatDistance;
  protected readonly duration = formatDuration;
  protected readonly percent = formatPercent;
  protected readonly dateTime = formatDateTime;
  protected readonly count = formatCount;

  constructor() {
    this.loader.load(() => undefined);
  }

  protected vehicle(route: DomainRoute): string {
    const resource = route.resource;
    if (!resource) {
      return '—';
    }
    return resource.plate ? `${resource.name} (${resource.plate})` : resource.name;
  }

  protected focusStop(ref: StopRef): void {
    this.selectedStop.set(ref);
    this.mapSection()?.nativeElement.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }
}
