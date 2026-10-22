import { Package } from '../../core/api/models';
import { fromGeoJsonPoint } from '../../core/geo/lat-lng';

/** Etiquetas en español de `ServiceType`. */
export const SERVICE_TYPE_LABELS: Readonly<Record<string, string>> = {
  delivery: 'Entrega',
  pickup: 'Recogida',
  mixed: 'Mixto',
};

/** Etiquetas en español de `PackageStatus`. */
export const PACKAGE_STATUS_LABELS: Readonly<Record<string, string>> = {
  pending: 'Pendiente',
  attended: 'Atendido',
  unattended: 'No atendido',
  cancelled: 'Cancelado',
  returned: 'Devuelto',
};

/** Etiquetas en español de `GeocodingStatus` (las del legacy: ubicada, aproximada, manual, no ubicada). */
export const GEOCODING_STATUS_LABELS: Readonly<Record<string, string>> = {
  match: 'Ubicada',
  mean: 'Aproximada',
  manual: 'Manual',
  unmatch: 'No ubicada',
  unprocessed: 'Sin procesar',
};

/** Valores habituales para pintar los selectores antes de cargar los dominios del gateway. */
export const DEFAULT_SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS);
export const DEFAULT_PACKAGE_STATUSES = Object.keys(PACKAGE_STATUS_LABELS);

const label = (labels: Readonly<Record<string, string>>, key: string | null): string => (key === null ? '' : (labels[key] ?? key));

export const serviceTypeLabel = (key: string | null): string => label(SERVICE_TYPE_LABELS, key);
export const packageStatusLabel = (key: string | null): string => label(PACKAGE_STATUS_LABELS, key);
export const geocodingStatusLabel = (key: string | null): string => label(GEOCODING_STATUS_LABELS, key);

const COORDINATE = new Intl.NumberFormat('es', { minimumFractionDigits: 5, maximumFractionDigits: 5, useGrouping: false });

/** `latitud / longitud` con cinco decimales, o vacío si la ubicación no es válida. */
export function formatPackageLocation(item: Pick<Package, 'location'>): string {
  const point = fromGeoJsonPoint(item.location?.coordinates);
  return point ? `${COORDINATE.format(point.lat)} / ${COORDINATE.format(point.lng)}` : '';
}
