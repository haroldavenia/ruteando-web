import type { Package } from '@/lib/api/models';
import type { TFunction } from '@/lib/i18n/core';
import { fromGeoJsonPoint } from '@/lib/map/lat-lng';

/** Los tipos de servicio que conoce la aplicación (`ServiceType`), en su orden. */
export const SERVICE_TYPE_KEYS = ['delivery', 'pickup', 'mixed'] as const;

/**
 * Los estados de `PackageStatus`, también los que el gateway ya no ofrece (`returned`): un paquete puede conservar uno y debe verse con
 * su nombre.
 */
export const PACKAGE_STATUS_KEYS = ['pending', 'attended', 'unattended', 'cancelled', 'returned'] as const;

/** Estados activos del gateway real; son los que se ofrecen mientras no cargue el catálogo. */
export const DEFAULT_PACKAGE_STATUSES = ['pending', 'attended', 'unattended', 'cancelled'];

/** Resultados de ubicar una dirección (`GeocodingStatus`). */
export const GEOCODING_STATUS_KEYS = ['match', 'mean', 'manual', 'unmatch', 'unprocessed'] as const;

const pick = (labels: Record<string, string>, key: string | null) => (key === null ? '' : (labels[key] ?? key));

export const serviceTypeLabel = (key: string | null, t: TFunction) =>
  pick({ delivery: t('Entrega'), pickup: t('Recogida'), mixed: t('Mixto') }, key);

export const packageStatusLabel = (key: string | null, t: TFunction) =>
  pick(
    {
      pending: t('Pendiente'),
      attended: t('Atendido'),
      unattended: t('No atendido'),
      cancelled: t('Cancelado'),
      returned: t('Devuelto'),
    },
    key
  );

export const geocodingStatusLabel = (key: string | null, t: TFunction) =>
  pick(
    {
      match: t('Ubicada'),
      mean: t('Aproximada'),
      manual: t('Manual'),
      unmatch: t('No ubicada'),
      unprocessed: t('Sin procesar'),
    },
    key
  );

/** `latitud / longitud` con cinco decimales, o vacío si la ubicación no es válida. */
export function formatPackageLocation(item: Pick<Package, 'location'>, lang: string): string {
  const point = fromGeoJsonPoint(item.location?.coordinates);
  if (!point) return '';
  const number = new Intl.NumberFormat(lang, {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
    useGrouping: false,
  });
  return `${number.format(point.lat)} / ${number.format(point.lng)}`;
}

/** Cómo se nombra el paquete en etiquetas y avisos: su guía o, si no tiene, su nombre. */
export const packageLabel = (row: Pick<Package, 'guideNumber' | 'name'>) => row.guideNumber?.trim() || row.name;

/** Estados de `PackageStatus` en el orden de la aplicación y al final cualquiera desconocido que traigan los paquetes. */
export function packageStatusOrder(rows: readonly Pick<Package, 'status'>[]): string[] {
  const known: string[] = [...PACKAGE_STATUS_KEYS];
  return [...known, ...[...new Set(rows.map((p) => p.status))].filter((key) => !known.includes(key))];
}
