import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { catchError, from, map, mergeMap, of, toArray } from 'rxjs';

import { AssignedServicesApi } from '../../core/api/data/assigned-services.api';
import { readAssignment } from '../../core/api/data/assigned-services-contract';
import { JourneysApi } from '../../core/api/data/journeys.api';
import { DomainRoute, PlannedJourney } from '../../core/api/models';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { messageFor } from '../../shared/data/api-messages';
import { FormHeadComponent } from '../../shared/form/form-head.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { RoutesMapComponent, StopRef } from '../journeys/routes-map.component';
import { assignedRoutes } from './assigned-routes';

/** Jornadas que se piden a la vez: el gateway no tiene un endpoint de rutas, cada jornada se lee entera. */
const JOURNEY_CONCURRENCY = 4;

/** Las rutas de los servicios asignados juntas en un mapa, cada una con su color y su leyenda. */
@Component({
  selector: 'app-assigned-services-map',
  imports: [
    RouterLink,
    MatButtonModule,
    FormHeadComponent,
    FormResultComponent,
    RoutesMapComponent,
    SkeletonComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-form-head
      [title]="'Mapa de servicios asignados' | t"
      [backLabel]="'Servicios asignados' | t"
      backLink="/assigned-services"
    />
    @if (loading()) {
      <section class="card"><app-skeleton variant="stats" [label]="'Cargando el mapa…' | t" /></section>
    } @else if (error(); as message) {
      <app-form-result [error]="message" />
      <a mat-stroked-button routerLink="/assigned-services">{{ 'Volver al listado' | t }}</a>
    } @else if (routes().length === 0) {
      <section class="card">
        <p>{{ 'Todavía no hay rutas asignadas que dibujar.' | t }}</p>
        <a mat-flat-button class="primary-action" routerLink="/assigned-services/new">{{ 'Asignar ruta' | t }}</a>
      </section>
    } @else {
      <section class="card" aria-labelledby="map-title">
        <h2 id="map-title">{{ 'Rutas asignadas' | t }}</h2>
        @if (missing() > 0) {
          <p role="status">
            {{
              missing() === 1
                ? ('1 servicio no se dibuja porque no se pudo leer su ruta.' | t)
                : ('{0} servicios no se dibujan porque no se pudo leer su ruta.' | t: [missing()])
            }}
          </p>
        }
        <app-routes-map [routes]="routes()" [(selectedRoute)]="selectedRoute" [(selectedStop)]="selectedStop" />
      </section>
    }
  `,
})
export class AssignedServicesMapComponent {
  private readonly api = inject(AssignedServicesApi);
  private readonly journeysApi = inject(JourneysApi);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly routes = signal<DomainRoute[]>([]);
  protected readonly missing = signal(0);
  protected readonly selectedRoute = signal<number | null>(null);
  protected readonly selectedStop = signal<StopRef | null>(null);

  constructor() {
    this.api.list().subscribe({
      next: (services) => {
        const ids = [...new Set(services.map((s) => readAssignment(s).journeyId).filter((id): id is string => !!id))];
        from(ids)
          .pipe(
            mergeMap(
              (id) =>
                this.journeysApi.get(id).pipe(
                  map((journey): [string, PlannedJourney | null] => [id, journey]),
                  catchError(() => of([id, null] as [string, PlannedJourney | null]))
                ),
              JOURNEY_CONCURRENCY
            ),
            toArray()
          )
          .subscribe((entries) => {
            const journeys = new Map(entries.filter((e): e is [string, PlannedJourney] => e[1] !== null));
            const result = assignedRoutes(services, journeys);
            this.routes.set(result.routes);
            this.missing.set(result.missing);
            this.loading.set(false);
          });
      },
      error: (err: unknown) => {
        this.error.set(messageFor(err) || t('No se pudo completar la solicitud'));
        this.loading.set(false);
      },
    });
  }
}
