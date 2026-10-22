import { EMPTY, Observable, expand, map, reduce } from 'rxjs';

import { Page } from '../../core/api/api-config';
import { Package } from '../../core/api/models';
import { fromGeoJsonPoint } from '../../core/geo/lat-lng';
import { toCsv } from '../../shared/data/csv';

import { geocodingStatusLabel, packageStatusLabel } from './package-labels';

export const EXPORT_PAGE_SIZE = 200;
export const EXPORT_FILE_NAME = 'paquetes.csv';

/** Columnas del CSV del legacy (`imprimirCsv` de `itinerary_controller`), con el estado del paquete al final. */
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

export function packagesToCsv(items: readonly Package[]): string {
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
        geocodingStatusLabel(item.geocodingStatus),
        packageStatusLabel(item.status),
      ];
    }),
  );
}

export interface ExportProgress {
  loaded: number;
  total: number;
}

/**
 * Pide todas las páginas (de 200 en 200) y emite el progreso; al terminar emite la lista completa en orden.
 * Cualquier fallo corta la exportación y llega como error.
 */
export function fetchAllPackages(
  fetchPage: (page: number, size: number) => Observable<Page<Package>>,
  onProgress: (progress: ExportProgress) => void,
): Observable<Package[]> {
  return fetchPage(0, EXPORT_PAGE_SIZE).pipe(
    expand((page) => (page.page + 1 < page.totalPages ? fetchPage(page.page + 1, EXPORT_PAGE_SIZE) : EMPTY)),
    reduce<Page<Package>, { items: Package[] }>(
      (acc, page) => {
        acc.items.push(...page.content);
        onProgress({ loaded: acc.items.length, total: page.totalElements });
        return acc;
      },
      { items: [] },
    ),
    map((acc) => acc.items),
  );
}

