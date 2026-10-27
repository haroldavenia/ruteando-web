import { Observable, map, of, switchMap } from 'rxjs';

import { Page, PageParams } from '../../core/api/api-config';
import { Journey } from '../../core/api/models';

export const LATEST_COUNT = 5;

/** Marca de tiempo de la fecha de creación; `null` si falta o no es una fecha. */
function created(journey: Pick<Journey, 'createdAt'>): number | null {
  const time = journey.createdAt ? Date.parse(journey.createdAt) : NaN;
  return Number.isNaN(time) ? null : time;
}

/** Las `count` jornadas más recientes por `createdAt`, de más nueva a más antigua; orden estable y las que no tienen fecha, al final. */
export function latestJourneys<T extends Pick<Journey, 'createdAt'>>(items: readonly T[], count = LATEST_COUNT): T[] {
  return items
    .map((item, index) => ({ item, index, time: created(item) }))
    .sort((a, b) => {
      if (a.time === null || b.time === null) {
        return a.time === b.time ? a.index - b.index : a.time === null ? 1 : -1;
      }
      return b.time - a.time || a.index - b.index;
    })
    .slice(0, count)
    .map(({ item }) => item);
}

/** `true` si la página viene de más antigua a más nueva (se necesitan dos fechas distintas para saberlo). */
function isAscending(items: readonly Pick<Journey, 'createdAt'>[]): boolean {
  const first = items.length > 1 ? created(items[0]) : null;
  const last = items.length > 1 ? created(items[items.length - 1]) : null;
  return first !== null && last !== null && first < last;
}

/**
 * Pide las jornadas más recientes sin depender del orden del gateway (`sort` se ignora). Pide la primera
 * página de `count`; si hay más jornadas y la página viene de más antigua a más nueva, pide las últimas
 * (la última página y, si no basta, la anterior) y se queda con las `count` más nuevas.
 */
export function fetchLatestJourneys(
  list: (params: PageParams) => Observable<Page<Journey>>,
  count = LATEST_COUNT,
): Observable<Journey[]> {
  return list({ page: 0, size: count }).pipe(
    switchMap((first) => {
      const complete = first.totalElements <= first.content.length || first.totalPages <= 1;
      if (complete || !isAscending(first.content)) {
        return of(latestJourneys(first.content, count));
      }
      const lastIndex = first.totalPages - 1;
      return list({ page: lastIndex, size: count }).pipe(
        switchMap((last) =>
          last.content.length >= count || lastIndex === 0
            ? of(latestJourneys(last.content, count))
            : list({ page: lastIndex - 1, size: count }).pipe(map((previous) => latestJourneys([...previous.content, ...last.content], count))),
        ),
      );
    }),
  );
}
