import type { Package } from '@/lib/api/models';
import { toCsv } from '@/lib/csv';
import type { TFunction } from '@/lib/i18n/core';
import { fromGeoJsonPoint } from '@/lib/map/lat-lng';

import { geocodingStatusLabel, packageStatusLabel } from './labels';

export const EXPORT_FILE_NAME = 'paquetes.csv';

/** Columnas del CSV de la aplicación anterior, con el estado del paquete al final (cabeceras sin traducir: son las de la plantilla). */
export const EXPORT_HEADER = [
  'ID_GUIA',
  'LONGITUD',
  'LATITUD',
  'CIUDAD',
  'PAIS',
  'DIRECCION',
  'DIRECCION ESTANDARIZADA',
  'PRECISION',
  'ESTADO DE GEOCODIFICACION',
  'ESTADO',
] as const;

export function packagesToCsv(items: readonly Package[], t: TFunction): string {
  return toCsv(
    EXPORT_HEADER,
    items.map((item) => {
      const point = fromGeoJsonPoint(item.location?.coordinates);
      return [
        item.guideNumber,
        point?.lng,
        point?.lat,
        item.city,
        item.country,
        item.address,
        item.standardizedAddress,
        item.geocodingScore,
        geocodingStatusLabel(item.geocodingStatus, t),
        packageStatusLabel(item.status, t),
      ];
    })
  );
}
