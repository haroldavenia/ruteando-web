import { firstValueFrom, Observable, of, throwError, toArray } from 'rxjs';

import { GeocodeQuery, GeocodeResult } from '../../../core/api/models';
import { toGeoJsonPoint } from '../../../core/geo/lat-lng';
import {
  applyGeocode,
  importableRows,
  locateRows,
  needsLocating,
  reviewCounts,
  reviewCsv,
  ReviewRow,
  startReview,
} from './package-locating';
import { ImportRow } from './package-rows';

const POINT = toGeoJsonPoint({ lat: 4.6, lng: -74.07 })!;

const importRow = (line: number, address: string, withLocation = false): ImportRow => ({
  line,
  original: [address],
  input: {
    name: address,
    serviceType: 'delivery',
    address,
    city: 'Bogotá',
    location: withLocation ? POINT : null,
    weight: 0,
    volume: 0,
  },
});

const found = (status: 'match' | 'mean' = 'match', score = 0.9): GeocodeResult => ({
  status,
  standardizedAddress: 'DIRECCION ESTANDAR',
  location: { lat: 4.7, lng: -74.1 },
  score,
});

const notFound: GeocodeResult = { status: 'unmatch', standardizedAddress: null, location: null, score: null };

describe('revisión de ubicaciones de la importación', () => {
  it('las filas que ya traen coordenadas empiezan como manuales y las demás como no ubicadas', () => {
    const rows = startReview([importRow(2, 'Con punto', true), importRow(3, 'Sin punto')]);
    expect(rows.map((r) => r.status)).toEqual(['manual', 'unmatch']);
    expect(rows.map(needsLocating)).toEqual([false, true]);
  });

  it('ubicar una dirección le pone el punto, el estado, el puntaje y la dirección estandarizada, sin cambiar la dirección escrita', () => {
    const [row] = startReview([importRow(2, 'Calle 1')]);
    const located = applyGeocode(row, found('mean', 0.5));

    expect(located.input.location).toEqual(toGeoJsonPoint({ lat: 4.7, lng: -74.1 }));
    expect(located.input.address).toBe('Calle 1');
    expect(located).toEqual(
      jasmine.objectContaining({ status: 'mean', score: 0.5, standardizedAddress: 'DIRECCION ESTANDAR', failed: false })
    );
  });

  it('una dirección no encontrada queda sin punto y no ubicada', () => {
    const [row] = startReview([importRow(2, 'Nunca jamás')]);
    const result = applyGeocode(row, notFound);
    expect(result.input.location).toBeNull();
    expect(result.status).toBe('unmatch');
    expect(result.standardizedAddress).toBeNull();
  });

  it('un resultado con estado de ubicada pero sin punto válido no cuenta como ubicado', () => {
    const [row] = startReview([importRow(2, 'Calle 1')]);
    const result = applyGeocode(row, { ...found(), location: { lat: 999, lng: 0 } });
    expect(result.status).toBe('unmatch');
    expect(result.input.location).toBeNull();
  });

  describe('locateRows', () => {
    const run = (rows: ReviewRow[], geocode: (q: GeocodeQuery) => Observable<GeocodeResult>, concurrency?: number) =>
      firstValueFrom(locateRows(rows, geocode, concurrency).pipe(toArray()));

    it('solo ubica las filas sin punto, enviando su dirección, ciudad y país', async () => {
      const queries: GeocodeQuery[] = [];
      const rows = startReview([importRow(2, 'Con punto', true), importRow(3, 'Calle 1')]);
      const done = await run(rows, (q) => {
        queries.push(q);
        return of(found());
      });

      expect(queries).toEqual([{ address: 'Calle 1', city: 'Bogotá', country: undefined }]);
      expect(done.map((r) => r.line)).toEqual([3]);
    });

    it('un fallo del servicio deja esa fila como fallida y las demás se ubican', async () => {
      const rows = startReview([importRow(2, 'Mala'), importRow(3, 'Buena')]);
      const done = await run(rows, (q) => (q.address === 'Mala' ? throwError(() => new Error('500')) : of(found())));
      const byLine = Object.fromEntries(done.map((r) => [r.line, r]));

      expect(byLine[2]).toEqual(jasmine.objectContaining({ failed: true, status: 'unmatch' }));
      expect(byLine[2].input.location).toBeNull();
      expect(byLine[3].status).toBe('match');
    });

    it('no pide más de la concurrencia indicada a la vez', async () => {
      let active = 0;
      let peak = 0;
      const rows = startReview([2, 3, 4, 5, 6].map((n) => importRow(n, `Calle ${n}`)));
      const done = await run(
        rows,
        () =>
          new Observable<GeocodeResult>((subscriber) => {
            active++;
            peak = Math.max(peak, active);
            const timer = setTimeout(() => {
              subscriber.next(found());
              subscriber.complete();
            }, 5);
            return () => {
              active--;
              clearTimeout(timer);
            };
          }),
        2
      );

      expect(done.length).toBe(5);
      expect(peak).toBe(2);
    });
  });

  it('cuenta las filas por estado y las que fallaron por el servicio', () => {
    const [a, b, c, d] = startReview([
      importRow(2, 'a', true),
      importRow(3, 'b'),
      importRow(4, 'c'),
      importRow(5, 'd'),
    ]);
    const rows = [a, applyGeocode(b, found('match')), applyGeocode(c, found('mean')), { ...d, failed: true }];

    expect(reviewCounts(rows)).toEqual({ all: 4, match: 1, mean: 1, manual: 1, unmatch: 1, failed: 1 });
  });

  it('solo se importan las filas con punto, con su ubicación ya puesta', () => {
    const [a, b, c] = startReview([importRow(2, 'a', true), importRow(3, 'b'), importRow(4, 'c')]);
    const rows = [a, applyGeocode(b, found()), applyGeocode(c, notFound)];

    const importable = importableRows(rows);
    expect(importable.map((r) => r.line)).toEqual([2, 3]);
    expect(importable.every((r) => r.input.location.type === 'Point')).toBeTrue();
  });

  it('el CSV de revisión trae las columnas de la plantilla, el estado y las coordenadas; sin punto, vacías', () => {
    const [a, b] = startReview([importRow(2, '=SUMA(1)', true), importRow(3, 'Nunca jamás')]);
    const lines = reviewCsv([a, b]).trim().split('\r\n');

    expect(lines[0]).toContain('LONGITUD;LATITUD');
    expect(lines[0].endsWith('ESTADO')).toBeTrue();
    // La dirección que empieza por «=» se protege contra fórmulas
    expect(lines[1]).toContain("'=SUMA(1)");
    expect(lines[1]).toContain('-74.07;4.6');
    expect(lines[1].endsWith('manual')).toBeTrue();
    expect(lines[2]).toContain(';;');
    expect(lines[2].endsWith('unmatch')).toBeTrue();
  });
});
