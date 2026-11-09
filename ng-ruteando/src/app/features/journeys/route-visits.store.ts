import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { catchError, finalize, from, map, mergeMap, of, Subscription } from 'rxjs';

import { PackagesApi } from '../../core/api/data/packages.api';
import { DomainWaypoint, Package } from '../../core/api/models';
import { t } from '../../core/i18n/i18n';
import { messageFor } from '../../shared/data/api-messages';
import { packageStatusLabel } from '../packages/package-labels';
import { changePackageStatus } from '../packages/package-status-change';
import {
  filterVisits,
  hasFilters,
  NO_FILTERS,
  RouteVisit,
  VisitFilters,
  visitProgress,
  visitsOf,
} from './route-visit-filters';

/** Paquetes que se piden a la vez: el gateway no tiene un endpoint por lotes. */
export const VISITS_CONCURRENCY = 6;

/**
 * Estado de las visitas de una ruta (se provee en el componente de la pantalla). Las visitas son las paradas
 * con paquete; el estado de cada una se lee del paquete y se cambia con `PATCH /packages/{id}/status/{status}`.
 * El cambio es pesimista: la fila solo cambia cuando el gateway responde bien.
 */
@Injectable()
export class RouteVisitsStore {
  private readonly api = inject(PackagesApi);
  private readonly dialog = inject(MatDialog);

  private waypoints: readonly DomainWaypoint[] = [];
  private loading: Subscription | null = null;

  readonly visits = signal<RouteVisit[]>([]);
  readonly filters = signal<VisitFilters>(NO_FILTERS);
  /** Ids de paquete con un cambio de estado en curso. */
  readonly busy = signal<ReadonlySet<string>>(new Set());
  readonly success = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly filtered = computed(() => filterVisits(this.visits(), this.filters()));
  readonly progress = computed(() => visitProgress(this.visits()));
  readonly filtering = computed(() => hasFilters(this.filters()));
  readonly pending = computed(() => this.visits().filter((v) => v.state === 'loading').length);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.loading?.unsubscribe());
  }

  /** Prepara las visitas de las paradas de la ruta y lee sus paquetes. */
  load(waypoints: readonly DomainWaypoint[]): void {
    this.waypoints = waypoints;
    this.reload();
  }

  /** Vuelve a leer los paquetes (el estado pudo cambiar fuera de la pantalla); conserva los filtros. */
  reload(): void {
    this.loading?.unsubscribe();
    this.success.set(null);
    this.error.set(null);
    this.visits.set(visitsOf(this.waypoints));
    const ids = [...new Set(this.visits().map((v) => v.packageId))];
    this.loading = from(ids)
      .pipe(
        mergeMap(
          (id) =>
            this.api.get(id).pipe(
              map((pkg) => ({ id, pkg })),
              catchError(() => of({ id, pkg: null }))
            ),
          VISITS_CONCURRENCY
        )
      )
      .subscribe(({ id, pkg }) => this.patch(id, { state: pkg ? 'ready' : 'unavailable', pkg }));
  }

  setStatusFilter(status: string): void {
    this.filters.update((f) => ({ ...f, status }));
  }

  setTextFilter(text: string): void {
    this.filters.update((f) => ({ ...f, text }));
  }

  clearFilters(): void {
    this.filters.set(NO_FILTERS);
  }

  isBusy(visit: RouteVisit): boolean {
    return this.busy().has(visit.packageId);
  }

  /** Cómo se nombra la visita en etiquetas y avisos: la guía del paquete, su nombre o su id. */
  label(visit: RouteVisit): string {
    return visit.pkg?.guideNumber?.trim() || visit.pkg?.name || visit.packageId;
  }

  change(visit: RouteVisit, status: string): void {
    if (visit.state !== 'ready' || this.isBusy(visit)) {
      return;
    }
    this.success.set(null);
    this.error.set(null);
    this.setBusy(visit.packageId, true);
    changePackageStatus(this.api, this.dialog, { id: visit.packageId, label: this.label(visit) }, status)
      .pipe(finalize(() => this.setBusy(visit.packageId, false)))
      .subscribe({
        next: (updated: Package) => {
          this.patch(visit.packageId, { pkg: { ...visit.pkg, ...updated, status: updated.status ?? status } });
          this.success.set(
            t('La visita «{0}» ahora está {1}', [this.label(visit), packageStatusLabel(status).toLowerCase()])
          );
        },
        error: (err: unknown) => this.error.set(messageFor(err)),
      });
  }

  /** Actualiza todas las visitas de un paquete (la misma parada puede repetirse en la ruta). */
  private patch(packageId: string, changes: Partial<RouteVisit>): void {
    this.visits.update((visits) => visits.map((v) => (v.packageId === packageId ? { ...v, ...changes } : v)));
  }

  private setBusy(packageId: string, on: boolean): void {
    this.busy.update((ids) => {
      const next = new Set(ids);
      if (on) {
        next.add(packageId);
      } else {
        next.delete(packageId);
      }
      return next;
    });
  }
}
