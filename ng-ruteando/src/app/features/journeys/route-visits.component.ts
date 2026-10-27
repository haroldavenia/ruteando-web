import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';

import { MasterDomainsService } from '../../core/api/data/master-domains.service';
import { DomainRoute, DomainWaypoint } from '../../core/api/models';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { formatDateTime, formatLatLng } from '../../shared/format';
import { DEFAULT_PACKAGE_STATUSES, packageStatusLabel } from '../packages/package-labels';

import { stopTypeLabel } from './journey-labels';
import { RouteVisit, UNAVAILABLE, progressText, visitStatus } from './route-visit-filters';
import { RouteVisitsStore } from './route-visits.store';
import { StopRef } from './routes-map.component';

interface StopRow {
  stop: DomainWaypoint;
  /** `null` en las paradas sin paquete (depósitos). */
  visit: RouteVisit | null;
}

/**
 * Paradas de una ruta con el seguimiento de sus visitas: las paradas con paquete muestran el estado del
 * paquete y permiten cambiarlo. Con un filtro activo solo se listan las visitas que coinciden.
 */
@Component({
  selector: 'app-route-visits',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatMenuModule, FormResultComponent],
  providers: [RouteVisitsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './route-visits.component.html',
  styleUrl: './route-visits.component.scss',
})
export class RouteVisitsComponent {
  readonly route = input.required<DomainRoute>();
  /** Se pide enfocar una parada en el mapa. */
  readonly stopFocus = output<StopRef>();

  protected readonly store = inject(RouteVisitsStore);
  private readonly masters = inject(MasterDomainsService);

  protected readonly unavailable = UNAVAILABLE;
  protected readonly statusLabel = packageStatusLabel;
  protected readonly dateTime = formatDateTime;
  protected readonly latLng = formatLatLng;
  protected readonly stopType = stopTypeLabel;

  /** Estados del dominio `PackageStatus` del gateway o, si aún no hay, los habituales. */
  protected readonly statuses = computed(() => {
    const values = this.masters.values('PackageStatus');
    return values.length ? values.map((v) => v.key) : DEFAULT_PACKAGE_STATUSES;
  });

  protected readonly rows = computed<StopRow[]>(() => {
    if (this.store.filtering()) {
      return this.store.filtered().map((visit) => ({ stop: visit.stop, visit }));
    }
    const bySequence = new Map(this.store.visits().map((visit) => [visit.stop.sequence, visit]));
    return this.route().waypoints.map((stop) => ({ stop, visit: bySequence.get(stop.sequence) ?? null }));
  });

  protected readonly hasVisits = computed(() => this.store.visits().length > 0);
  protected readonly progressText = computed(() => progressText(this.store.progress()));
  protected readonly progressPercent = computed(() => {
    const { attended, total } = this.store.progress();
    return total === 0 ? 0 : Math.round((attended / total) * 100);
  });
  protected readonly noMatches = computed(() => this.store.filtering() && this.rows().length === 0);

  constructor() {
    this.masters.load().subscribe({ error: () => undefined });
    // Una ruta nueva (otra jornada cargada) vuelve a leer sus visitas
    effect(() => {
      const waypoints = this.route().waypoints;
      untracked(() => this.store.load(waypoints));
    });
  }

  protected statusText(visit: RouteVisit): string {
    const status = visitStatus(visit);
    return status === null ? 'Cargando…' : status === UNAVAILABLE ? 'No disponible' : packageStatusLabel(status);
  }

  protected statusesExcept(visit: RouteVisit): string[] {
    return this.statuses().filter((status) => status !== visit.pkg?.status);
  }

  protected visitName(visit: RouteVisit): string {
    return visit.pkg?.name || visit.packageId;
  }

  protected setStatusFilter(event: Event): void {
    this.store.setStatusFilter((event.target as HTMLSelectElement).value);
  }

  protected setTextFilter(event: Event): void {
    this.store.setTextFilter((event.target as HTMLInputElement).value);
  }

  protected focus(row: StopRow): void {
    this.stopFocus.emit({ routeIndex: this.route().routeIndex, sequence: row.stop.sequence });
  }
}
