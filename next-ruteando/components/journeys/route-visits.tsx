'use client';

import { RiLoopLeftLine, RiRefreshLine } from '@remixicon/react';
import { useMemo } from 'react';

import type { StopRef } from '@/components/map/routes-map';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import type { DomainRoute, DomainWaypoint } from '@/lib/api/models';
import { useColorScheme } from '@/lib/color-scheme';
import { useFormat } from '@/lib/hooks/use-format';
import { useMasterDomain } from '@/lib/hooks/use-master-domain';
import { useRouteVisits } from '@/lib/hooks/use-route-visits';
import { useT } from '@/lib/i18n/client';
import { stopTypeLabel } from '@/lib/journeys/labels';
import { progressText, type RouteVisit, UNAVAILABLE, visitStatus } from '@/lib/journeys/visit-filters';
import { readableOn } from '@/lib/map/map-palette';
import { routeColorFor } from '@/lib/map/route-colors';
import { DEFAULT_PACKAGE_STATUSES, packageStatusLabel } from '@/lib/packages/labels';
import { statusTone } from '@/lib/status-tone';

interface StopRow {
  stop: DomainWaypoint;
  /** `null` en las paradas sin paquete (depósitos). */
  visit: RouteVisit | null;
}

/**
 * Paradas de una ruta con el seguimiento de sus visitas: las paradas con paquete muestran el estado del paquete y permiten cambiarlo. Con
 * un filtro activo solo se listan las visitas que coinciden.
 */
