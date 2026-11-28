'use client';

import { RiAddLine, RiAlertLine, RiTimeLine } from '@remixicon/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { CityMap } from '@/components/ui/city-map';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import type { Journey, Package } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { fetchLatestJourneys, FIGURES_SAMPLE_SIZE, type PackageFigures, packageFigures } from '@/lib/home/figures';
import { useFormat } from '@/lib/hooks/use-format';
import { useLang, useT } from '@/lib/i18n/client';
import { journeyStatusLabel } from '@/lib/journeys/labels';
import type { Page } from '@/lib/list/fetch-all';
import { statusTone } from '@/lib/status-tone';

type Load<T> = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; value: T };

/** Una lectura con su reintento: `reload` vuelve a pedirla y deja la tarjeta en «cargando». Sin `fetcher` no pide nada. */
function useLoad<T>(fetcher: (() => Promise<T>) | null): [Load<T>, () => void] {
  const [state, setState] = useState<Load<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const t = useT();
  useEffect(() => {
    if (!fetcher) return;
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

const noSubscription = () => () => {};

/**
 * El minuto actual según el reloj del NAVEGADOR (el saludo y la fecha son de quien mira, no de la zona horaria del servidor). El servidor
 * pinta con su propia hora (`serverMinute`) y, ya hidratado, el navegador la corrige sin avisos de hidratación.
 */
function useMinute(serverMinute: number): number {
  return useSyncExternalStore(
    noSubscription,
    () => Math.floor(Date.now() / 60_000),
    () => serverMinute
  );
}

/**
 * Inicio, igual que el de Angular: la cabecera (fecha, saludo, frase con lo que ya se sabe, acciones y la ilustración de la ciudad), el
 * anillo de «Paquetes atendidos», las últimas jornadas y las cifras sueltas. Lo del gateway es solo para quien opera jornadas: las cifras
 * salen de UNA petición de los 100 paquetes más recientes (el gateway no filtra por estado) y, si hay más, la frase lo dice. Todo texto del
 * gateway se pinta como texto.
 */
export function HomeScreen({
  name,
  canOperate,
  noAreas,
  serverMinute,
}: {
  name: string;
  canOperate: boolean;
  noAreas: boolean;
  serverMinute: number;
}) {
  const t = useT();
  const lang = useLang();
  const format = useFormat();
  const now = new Date(useMinute(serverMinute) * 60_000);
  const hour = now.getHours();
  const greeting = `${hour < 12 ? t('Buenos días') : hour < 20 ? t('Buenas tardes') : t('Buenas noches')}, ${name}`;
  // «viernes 30 de octubre» (se muestra en mayúsculas con estilos)
  const today = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' })
    .format(now)
    .replace(',', '');

  const figuresFetcher = useCallback(
    async () => packageFigures(await getData<Page<Package>>(`packages?page=0&size=${FIGURES_SAMPLE_SIZE}`, t)),
    [t]
  );
  const journeysFetcher = useCallback(
    () => fetchLatestJourneys((page, size) => getData<Page<Journey>>(`journeys?page=${page}&size=${size}`, t)),
    [t]
  );
  const [figures, reloadFigures] = useLoad<PackageFigures>(canOperate ? figuresFetcher : null);
  const [journeys, reloadJourneys] = useLoad<Journey[]>(canOperate ? journeysFetcher : null);
  const f = figures.status === 'ready' ? figures.value : null;

  /**
   * Frase bajo el saludo con lo que ya se sabe, sin pedir nada más: las jornadas en curso entre las últimas que se muestran y los paquetes
   * pendientes de las cifras (si son solo los más recientes, lo dice). Sin datos, la frase de siempre.
   */
  const summary = useMemo(() => {
    const parts: string[] = [];
    if (journeys.status === 'ready') {
      const running = journeys.value.filter((journey) => journey.status === 'in_progress').length;
      if (running > 0) {
        parts.push(
          running === 1
            ? t('1 de las últimas jornadas está en curso')
            : t('{0} de las últimas jornadas están en curso', [running])
        );
      }
    }
    if (f && f.pending > 0) {
      const one = f.pending === 1;
      parts.push(
        f.exact
          ? one
            ? t('hay 1 paquete esperando ruta')
            : t('hay {0} paquetes esperando ruta', [f.pending])
          : one
            ? t('hay 1 paquete esperando ruta entre los más recientes')
            : t('hay {0} paquetes esperando ruta entre los más recientes', [f.pending])
      );
    }
    if (parts.length === 0) return t('Planificación de rutas.');
    const text = parts.join(t(' y '));
    return `${text[0]!.toUpperCase()}${text.slice(1)}.`;
  }, [journeys, f, t]);

  /** «2 de 8 paquetes» si son todos; si no, dice que son los más recientes. */
  const figuresSummary = (value: PackageFigures) => {
    const of = t('{0} de {1} paquetes', [value.attended, value.sample]);
    return value.exact ? of : t('{0} (los más recientes de {1})', [of, value.total]);
  };

  /** Servicios y vehículos (si el gateway los informa en el listado) y fecha de creación, en una línea. */
  const details = (journey: Journey) =>
    [
      typeof journey.totalServices === 'number'
        ? journey.totalServices === 1
          ? t('1 servicio')
          : t('{0} servicios', [journey.totalServices])
        : null,
      typeof journey.totalResources === 'number'
        ? journey.totalResources === 1
          ? t('1 vehículo')
          : t('{0} vehículos', [journey.totalResources])
        : null,
      format.dateTime(journey.createdAt),
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <header className="relative box-border min-h-47 overflow-hidden rounded-dialog border border-outline-variant bg-[color-mix(in_srgb,var(--color-primary-container)_32%,var(--color-surface-container-low))] px-5 py-6 md:grid md:min-h-75 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] md:gap-6 md:px-10 md:py-8">
          <div className="flex h-full max-w-136 flex-col items-start justify-center gap-2">
            <p className="m-0 text-xs/4 font-medium tracking-[0.14em] text-on-surface-variant uppercase">{today}</p>
            <h1 className="m-0 font-brand text-[clamp(1.75rem,1.2rem+1.6vw,2.5rem)]/[1.15] font-extrabold tracking-[-0.03em]">
              {greeting}
            </h1>
            <p className="m-0 text-base text-on-surface-variant">{summary}</p>
            {canOperate ? (
              <div className="mt-3 flex flex-wrap gap-3 self-stretch">
                <Link
                  href="/journeys/new"
                  className={buttonVariants({ variant: 'primary', size: 'lg', className: 'max-xs:flex-[1_1_100%]' })}
                >
                  <Icon icon={RiAddLine} size={18} className="-ml-1" />
                  {t('Planificar jornada')}
                </Link>
                <Link
                  href="/packages/import"
                  className={buttonVariants({ variant: 'outlined', size: 'lg', className: 'max-xs:flex-[1_1_100%]' })}
                >
                  {t('Importar paquetes')}
                </Link>
              </div>
            ) : null}
          </div>
          {/* Se extiende hasta los bordes de la cabecera; su borde izquierdo se funde con el tinte */}
          <div className="relative -my-8 -me-10 hidden self-stretch mask-[linear-gradient(90deg,transparent,#000_32%)] md:block">
            <CityMap />
          </div>
        </header>

        {canOperate ? (
          <Card aria-labelledby="figures-title" className="flex flex-col items-center gap-3">
            <CardTitle id="figures-title" className="m-0 self-start font-bold">
              {t('Paquetes atendidos')}
            </CardTitle>
            {figures.status === 'loading' ? (
              <Loading label={t('Cargando las cifras de paquetes…')} className="grid w-full place-items-center gap-3">
                <Skeleton className="size-42 rounded-full" />
                <Skeleton className="h-5 w-40" />
              </Loading>
            ) : figures.status === 'error' ? (
              <div className="flex w-full flex-col items-start gap-3">
                <FormResult error={figures.error} />
                <RetryButton onClick={reloadFigures} />
              </div>
            ) : figures.value.sample === 0 ? (
              <div className="flex w-full flex-col items-start gap-3">
                <p className="m-0">{t('Todavía no hay paquetes.')}</p>
                <Link href="/packages/new" className={buttonVariants({ variant: 'outlined', size: 'lg' })}>
                  {t('Crear el primer paquete')}
                </Link>
              </div>
            ) : (
              <>
                <ProgressRing value={figures.value.percent} className="size-42" />
                <p className="m-0 text-center text-base text-on-surface-variant">{figuresSummary(figures.value)}</p>
                <ul className="m-0 flex list-none flex-wrap justify-center gap-x-5 gap-y-1 p-0 text-sm text-on-surface-variant">
                  <li className="flex items-center gap-2">
                    <span aria-hidden className="size-2.5 rounded-full bg-outline" />
                    {t('{0} pendientes', [figures.value.pending])}
                  </li>
                  <li className="flex items-center gap-2">
                    <span aria-hidden className="size-2.5 rounded-full bg-on-warning-container" />
                    {t('{0} sin atender', [figures.value.unattended])}
                  </li>
                </ul>
              </>
            )}
          </Card>
        ) : null}
      </div>

      {noAreas ? <Card>{t('Tu rol no tiene áreas disponibles en la aplicación web.')}</Card> : null}

      {canOperate ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <Card aria-labelledby="journeys-title">
            <div className="mb-2 flex items-center justify-between gap-3">
              <CardTitle id="journeys-title" className="m-0 font-bold">
                {t('Últimas jornadas')}
              </CardTitle>
              <Link
                href="/journeys"
                aria-label={t('Ver todas las jornadas')}
                className={buttonVariants({ variant: 'outlined', size: 'lg' })}
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
              <div className="flex flex-col items-start gap-3">
                <FormResult error={journeys.error} />
                <RetryButton onClick={reloadJourneys} />
              </div>
            ) : journeys.value.length === 0 ? (
              <div className="flex flex-col items-start gap-3">
                <p className="m-0">{t('Todavía no hay jornadas.')}</p>
                <Link href="/journeys/new" className={buttonVariants({ variant: 'outlined', size: 'lg' })}>
                  {t('Planificar la primera jornada')}
                </Link>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {journeys.value.map((journey) => (
                  <li
                    key={journey.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-outline-variant py-2"
                  >
                    <div className="flex min-w-0 flex-[1_1_14rem] flex-col">
                      <Link
                        href={`/journeys/${encodeURIComponent(journey.id)}`}
                        className="inline-flex min-h-11 items-center self-start font-brand text-base font-bold text-on-surface underline underline-offset-[3px] hover:text-primary"
                      >
                        {journey.name}
                      </Link>
                      <span className="-mt-1.5 text-sm text-on-surface-variant">{details(journey)}</span>
                    </div>
                    <StatusBadge tone={statusTone('journey', journey.status)}>
                      {journeyStatusLabel(journey.status, t)}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {f && f.sample > 0 ? (
            <ul aria-label={t('Paquetes por atender')} className="m-0 grid list-none content-start gap-4 p-0">
              <li className="flex items-center gap-4 rounded-card border border-outline-variant bg-surface-container-low px-6 py-5 text-on-surface shadow-card">
                <span className="grid size-12 flex-none place-items-center rounded-[14px] bg-primary-container text-on-primary-container">
                  <Icon icon={RiTimeLine} size={24} />
                </span>
                <span className="flex flex-col">
                  <span className="font-brand text-[32px]/[1.1] font-extrabold">{f.pending}</span>
                  <span className="text-sm text-on-surface-variant">{t('Pendientes de ruta')}</span>
                </span>
              </li>
              <li className="flex items-center gap-4 rounded-card border border-outline-variant bg-surface-container-low px-6 py-5 text-on-surface shadow-card">
                <span className="grid size-12 flex-none place-items-center rounded-[14px] bg-warning-container text-on-warning-container">
                  <Icon icon={RiAlertLine} size={24} />
                </span>
                <span className="flex flex-col">
                  <span className="font-brand text-[32px]/[1.1] font-extrabold">{f.unattended}</span>
                  <span className="text-sm text-on-surface-variant">{t('Sin atender')}</span>
                </span>
              </li>
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} className={buttonVariants({ variant: 'outlined', size: 'lg' })}>
      {t('Reintentar')}
    </button>
  );
}
