import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { JourneysApi } from '../../core/api/data/journeys.api';
import { PlannedJourney } from '../../core/api/models';
import { RecordLoader } from '../../shared/data/record-loader';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { formatCount, formatDateTime, formatDuration } from '../../shared/format';

import { JourneyRoutesComponent } from './journey-routes.component';
import { RoutesMapComponent, StopRef } from './routes-map.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { statusTone } from '../../shared/ui/status-tone';

import { journeyStatusLabel } from './journey-labels';

@Component({
  selector: 'app-journey-detail',
  imports: [RouterLink, MatButtonModule, MatProgressBarModule, FormResultComponent, JourneyRoutesComponent, RoutesMapComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journey-detail.component.html',
})
export class JourneyDetailComponent {
  private readonly api = inject(JourneysApi);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') as string;

  protected readonly loader = new RecordLoader<PlannedJourney>(this.id, (id) => this.api.get(id));

  protected readonly status = journeyStatusLabel;
  protected readonly tone = (status: string) => statusTone('journey', status);
  protected readonly duration = formatDuration;
  protected readonly count = formatCount;
  protected readonly dateTime = formatDateTime;

  /** Ruta y parada enfocadas: las comparten el mapa, la leyenda y las tablas. */
  protected readonly selectedRoute = signal<number | null>(null);
  protected readonly selectedStop = signal<StopRef | null>(null);
  private readonly mapSection = viewChild<ElementRef<HTMLElement>>('mapSection');

  constructor() {
    this.loader.load(() => undefined);
  }

  protected focusRoute(routeIndex: number): void {
    this.selectedStop.set(null);
    this.selectedRoute.set(routeIndex);
    this.showMap();
  }

  protected focusStop(ref: StopRef): void {
    this.selectedRoute.set(ref.routeIndex);
    this.selectedStop.set(ref);
    this.showMap();
  }

  /** Lleva la vista al mapa; el foco se queda en el botón que se pulsó (la ficha se lo devuelve al cerrarse). */
  private showMap(): void {
    this.mapSection()?.nativeElement.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }
}
