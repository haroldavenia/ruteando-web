import { inject, PLATFORM_ID, signal } from '@angular/core';
import { catchError, forkJoin, from, map, mergeMap, Observable, of, toArray } from 'rxjs';

import { PackagesApi } from '../../core/api/data/packages.api';
import { ZonesApi } from '../../core/api/data/zones.api';
import { DomainRoute, Package, PlannedJourney } from '../../core/api/models';
import { t } from '../../core/i18n/i18n';
import { messageFor } from '../../shared/data/api-messages';
import { downloadPdf, downloadXlsx } from '../../shared/data/report-files';
import { ReportData, reportFileName, routeSummary, visitTable } from './route-report';
import { visitsOf } from './route-visit-filters';

/** Paquetes que se piden a la vez: el gateway no tiene un endpoint por lotes. */
export const REPORT_CONCURRENCY = 6;

/** Lee los paquetes de las visitas de las rutas y las zonas. Una lectura que falla deja ese dato vacío, no corta el reporte. */
export function loadReportData(
  packagesApi: Pick<PackagesApi, 'get'>,
  zonesApi: Pick<ZonesApi, 'list'>,
  routes: readonly DomainRoute[]
): Observable<ReportData> {
  const ids = [...new Set(routes.flatMap((route) => visitsOf(route.waypoints).map((v) => v.packageId)))];
  const packages$ = from(ids).pipe(
    mergeMap(
      (id) =>
        packagesApi.get(id).pipe(
          map((pkg): [string, Package | null] => [id, pkg]),
          catchError(() => of([id, null] as [string, Package | null]))
        ),
      REPORT_CONCURRENCY
    ),
    toArray(),
    map((entries) => new Map(entries))
  );
  const zones$ = zonesApi.list().pipe(
    map((zones) => new Map(zones.map((z) => [z.id, z.name] as [string, string]))),
    catchError(() => of(new Map<string, string>()))
  );
  return forkJoin({ packages: packages$, zones: zones$ });
}

/**
 * Exportar a Excel o PDF desde una pantalla de jornada o de ruta: lee los paquetes de las visitas, arma las filas y descarga.
 * El resultado queda en `busy`, `success` y `error` para mostrarlo con `app-form-result`. Se crea en un contexto de inyección.
 */
export class RouteReportExport {
  private readonly packagesApi = inject(PackagesApi);
  private readonly zonesApi = inject(ZonesApi);
  private readonly platformId = inject(PLATFORM_ID);

  readonly busy = signal(false);
  readonly success = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  /** Un libro con una hoja por ruta de la jornada. */
  xlsx(journey: PlannedJourney): void {
    this.run(journey.routes, async (data) => {
      const name = reportFileName(journey.name, 'xlsx');
      await downloadXlsx(
        name,
        journey.routes.map((route) => visitTable(route, data)),
        this.platformId
      );
      return name;
    });
  }

  /** Un libro con la hoja de una ruta. */
  routeXlsx(journey: PlannedJourney, route: DomainRoute): void {
    this.run([route], async (data) => {
      const name = reportFileName(`${journey.name} ${route.name}`, 'xlsx');
      await downloadXlsx(name, [visitTable(route, data)], this.platformId);
      return name;
    });
  }

  /** El PDF de una ruta: resumen y lista de visitas. */
  routePdf(journey: PlannedJourney, route: DomainRoute): void {
    this.run([route], async (data) => {
      const name = reportFileName(`${journey.name} ${route.name}`, 'pdf');
      await downloadPdf(
        name,
        {
          title: t('Información de la ruta {0} · {1}', [route.name, journey.name]),
          summary: routeSummary(route),
          table: visitTable(route, data),
        },
        this.platformId
      );
      return name;
    });
  }

  private run(routes: readonly DomainRoute[], build: (data: ReportData) => Promise<string>): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.success.set(null);
    this.error.set(null);
    loadReportData(this.packagesApi, this.zonesApi, routes).subscribe({
      next: (data) =>
        build(data)
          .then((name) => this.success.set(t('Se descargó {0}', [name])))
          .catch(() => this.error.set(t('No se pudo generar el archivo')))
          .finally(() => this.busy.set(false)),
      error: (err: unknown) => {
        this.error.set(messageFor(err));
        this.busy.set(false);
      },
    });
  }
}
