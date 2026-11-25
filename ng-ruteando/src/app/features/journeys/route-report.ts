import { DomainRoute, Package } from '../../core/api/models';
import { t } from '../../core/i18n/i18n';
import { ReportCell, ReportTable } from '../../shared/data/report-files';
import { formatCount, formatDateTime, formatDistance, formatDuration } from '../../shared/format';
import { packageStatusLabel } from '../packages/package-labels';
import { stopTypeLabel } from './journey-labels';
import { visitsOf } from './route-visit-filters';

/** Paquetes leídos por id (`null` si el gateway no devolvió uno) y nombres de zona por id. */
export interface ReportData {
  packages: ReadonlyMap<string, Package | null>;
  zones: ReadonlyMap<string, string>;
}

export const EMPTY_REPORT_DATA: ReportData = { packages: new Map(), zones: new Map() };

const MS_PER_MINUTE = 60_000;

/** Minutos entre la llegada y la salida de una parada; `null` si falta alguno o no tienen sentido. */
export function stayMinutes(arrivalUtc: string | null, departureUtc: string | null): number | null {
  if (!arrivalUtc || !departureUtc) {
    return null;
  }
  const minutes = (Date.parse(departureUtc) - Date.parse(arrivalUtc)) / MS_PER_MINUTE;
  return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes * 10) / 10 : null;
}

export const reportHeader = (): string[] => [
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
export function visitRows(route: DomainRoute, data: ReportData): ReportCell[][] {
  return visitsOf(route.waypoints).map(({ stop, packageId }) => {
    const pkg = data.packages.get(packageId) ?? null;
    return [
      stop.sequence,
      stopTypeLabel(stop.stopType),
      pkg?.guideNumber ?? null,
      pkg?.name ?? null,
      pkg?.standardizedAddress ?? pkg?.address ?? null,
      pkg?.city ?? null,
      pkg?.zoneId ? (data.zones.get(pkg.zoneId) ?? null) : null,
      stop.arrivalUtc ? formatDateTime(stop.arrivalUtc) : null,
      stop.departureUtc ? formatDateTime(stop.departureUtc) : null,
      stayMinutes(stop.arrivalUtc, stop.departureUtc),
      stop.distance === null ? null : Math.round(stop.distance),
      pkg ? packageStatusLabel(pkg.status) : null,
    ];
  });
}

export function visitTable(route: DomainRoute, data: ReportData): ReportTable {
  return { name: route.name, header: reportHeader(), rows: visitRows(route, data) };
}

/** Promedio de la estancia de las visitas que la informan, en minutos con un decimal; `null` si ninguna. */
export function averageStay(route: DomainRoute): number | null {
  const stays = visitsOf(route.waypoints)
    .map(({ stop }) => stayMinutes(stop.arrivalUtc, stop.departureUtc))
    .filter((n): n is number => n !== null);
  return stays.length === 0 ? null : Math.round((stays.reduce((a, b) => a + b, 0) / stays.length) * 10) / 10;
}

/** Datos de la cabecera del PDF de una ruta: etiqueta y valor. */
export function routeSummary(route: DomainRoute): [string, string][] {
  const average = averageStay(route);
  return [
    [t('Distancia recorrida:'), formatDistance(route.distanceTraveled)],
    [t('Tiempo estimado:'), formatDuration(route.duration)],
    [t('Visitas:'), formatCount(visitsOf(route.waypoints).length)],
    [t('Promedio de estancia por visita:'), average === null ? '—' : t('{0} min', [average])],
    [t('Hora de salida:'), formatDateTime(route.startRouteUtc)],
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
