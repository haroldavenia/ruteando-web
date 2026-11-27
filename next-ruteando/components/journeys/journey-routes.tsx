'use client';

import { RiArrowDownSLine, RiArrowUpSLine } from '@remixicon/react';
import Link from 'next/link';
import { useState } from 'react';

import type { StopRef } from '@/components/map/routes-map';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { DomainRoute } from '@/lib/api/models';
import { useColorScheme } from '@/lib/color-scheme';
import { useFormat } from '@/lib/hooks/use-format';
import { useT } from '@/lib/i18n/client';
import { stopTypeLabel } from '@/lib/journeys/labels';
import { routeColorFor } from '@/lib/map/route-colors';

/** Relleno de una barra de uso, de 0 a 100; sin dato, vacía. */
const level = (percent: number | null) =>
  percent === null || !Number.isFinite(percent) ? 0 : Math.max(0, Math.min(100, percent));

/**
 * Rutas de una jornada, una tarjeta por ruta con sus cifras (y una barra para el uso de peso y de volumen) y la franja del color que
 * tiene en el mapa; cada una se abre para ver sus paradas en orden.
 */
export function JourneyRoutes({
  routes,
  journeyId,
  selectedRoute,
  onRouteFocus,
  onStopFocus,
}: {
  routes: readonly DomainRoute[];
  /** Jornada a la que pertenecen las rutas, para enlazar a cada una. */
  journeyId: string;
  /** Ruta enfocada en el mapa, para marcar su tarjeta. */
  selectedRoute: number | null;
  onRouteFocus: (routeIndex: number) => void;
  onStopFocus: (stop: StopRef) => void;
}) {
  const t = useT();
  const format = useFormat();
  const scheme = useColorScheme();
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const toggle = (index: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });

  const vehicle = (route: DomainRoute) => {
    const resource = route.resource;
    if (!resource) return '—';
    return resource.plate ? `${resource.name} (${resource.plate})` : resource.name;
  };

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {routes.map((route) => {
        const isOpen = open.has(route.routeIndex);
        const color = routeColorFor(route.routeIndex, scheme);
        const usage = (label: string, percent: number | null) => (
          <div>
            <dt className="text-sm text-on-surface-variant">{label}</dt>
            <dd>
              {format.percent(percent)}
              <span
                aria-hidden="true"
                className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-container-highest"
              >
                <i className="block h-full bg-primary" style={{ width: `${level(percent)}%` }} />
              </span>
            </dd>
          </div>
        );
        return (
          <li
            key={route.routeIndex}
            className={`rounded-card border-2 bg-surface p-4 ${selectedRoute === route.routeIndex ? 'border-primary' : 'border-outline-variant'}`}
            style={{ borderLeftColor: color, borderLeftWidth: 6 }}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3 rounded-full" style={{ background: color }} />
              <h3 className="min-w-0 flex-1 truncate font-medium">{route.name}</h3>
              <button
                type="button"
                title={
                  isOpen ? t('Ocultar las paradas de {0}', [route.name]) : t('Ver las paradas de {0}', [route.name])
                }
                aria-label={
                  isOpen ? t('Ocultar las paradas de {0}', [route.name]) : t('Ver las paradas de {0}', [route.name])
                }
                aria-expanded={isOpen}
                aria-controls={`stops-${route.routeIndex}`}
                onClick={() => toggle(route.routeIndex)}
                className="inline-grid size-11 cursor-pointer place-items-center rounded-full hover:bg-on-surface/8"
              >
                <Icon icon={isOpen ? RiArrowUpSLine : RiArrowDownSLine} />
              </button>
            </div>
            <p className="text-sm text-on-surface-variant">{vehicle(route)}</p>

            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-on-surface-variant">{t('Paradas')}</dt>
                <dd>{format.count(route.waypoints.length)}</dd>
              </div>
              <div>
                <dt className="text-sm text-on-surface-variant">{t('Distancia')}</dt>
                <dd>{format.distance(route.distanceTraveled)}</dd>
              </div>
              <div>
                <dt className="text-sm text-on-surface-variant">{t('Duración')}</dt>
                <dd>{format.duration(route.duration)}</dd>
              </div>
              {usage(t('Peso'), route.weightUsagePercent)}
              {usage(t('Volumen'), route.volumeUsagePercent)}
              <div>
                <dt className="text-sm text-on-surface-variant">{t('Inicio||hora')}</dt>
                <dd>{format.dateTime(route.startRouteUtc)}</dd>
              </div>
              <div>
                <dt className="text-sm text-on-surface-variant">{t('Fin')}</dt>
                <dd>{format.dateTime(route.finishRouteUtc)}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outlined"
                aria-label={t('Ver la ruta ') + route.name + t(' en el mapa')}
                onClick={() => onRouteFocus(route.routeIndex)}
              >
                {t('Ver en el mapa')}
              </Button>
              <Link
                href={`/journeys/${encodeURIComponent(journeyId)}/routes/${route.routeIndex}`}
                aria-label={t('Ver la ruta ') + route.name}
                className={buttonVariants({ variant: 'outlined' })}
              >
                {t('Ver ruta')}
              </Link>
            </div>

            {isOpen ? (
              <div id={`stops-${route.routeIndex}`} className="mt-3">
                {route.waypoints.length === 0 ? (
                  <p>{t('Esta ruta no tiene paradas.')}</p>
                ) : (
                  <div className="@container overflow-x-hidden rounded-control border border-outline-variant">
                    <table role="table" className="w-full border-collapse text-start">
                      <caption className="sr-only">{t('Paradas de {0}', [route.name])}</caption>
                      <thead role="rowgroup" className="@max-[600px]:sr-only">
                        <tr
                          role="row"
                          className="border-b border-outline-variant font-mono text-xs tracking-wide text-on-surface-variant uppercase"
                        >
                          {[t('Orden'), t('Tipo'), t('Latitud / longitud'), t('Llegada'), t('Salida')].map((label) => (
                            <th
                              key={label}
                              scope="col"
                              role="columnheader"
                              className="px-3 py-2 text-start font-medium"
                            >
                              {label}
                            </th>
                          ))}
                          <th scope="col" role="columnheader" className="px-3 py-2">
                            <span className="sr-only">{t('Mapa')}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody role="rowgroup">
                        {route.waypoints.map((stop) => (
                          <tr
                            key={stop.sequence}
                            role="row"
                            className="border-b border-outline-variant last:border-b-0 @max-[600px]:block @max-[600px]:p-2"
                          >
                            <td role="cell" className="px-3 py-2 font-medium @max-[600px]:block">
                              {stop.sequence}
                            </td>
                            <td role="cell" className="px-3 py-2 @max-[600px]:block">
                              {stopTypeLabel(stop.stopType, t)}
                            </td>
                            <td role="cell" className="px-3 py-2 @max-[600px]:block">
                              {format.latLng(stop.position)}
                            </td>
                            <td role="cell" className="px-3 py-2 @max-[600px]:block">
                              {format.dateTime(stop.arrivalUtc)}
                            </td>
                            <td role="cell" className="px-3 py-2 @max-[600px]:block">
                              {format.dateTime(stop.departureUtc)}
                            </td>
                            <td role="cell" className="px-3 py-2 text-end @max-[600px]:block @max-[600px]:text-start">
                              <Button
                                variant="outlined"
                                disabled={!stop.position}
                                aria-label={t('Ver la parada {0} de {1} en el mapa', [stop.sequence, route.name])}
                                onClick={() => onStopFocus({ routeIndex: route.routeIndex, sequence: stop.sequence })}
                              >
                                {t('Ver en el mapa')}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
