'use client';

import { useCallback, useState } from 'react';

import type { DomainRoute, Package, PlannedJourney, Zone } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { useFormat } from '@/lib/hooks/use-format';
import { useT } from '@/lib/i18n/client';
import type { TFunction } from '@/lib/i18n/core';
import { visitsOf } from '@/lib/journeys/visit-filters';
import { downloadPdf, downloadXlsx } from '@/lib/reports/files';
import { type ReportData, reportFileName, routeSummary, visitTable } from '@/lib/reports/route-report';

/** Paquetes que se piden a la vez: el gateway no tiene un endpoint por lotes. */
export const REPORT_CONCURRENCY = 6;

/** Lee los paquetes de las visitas de las rutas y las zonas. Una lectura que falla deja ese dato vacío, no corta el reporte. */
export async function loadReportData(
  tenantId: string,
  routes: readonly DomainRoute[],
  t: TFunction,
  fetchPackage: (id: string) => Promise<Package> = (id) => getData<Package>(`packages/${encodeURIComponent(id)}`, t),
  fetchZones: () => Promise<Zone[]> = () => getData<Zone[]>(`zones?tenantId=${encodeURIComponent(tenantId)}`, t)
): Promise<ReportData> {
  const ids = [...new Set(routes.flatMap((route) => visitsOf(route.waypoints).map((v) => v.packageId)))];
  const packages = new Map<string, Package | null>();
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++]!;
      packages.set(id, await fetchPackage(id).catch(() => null));
    }
  };
  const [, zones] = await Promise.all([
    Promise.all(Array.from({ length: Math.min(REPORT_CONCURRENCY, ids.length) }, worker)),
    fetchZones().catch((): Zone[] => []),
  ]);
  return { packages, zones: new Map(zones.map((z) => [z.id, z.name] as [string, string])) };
}

/**
 * Exportar a Excel o PDF desde una pantalla de jornada o de ruta: lee los paquetes de las visitas, arma las filas y descarga. El
 * resultado queda en `busy`, `success` y `error` para mostrarlo con `FormResult`.
 */
export function useReportExport() {
  const t = useT();
  const format = useFormat();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (journey: PlannedJourney, routes: readonly DomainRoute[], build: (data: ReportData) => Promise<string>) => {
      if (busy) return;
      setBusy(true);
      setSuccess(null);
      setError(null);
      try {
        const data = await loadReportData(journey.tenantId, routes, t);
        try {
          setSuccess(t('Se descargó {0}', [await build(data)]));
        } catch {
          setError(t('No se pudo generar el archivo'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('No se pudo generar el archivo'));
      } finally {
        setBusy(false);
      }
    },
    [busy, t]
  );

  return {
    busy,
    success,
    error,
    /** Un libro con una hoja por ruta de la jornada. */
    journeyXlsx: (journey: PlannedJourney) =>
      run(journey, journey.routes, async (data) => {
        const name = reportFileName(journey.name, 'xlsx');
        await downloadXlsx(
          name,
          journey.routes.map((route) => visitTable(route, data, t, format))
        );
        return name;
      }),
    /** Un libro con la hoja de una ruta. */
    routeXlsx: (journey: PlannedJourney, route: DomainRoute) =>
      run(journey, [route], async (data) => {
        const name = reportFileName(`${journey.name} ${route.name}`, 'xlsx');
        await downloadXlsx(name, [visitTable(route, data, t, format)]);
        return name;
      }),
    /** El PDF de una ruta: resumen y lista de visitas. */
    routePdf: (journey: PlannedJourney, route: DomainRoute) =>
      run(journey, [route], async (data) => {
        const name = reportFileName(`${journey.name} ${route.name}`, 'pdf');
        await downloadPdf(name, {
          title: t('Información de la ruta {0} · {1}', [route.name, journey.name]),
          summary: routeSummary(route, t, format),
          table: visitTable(route, data, t, format),
        });
        return name;
      }),
  };
}