export function RouteVisits({ route, onStopFocus }: { route: DomainRoute; onStopFocus: (stop: StopRef) => void }) {
  const t = useT();
  const format = useFormat();
  const scheme = useColorScheme();
  const store = useRouteVisits(route.waypoints);
  const domain = useMasterDomain('PackageStatus').active;
  const color = routeColorFor(route.routeIndex, scheme);
  const seqText = readableOn(color);

  /** Estados activos del dominio `PackageStatus` del gateway (el gateway rechaza los inactivos): los que se ofrecen como destino de un cambio. */
  const statuses = domain.length > 0 ? domain.map((v) => v.key) : DEFAULT_PACKAGE_STATUSES;
  /** Opciones del filtro por estado: los activos y, además, los inactivos que tengan visitas de esta ruta (para poder encontrarlas). */
  const filterStatuses = useMemo(() => {
    const present = store.visits
      .map((visit) => visit.pkg?.status)
      .filter((status): status is string => !!status && !statuses.includes(status));
    return [...statuses, ...new Set(present)];
  }, [store.visits, statuses]);

  const rows: StopRow[] = store.filtering
    ? store.filtered.map((visit) => ({ stop: visit.stop, visit }))
    : (() => {
        const bySequence = new Map(store.visits.map((visit) => [visit.stop.sequence, visit]));
        return route.waypoints.map((stop) => ({ stop, visit: bySequence.get(stop.sequence) ?? null }));
      })();
  const hasVisits = store.visits.length > 0;
  const percent = store.progress.total === 0 ? 0 : Math.round((store.progress.attended / store.progress.total) * 100);
  const noMatches = store.filtering && rows.length === 0;

  const statusText = (visit: RouteVisit) => {
    const status = visitStatus(visit);
    return status === null
      ? t('Cargando…')
      : status === UNAVAILABLE
        ? t('No disponible')
        : packageStatusLabel(status, t);
  };
  const th = 'px-3 py-2 text-start font-medium';
  const td = 'px-3 py-2 align-top @max-[760px]:block';

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-medium">{progressText(store.progress, t)}</p>
        {hasVisits ? (
          <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-surface-container-highest">
            <span className="block h-full bg-on-success-container" style={{ width: `${percent}%` }} />
          </div>
        ) : null}
      </div>

      <FormResult error={store.error} />

      {hasVisits ? (
        <>
          <div role="search" aria-label={t('Filtrar visitas')} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              {t('Estado')}
              <select
                value={store.filters.status}
                onChange={(event) => store.setStatusFilter(event.target.value)}
                className="h-11 rounded-control border border-outline bg-transparent px-3 text-base text-on-surface"
              >
                <option value="">{t('Todos los estados')}</option>
                {filterStatuses.map((status) => (
                  <option key={status} value={status}>
                    {packageStatusLabel(status, t)}
                  </option>
                ))}
                <option value={UNAVAILABLE}>{t('No disponible')}</option>
              </select>
            </label>
            <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm">
              {t('Buscar por nombre o dirección')}
              <input
                type="search"
                value={store.filters.text}
                onChange={(event) => store.setTextFilter(event.target.value)}
                className="h-11 rounded-control border border-outline bg-transparent px-3 text-base text-on-surface"
              />
            </label>
            <Button variant="outlined" onClick={store.reload}>
              <Icon icon={RiRefreshLine} size={20} />
              {t('Actualizar')}
            </Button>
          </div>
          <p role="status" className="min-h-6 text-sm text-on-surface-variant">
            {store.pending > 0
              ? store.pending === 1
                ? t('Cargando 1 paquete…')
                : t('Cargando {0} paquetes…', [store.pending])
              : store.filtering
                ? t('{0} de {1} visitas coinciden con los filtros', [rows.length, store.visits.length])
                : ''}
          </p>
        </>
      ) : null}

      {noMatches ? (
        <>
          <p>{t('Ninguna visita coincide con los filtros.')}</p>
          <div>
            <Button variant="outlined" onClick={store.clearFilters}>
              {t('Limpiar filtros')}
            </Button>
          </div>
        </>
      ) : rows.length > 0 ? (
        <div className="@container overflow-x-hidden rounded-control border border-outline-variant">
          <table role="table" className="w-full border-collapse text-start">
            <caption className="sr-only">{t('Paradas y visitas de la ruta')}</caption>
            <thead role="rowgroup" className="@max-[760px]:sr-only">
              <tr
                role="row"
                className="border-b border-outline-variant font-mono text-xs tracking-wide text-on-surface-variant uppercase"
              >
                {[t('Orden'), t('Tipo'), t('Paquete'), t('Llegada'), t('Salida'), t('Estado')].map((label) => (
                  <th key={label} scope="col" role="columnheader" className={th}>
                    {label}
                  </th>
                ))}
                <th scope="col" role="columnheader" className={th}>
                  <span className="sr-only">{t('Acciones')}</span>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {rows.map((row) => (
                <tr
                  key={row.stop.sequence}
                  role="row"
                  className="border-b border-outline-variant last:border-b-0 @max-[760px]:block @max-[760px]:p-2"
                >
                  <td role="cell" className={td}>
                    <span
                      className="inline-grid size-7 place-items-center rounded-full text-sm font-bold"
                      style={{ background: color, color: seqText }}
                    >
                      {row.stop.sequence}
                    </span>
                  </td>
                  <td role="cell" className={td}>
                    {stopTypeLabel(row.stop.stopType, t)}
                  </td>
                  <td role="cell" className={td}>
                    {row.visit ? (
                      <>
                        <span className="block font-medium">{row.visit.pkg?.name || row.visit.packageId}</span>
                        {row.visit.pkg?.address ? (
                          <span className="block text-sm text-on-surface-variant">{row.visit.pkg.address}</span>
                        ) : null}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td role="cell" className={td}>
                    {format.dateTime(row.stop.arrivalUtc)}
                  </td>
                  <td role="cell" className={td}>
                    {format.dateTime(row.stop.departureUtc)}
                  </td>
                  <td role="cell" className={td}>
                    {row.visit ? (
                      <StatusBadge tone={statusTone('visit', visitStatus(row.visit))}>
                        {statusText(row.visit)}
                      </StatusBadge>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td role="cell" className={`${td} whitespace-nowrap @min-[760px]:text-end`}>
                    {row.visit ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <IconButton
                            icon={RiLoopLeftLine}
                            disabled={row.visit.state !== 'ready' || store.busy.has(row.visit.packageId)}
                            label={t('Cambiar el estado de la visita ') + store.label(row.visit)}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {statuses
                            .filter((status) => status !== row.visit!.pkg?.status)
                            .map((status) => (
                              <DropdownMenuItem key={status} onSelect={() => void store.change(row.visit!, status)}>
                                {packageStatusLabel(status, t)}
                              </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                    <Button
                      variant="outlined"
                      disabled={!row.stop.position}
                      aria-label={t('Ver la parada {0} de {1} en el mapa', [row.stop.sequence, route.name])}
                      onClick={() => onStopFocus({ routeIndex: route.routeIndex, sequence: row.stop.sequence })}
                    >
                      {t('Ver en el mapa')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {store.dialog}
    </div>
  );
}
