'use client';

import { RiFileExcel2Line, RiFilePdf2Line } from '@remixicon/react';
import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';

import { RoutesMap, type StopRef } from '@/components/map/routes-map';
import { FormHead } from '@/components/page/form-kit';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import type { DomainRoute } from '@/lib/api/models';
import { useFormat } from '@/lib/hooks/use-format';
import { useRecord } from '@/lib/hooks/use-record';
import { useReportExport } from '@/lib/hooks/use-report-export';
import { useT } from '@/lib/i18n/client';
import { getJourney } from '@/lib/journeys/journey-api';

import { RouteAssignment } from './route-assignment';
import { RouteVisits } from './route-visits';

/**
 * Detalle de una ruta de una jornada: resumen, mapa de esa sola ruta y sus paradas con el seguimiento de las visitas. Carga la jornada
 * completa (el gateway no tiene un endpoint de una ruta) y elige la ruta por `routeIndex`.
 */
export function RouteDetail({ journeyId, routeIndex }: { journeyId: string; routeIndex: string }) {
  const t = useT();
  const format = useFormat();
  const fetcher = useCallback((id: string) => getJourney(id, t), [t]);
  const state = useRecord(journeyId, fetcher);
  const [selectedStop, setSelectedStop] = useState<StopRef | null>(null);
  const mapSection = useRef<HTMLElement>(null);
  const exporter = useReportExport();
  /** `null` si el parámetro no es un entero no negativo. */
  const index = /^\d+$/.test(routeIndex) ? Number(routeIndex) : null;
  const journey = state.status === 'ready' ? state.record : null;
  const route = useMemo<DomainRoute | null>(
    () => (journey && index !== null ? (journey.routes.find((r) => r.routeIndex === index) ?? null) : null),
    [journey, index]
  );
  /** La ruta como lista de una sola, estable mientras no cambie la jornada: el mapa no se redibuja. */
  const routes = useMemo(() => (route ? [route] : []), [route]);
  const back = `/journeys/${encodeURIComponent(journeyId)}`;

  if (state.status === 'loading') {
    return (
      <>
        <h1 className="font-brand text-2xl font-bold">{t('Ruta')}</h1>
        <Card>
          <Loading label={t('Cargando la ruta…')} className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 8 }, (_, n) => (
              <Skeleton key={n} className="h-14" />
            ))}
          </Loading>
        </Card>
      </>
    );
  }
  if (state.status === 'error' || !journey || !route) {
    return (
      <>
        <h1 className="font-brand text-2xl font-bold">{t('Ruta')}</h1>
        <FormResult error={state.status === 'error' ? state.error : t('El registro ya no existe')} />
        <Link href={state.status === 'error' ? '/journeys' : back} className={buttonVariants({ variant: 'outlined' })}>
          {state.status === 'error' ? t('Volver al listado') : t('Volver a la jornada')}
        </Link>
      </>
    );
  }

  const resource = route.resource;
  const vehicle = !resource ? '—' : resource.plate ? `${resource.name} (${resource.plate})` : resource.name;
  const stat = (label: string, value: string) => (
    <div key={label}>
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="m-0 font-medium">{value}</dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <FormHead title={route.name} backLabel={t('Jornada ') + journey.name} backHref={back} />

      <Card aria-labelledby="summary-title">
        <CardTitle id="summary-title" className="mb-3">
          {t('Resumen')}
        </CardTitle>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(9rem,100%),1fr))] gap-x-6 gap-y-4">
          {stat(t('Vehículo'), vehicle)}
          {stat(t('Paradas'), format.count(route.waypoints.length))}
          {stat(t('Distancia'), format.distance(route.distanceTraveled))}
          {stat(t('Duración'), format.duration(route.duration))}
          {stat(t('Uso de peso'), format.percent(route.weightUsagePercent))}
          {stat(t('Uso de volumen'), format.percent(route.volumeUsagePercent))}
          {stat(t('Inicio||hora'), format.dateTime(route.startRouteUtc))}
          {stat(t('Fin'), format.dateTime(route.finishRouteUtc))}
        </dl>
        <FormResult error={exporter.error} success={exporter.success} />
        <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-outline-variant pt-4">
          <Button
            variant="outlined"
            loading={exporter.busy}
            disabled={route.waypoints.length === 0}
            onClick={() => void exporter.routeXlsx(journey, route)}
          >
            <Icon icon={RiFileExcel2Line} size={20} />
            {t('Exportar a Excel')}
          </Button>
          <Button
            variant="outlined"
            loading={exporter.busy}
            disabled={route.waypoints.length === 0}
            onClick={() => void exporter.routePdf(journey, route)}
          >
            <Icon icon={RiFilePdf2Line} size={20} />
            {t('Exportar a PDF')}
          </Button>
        </div>
      </Card>

      <Card>
        <RouteAssignment journeyId={journeyId} routeIndex={route.routeIndex} />
      </Card>

      <section ref={mapSection} aria-labelledby="map-title">
        <Card>
          <CardTitle id="map-title" className="mb-3">
            {t('Mapa de la ruta')}
          </CardTitle>
          <RoutesMap
            routes={routes}
            selectedRoute={null}
            onSelectRoute={() => {}}
            selectedStop={selectedStop}
            onSelectStop={setSelectedStop}
          />
        </Card>
      </section>

      <Card aria-labelledby="stops-title">
        <CardTitle id="stops-title" className="mb-3">
          {t('Paradas')}
        </CardTitle>
        {route.waypoints.length === 0 ? (
          <p>{t('Esta ruta no tiene paradas.')}</p>
        ) : (
          <RouteVisits
            route={route}
            onStopFocus={(ref) => {
              setSelectedStop(ref);
              mapSection.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
            }}
          />
        )}
      </Card>
    </div>
  );
}
