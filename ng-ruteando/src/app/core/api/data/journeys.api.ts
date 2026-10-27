import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL, Page, PageParams, pageParams } from '../api-config';
import { toPlannedJourney } from '../journey-mapper';
import { Journey, JourneyMetrics, JourneyNavigation, JourneyPlanRequest, PlannedJourney } from '../models';

/**
 * Jornadas. La planificación es del servidor: `plan()` recibe la configuración y los ids de los
 * paquetes. Las respuestas con rutas se entregan ya en el modelo de dominio (`geometry`, `LatLng`).
 */
@Injectable({ providedIn: 'root' })
export class JourneysApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/journeys`;

  private url(...parts: (string | number)[]): string {
    return [this.baseUrl, ...parts.map((part) => encodeURIComponent(String(part)))].join('/');
  }

  /** Listado paginado; las jornadas del listado no traen rutas (`routes` es `null`). */
  list(params?: PageParams): Observable<Page<Journey>> {
    return this.http.get<Page<Journey>>(this.baseUrl, { params: pageParams(params) });
  }

  get(id: string): Observable<PlannedJourney> {
    return this.http.get<Journey>(this.url(id)).pipe(map(toPlannedJourney));
  }

  plan(request: JourneyPlanRequest): Observable<PlannedJourney> {
    return this.http.post<Journey>(this.url('plan'), request).pipe(map(toPlannedJourney));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.url(id));
  }

  metrics(id: string): Observable<JourneyMetrics> {
    return this.http.get<JourneyMetrics>(this.url(id, 'metrics'));
  }

  /** Datos de navegación de cada ruta; sus identificadores internos son opacos: usa `routeIndex`. */
  navigations(id: string): Observable<JourneyNavigation[]> {
    return this.http.get<JourneyNavigation[]>(this.url(id, 'navigations'));
  }

  navigation(id: string, routeIndex: number): Observable<JourneyNavigation> {
    return this.http.get<JourneyNavigation>(this.url(id, 'navigations', routeIndex));
  }
}
