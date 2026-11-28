'use client';

import { RiFileExcel2Line } from '@remixicon/react';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';

import { RoutesMap, type StopRef } from '@/components/map/routes-map';
import { FormHead } from '@/components/page/form-kit';
import { StatusBadge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { useFormat } from '@/lib/hooks/use-format';
import { useRecord } from '@/lib/hooks/use-record';
import { useReportExport } from '@/lib/hooks/use-report-export';
import { useT } from '@/lib/i18n/client';
import { getJourney } from '@/lib/journeys/journey-api';
import { journeyStatusLabel } from '@/lib/journeys/labels';
import { statusTone } from '@/lib/status-tone';

import { JourneyRoutes } from './journey-routes';

/** Detalle de una jornada: resumen, mapa de sus rutas y una tarjeta por ruta. El mapa, la leyenda y las tablas comparten la ruta y la parada enfocadas. */
export function JourneyDetail({ id }: { id: string }) {
  const t = useT();
  const format = useFormat();
  const fetcher = useCallback((journeyId: string) => getJourney(journeyId, t), [t]);
  const state = useRecord(id, fetcher);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [selectedStop, setSelectedStop] = useState<StopRef | null>(null);
  const mapSection = useRef<HTMLElement>(null);
  const exporter = useReportExport();

  /** Lleva la vista al mapa; el foco se queda en el botón que se pulsó (la ficha se lo devuelve al cerrarse). */
  const showMap = () => mapSection.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });

  if (state.status === 'loading') {
    return (
      <>
        <h1 className="font-brand text-2xl font-bold">{t('Jornada')}</h1>
        <Card>
          <Loading label={t('Cargando la jornada…')} className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 9 }, (_, n) => (
              <Skeleton key={n} className="h-14" />
            ))}
          </Loading>
        </Card>
      </>
    );
  }
  if (state.status === 'error') {
    return (
      <>
        <h1 className="font-brand text-2xl font-bold">{t('Jornada')}</h1>
        <FormResult error={state.error} />
        <Link href="/journeys" className={buttonVariants({ variant: 'outlined' })}>
          {t('Volver al listado')}
        </Link>
      </>
    );
  }
  if (state.status !== 'ready') return null;
  const journey = state.record;
  const routes = journey.routes;

  const stat = (label: string, value: string) => (
    <div key={label}>
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="m-0 font-medium">{value}</dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <FormHead title={journey.name} backLabel={t('Jornadas')} backHref="/journeys" />

      <Card aria-labelledby="summary-title">
        <CardTitle id="summary-title" className="mb-3">
          {t('Resumen')}
        </CardTitle>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(9rem,100%),1fr))] gap-x-6 gap-y-4">
          <div>
            <dt className="text-xs text-on-surface-variant">{t('Estado')}</dt>
            <dd className="m-0">
              <StatusBadge tone={statusTone('journey', journey.status)}>
                {journeyStatusLabel(journey.status, t)}
              </StatusBadge>
            </dd>
          </div>
          {stat(t('Configuración'), journey.settings?.name ?? '—')}
          {stat(t('Servicios'), format.count(journey.totalServices))}
          {stat(t('Vehículos'), format.count(journey.totalResources))}
          {stat(t('Zonas'), format.count(journey.totalZones))}
          {stat(t('Tiempo mínimo'), format.duration(journey.stats?.minTime))}
          {stat(t('Tiempo medio'), format.duration(journey.stats?.avgTime))}
          {stat(t('Tiempo máximo'), format.duration(journey.stats?.maxTime))}
          {stat(t('Creada'), format.dateTime(journey.createdAt))}
        </dl>
        {routes.length > 0 ? (
          <>
            <FormResult error={exporter.error} success={exporter.success} />
            <div className="mt-2 flex justify-end gap-2 border-t border-outline-variant pt-4">
              <Button variant="outlined" loading={exporter.busy} onClick={() => void exporter.journeyXlsx(journey)}>
                <Icon icon={RiFileExcel2Line} size={20} />
                {exporter.busy ? t('Preparando…') : t('Exportar a Excel')}
              </Button>
            </div>
          </>
        ) : null}
      </Card>

      <div
        className={routes.length > 0 ? 'grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : undefined}
      >
        {routes.length > 0 ? (
          <section ref={mapSection} aria-labelledby="map-title" className="xl:sticky xl:top-6">
            <Card>
              <CardTitle id="map-title" className="mb-3">
                {t('Mapa de las rutas')}
              </CardTitle>
              <RoutesMap
                routes={routes}
                selectedRoute={selectedRoute}
                onSelectRoute={setSelectedRoute}
                selectedStop={selectedStop}
                onSelectStop={setSelectedStop}
              />
            </Card>
          </section>
        ) : null}

        <Card aria-labelledby="routes-title">
          <CardTitle id="routes-title" className="mb-3">
            {t('Rutas')}
          </CardTitle>
          {routes.length === 0 ? (
            <p>{t('Esta jornada no tiene rutas.')}</p>
          ) : (
            <JourneyRoutes
              routes={routes}
              journeyId={journey.id}
              selectedRoute={selectedRoute}
              onRouteFocus={(index) => {
                setSelectedStop(null);
                setSelectedRoute(index);
                showMap();
              }}
              onStopFocus={(ref) => {
                setSelectedRoute(ref.routeIndex);
                setSelectedStop(ref);
                showMap();
              }}
            />
          )}
        </Card>
      </div>

      {journey.invalidPackageIds?.length ? (
        <Card aria-labelledby="invalid-title">
          <CardTitle id="invalid-title" className="mb-3">
            {t('Paquetes que no se pudieron planificar')}
          </CardTitle>
          <ul className="list-disc pl-6">
            {journey.invalidPackageIds.map((packageId) => (
              <li key={packageId}>
                <Link href={`/packages/${encodeURIComponent(packageId)}`} className="text-primary underline">
                  {packageId}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
