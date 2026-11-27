'use client';

import { RiAlertLine, RiTimeLine } from '@remixicon/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PackageRing } from '@/components/home/package-ring';
import { StatusBadge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import type { Journey, Package } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { fetchLatestJourneys, FIGURES_SAMPLE_SIZE, type PackageFigures, packageFigures } from '@/lib/home/figures';
import { useFormat } from '@/lib/hooks/use-format';
import { useT } from '@/lib/i18n/client';
import { journeyStatusLabel } from '@/lib/journeys/labels';
import type { Page } from '@/lib/list/fetch-all';
import { statusTone } from '@/lib/status-tone';

type Load<T> = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; value: T };

/** Una lectura con su reintento: `reload` vuelve a pedirla y deja la tarjeta en «cargando». */
function useLoad<T>(fetcher: () => Promise<T>): [Load<T>, () => void] {
  const [state, setState] = useState<Load<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const t = useT();
  useEffect(() => {
    let current = true;
    fetcher().then(
      (value) => current && setState({ status: 'ready', value }),
      (err: unknown) =>
        current &&
        setState({
          status: 'error',
          error: err instanceof Error ? err.message : t('No se pudo completar la solicitud'),
        })
    );
    return () => {
      current = false;
    };
  }, [fetcher, version, t]);
  return [
    state,
    () => {
      setState({ status: 'loading' });
      setVersion((v) => v + 1);
    },
  ];
}

/**
 * Lo de Inicio que viene del gateway, solo para quien opera jornadas: el anillo de «Paquetes atendidos» con sus cifras, y las últimas
 * jornadas. Las cifras salen de UNA petición de los 100 paquetes más recientes (el gateway no filtra por estado): si hay más, la frase
 * lo dice. Todo texto del gateway se pinta como texto.
 */
export function HomeDashboard() {
  const t = useT();
  const format = useFormat();
  const figuresFetcher = useCallback(
    async () => packageFigures(await getData<Page<Package>>(`packages?page=0&size=${FIGURES_SAMPLE_SIZE}`, t)),
    [t]
  );
  const journeysFetcher = useCallback(
    () => fetchLatestJourneys((page, size) => getData<Page<Journey>>(`journeys?page=${page}&size=${size}`, t)),
    [t]
  );
  const [figures, reloadFigures] = useLoad<PackageFigures>(figuresFetcher);
  const [journeys, reloadJourneys] = useLoad<Journey[]>(journeysFetcher);

  const summary = useMemo(() => {
    const f = figures.status === 'ready' ? figures.value : null;
    return f && f.sample > 0
      ? f.exact
        ? t('{0} de {1} paquetes', [f.attended, f.sample])
        : t('{0} (los más recientes de {1})', [t('{0} de {1} paquetes', [f.attended, f.sample]), f.total])
      : '';
  }, [figures, t]);

  const details = (journey: Journey) =>
    [
      journey.totalServices === null ? null : t('{0} servicios', [journey.totalServices]),
      journey.totalResources === null ? null : t('{0} vehículos', [journey.totalResources]),
      format.relativeTime(journey.createdAt),
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card aria-labelledby="journeys-title" className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id="journeys-title">{t('Últimas jornadas')}</CardTitle>
          <Link
            href="/journeys"
            aria-label={t('Ver todas las jornadas')}
            className={buttonVariants({ variant: 'outlined' })}
          >
            {t('Ver todas')}
          </Link>
        </div>
        {journeys.status === 'loading' ? (
          <Loading label={t('Cargando las últimas jornadas…')} className="grid gap-2">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="h-14" />
            ))}
          </Loading>
        ) : journeys.status === 'error' ? (
          <>
            <FormResult error={journeys.error} />
            <RetryButton onClick={reloadJourneys} />
          </>
        ) : journeys.value.length === 0 ? (
          <>
            <p>{t('Todavía no hay jornadas.')}</p>
            <Link href="/journeys/new" className={buttonVariants({ variant: 'outlined' })}>
              {t('Planificar la primera jornada')}
            </Link>
          </>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {journeys.value.map((journey) => (
              <li
                key={journey.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-outline-variant px-4 py-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link
                    href={`/journeys/${encodeURIComponent(journey.id)}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {journey.name}
                  </Link>
                  <span className="text-sm text-on-surface-variant">{details(journey)}</span>
                </div>
                <StatusBadge tone={statusTone('journey', journey.status)}>
                  {journeyStatusLabel(journey.status, t)}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card aria-labelledby="figures-title" className="flex flex-col items-center gap-3 lg:col-start-2 lg:row-start-1">
        <CardTitle id="figures-title" className="self-start">
          {t('Paquetes atendidos')}
        </CardTitle>
        {figures.status === 'loading' ? (
          <Loading label={t('Cargando las cifras de paquetes…')} className="grid w-full place-items-center gap-3">
            <Skeleton className="size-40 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </Loading>
        ) : figures.status === 'error' ? (
          <div className="flex w-full flex-col gap-3">
            <FormResult error={figures.error} />
            <RetryButton onClick={reloadFigures} />
          </div>
        ) : figures.value.sample === 0 ? (
          <div className="flex w-full flex-col gap-3">
            <p>{t('Todavía no hay paquetes.')}</p>
            <Link href="/packages/new" className={buttonVariants({ variant: 'outlined' })}>
              {t('Crear el primer paquete')}
            </Link>
          </div>
        ) : (
          <>
            <PackageRing figures={figures.value} label={`${t('Paquetes atendidos')}: ${summary}`} />
            <p className="text-center">{summary}</p>
            <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-1 p-0 text-sm text-on-surface-variant">
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full bg-on-success-container" />
                {t('{0} atendidos', [figures.value.attended])}
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full bg-on-info-container" />
                {t('{0} pendientes', [figures.value.pending])}
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full bg-on-warning-container" />
                {t('{0} sin atender', [figures.value.unattended])}
              </li>
            </ul>
            <ul aria-label={t('Paquetes por atender')} className="m-0 grid w-full list-none grid-cols-2 gap-3 p-0">
              <li className="flex items-center gap-3 rounded-control bg-info-container p-3 text-on-info-container">
                <Icon icon={RiTimeLine} />
                <span className="flex flex-col">
                  <strong className="font-brand text-xl">{figures.value.pending}</strong>
                  <span className="text-sm">{t('Pendientes de ruta')}</span>
                </span>
              </li>
              <li className="flex items-center gap-3 rounded-control bg-warning-container p-3 text-on-warning-container">
                <Icon icon={RiAlertLine} />
                <span className="flex flex-col">
                  <strong className="font-brand text-xl">{figures.value.unattended}</strong>
                  <span className="text-sm">{t('Sin atender')}</span>
                </span>
              </li>
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} className={buttonVariants({ variant: 'outlined' })}>
      {t('Reintentar')}
    </button>
  );
}
