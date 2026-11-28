import type { DomainRoute, Package } from '@/lib/api/models';
import type { Format } from '@/lib/format';
import type { TFunction } from '@/lib/i18n/core';
import { stopTypeLabel } from '@/lib/journeys/labels';
import { visitsOf } from '@/lib/journeys/visit-filters';
import { packageStatusLabel } from '@/lib/packages/labels';

import type { ReportCell, ReportTable } from './files';

/** Paquetes leídos por id (`null` si el gateway no devolvió uno) y nombres de zona por id. */
export interface ReportData {
  packages: ReadonlyMap<string, Package | null>;
  zones: ReadonlyMap<string, string>;
}

const MS_PER_MINUTE = 60_000;

/** Minutos entre la llegada y la salida de una parada; `null` si falta alguno o no tienen sentido. */
export function stayMinutes(arrivalUtc: string | null, departureUtc: string | null): number | null {
  if (!arrivalUtc || !departureUtc) return null;
  const minutes = (Date.parse(departureUtc) - Date.parse(arrivalUtc)) / MS_PER_MINUTE;
  return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes * 10) / 10 : null;
}

export const reportHeader = (t: TFunction): string[] => [
  t('Orden'),
  t('Tipo'),
  t('Nº de guía'),
  t('Paquete'),
  t('Dirección'),
  t('Ciudad'),
  t('Zona'),
  t('Llegada'),
  t('Salida'),
  t('Estancia (min)'),
  t('Distancia (m)'),
  t('Estado'),
];

/** Una fila por visita (parada con paquete), con lo que se sabe del paquete; lo que falta queda vacío. */
export function visitRows(route: DomainRoute, data: ReportData, t: TFunction, format: Format): ReportCell[][] {
  return visitsOf(route.waypoints).map(({ stop, packageId }) => {
    const pkg = data.packages.get(packageId) ?? null;
    return [
      stop.sequence,
      stopTypeLabel(stop.stopType, t),
      pkg?.guideNumber ?? null,
      pkg?.name ?? null,
      pkg?.standardizedAddress ?? pkg?.address ?? null,
      pkg?.city ?? null,
      pkg?.zoneId ? (data.zones.get(pkg.zoneId) ?? null) : null,
      stop.arrivalUtc ? format.dateTime(stop.arrivalUtc) : null,
      stop.departureUtc ? format.dateTime(stop.departureUtc) : null,
      stayMinutes(stop.arrivalUtc, stop.departureUtc),
      stop.distance === null ? null : Math.round(stop.distance),
      pkg ? packageStatusLabel(pkg.status, t) : null,
    ];
  });
}

export const visitTable = (route: DomainRoute, data: ReportData, t: TFunction, format: Format): ReportTable => ({
  name: route.name,
  header: reportHeader(t),
  rows: visitRows(route, data, t, format),
});

/** Promedio de la estancia de las visitas que la informan, en minutos con un decimal; `null` si ninguna. */
export function averageStay(route: DomainRoute): number | null {
  const stays = visitsOf(route.waypoints)
    .map(({ stop }) => stayMinutes(stop.arrivalUtc, stop.departureUtc))
    .filter((n): n is number => n !== null);
  return stays.length === 0 ? null : Math.round((stays.reduce((a, b) => a + b, 0) / stays.length) * 10) / 10;
}

/** Datos de la cabecera del PDF de una ruta: etiqueta y valor. */
export function routeSummary(route: DomainRoute, t: TFunction, format: Format): [string, string][] {
  const average = averageStay(route);
  return [
    [t('Distancia recorrida:'), format.distance(route.distanceTraveled)],
    [t('Tiempo estimado:'), format.duration(route.duration)],
    [t('Visitas:'), format.count(visitsOf(route.waypoints).length)],
    [t('Promedio de estancia por visita:'), average === null ? '—' : t('{0} min', [average])],
    [t('Hora de salida:'), format.dateTime(route.startRouteUtc)],
  ];
}

/** Nombre de archivo seguro con la fecha local: `reparto-norte-2026-11-25.xlsx`. */
export function reportFileName(base: string, extension: 'xlsx' | 'pdf', now: Date = new Date()): string {
  const slug =
    base
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'reporte';
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${slug}-${now.getFullYear()}-${month}-${day}.${extension}`;
}
