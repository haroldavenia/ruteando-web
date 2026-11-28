import type { GeocodeQuery, GeocodeResult, GeocodeStatus, PackageInput } from '@/lib/api/models';
import { toCsv } from '@/lib/csv';
import { fromGeoJsonPoint, toGeoJsonPoint } from '@/lib/map/lat-lng';

import type { DraftPackage, ImportRow, LocatedImportRow } from './rows';

/** Direcciones que se ubican a la vez. */
export const LOCATING_CONCURRENCY = 4;

/**
 * Una fila del archivo en la pantalla de revisión: el paquete a crear y cómo quedó su ubicación. Las filas que ya traían coordenadas
 * cuentan como `manual` (las puso quien preparó el archivo); las demás empiezan como `unmatch` hasta que se ubican.
 */
export interface ReviewRow {
  line: number;
  original: string[];
  input: DraftPackage;
  status: GeocodeStatus;
  standardizedAddress: string | null;
  score: number | null;
  /** El servicio de ubicación falló con esta fila (red, 5xx): distinto de «no se encontró la dirección». */
  failed: boolean;
}

export interface ReviewCounts {
  all: number;
  match: number;
  mean: number;
  manual: number;
  unmatch: number;
  /** Filas sin ubicación cuyo intento falló por un error del servicio. */
  failed: number;
}

export function startReview(rows: readonly ImportRow[]): ReviewRow[] {
  return rows.map((row) => ({
    line: row.line,
    original: row.original,
    input: row.input,
    status: row.input.location ? 'manual' : 'unmatch',
    standardizedAddress: null,
    score: null,
    failed: false,
  }));
}

/** Filas a las que aún les falta la ubicación. */
export const needsLocating = (row: ReviewRow): boolean => row.input.location === null;

/** Resultado de ubicar la dirección de una fila (`unmatch` no le pone ubicación). */
export function applyGeocode(row: ReviewRow, result: GeocodeResult): ReviewRow {
  const location = result.status === 'unmatch' || !result.location ? null : toGeoJsonPoint(result.location);
  return {
    ...row,
    input: { ...row.input, location },
    status: location ? result.status : 'unmatch',
    standardizedAddress: location ? result.standardizedAddress : null,
    score: result.score,
    failed: false,
  };
}

/**
 * Ubica las filas que no tienen ubicación, de a `concurrency`, y llama a `onRow` con cada fila en cuanto termina (en el orden en que
 * terminan). Un fallo del servicio deja esa fila como `failed` sin detener las demás; cancelar es cancelar `signal`: no se lanzan más
 * y las que están en vuelo no se entregan.
 */
export async function locateRows(
  rows: readonly ReviewRow[],
  geocode: (query: GeocodeQuery) => Promise<GeocodeResult>,
  onRow: (row: ReviewRow) => void,
  signal?: AbortSignal,
  concurrency = LOCATING_CONCURRENCY
): Promise<void> {
  const pending = rows.filter(needsLocating);
  let next = 0;
  async function worker() {
    while (next < pending.length && !signal?.aborted) {
      const row = pending[next++]!;
      let located: ReviewRow;
      try {
        located = applyGeocode(
          row,
          await geocode({ address: row.input.address, city: row.input.city, country: row.input.country })
        );
      } catch {
        located = { ...row, status: 'unmatch', failed: true };
      }
      if (!signal?.aborted) onRow(located);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), pending.length) }, worker));
}

export function reviewCounts(rows: readonly ReviewRow[]): ReviewCounts {
  const count = (status: GeocodeStatus) => rows.filter((row) => row.status === status).length;
  return {
    all: rows.length,
    match: count('match'),
    mean: count('mean'),
    manual: count('manual'),
    unmatch: count('unmatch'),
    failed: rows.filter((row) => row.failed && needsLocating(row)).length,
  };
}

/** Filas que se pueden crear: las que ya tienen ubicación. Las no ubicadas no se importan. */
export function importableRows(rows: readonly ReviewRow[]): LocatedImportRow[] {
  return rows.flatMap((row) =>
    row.input.location
      ? [
          {
            line: row.line,
            original: row.original,
            input: { ...row.input, location: row.input.location } as PackageInput,
          },
        ]
      : []
  );
}

export const REVIEW_FILE_NAME = 'paquetes-ubicados.csv';

/**
 * Las filas con su ubicación y su estado, como las exportaba la app anterior: las columnas de la plantilla (así el archivo se puede
 * corregir y volver a importar) más la dirección estandarizada, el puntaje y el estado. Las celdas van protegidas contra fórmulas.
 */
export function reviewCsv(rows: readonly ReviewRow[]): string {
  return toCsv(
    [
      'ID_GUIA',
      'NOMBRE',
      'SERVICIO',
      'DIRECCION',
      'CIUDAD',
      'PAIS',
      'CODIGO_POSTAL',
      'LONGITUD',
      'LATITUD',
      'PESO',
      'VOLUMEN',
      'PIEZAS',
      'OBSERVACION',
      'DIRECCION_ESTANDARIZADA',
      'PRECISION',
      'ESTADO',
    ],
    rows.map((row) => {
      const point = fromGeoJsonPoint(row.input.location?.coordinates);
      const { input } = row;
      return [
        input.guideNumber,
        input.name,
        input.serviceType,
        input.address,
        input.city,
        input.country,
        input.postalCode,
        point?.lng ?? null,
        point?.lat ?? null,
        input.weight,
        input.volume,
        input.pieceNumber ?? 1,
        input.observation,
        row.standardizedAddress,
        row.score,
        row.status,
      ];
    })
  );
}
