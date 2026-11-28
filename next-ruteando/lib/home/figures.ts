import type { Journey, Package } from '@/lib/api/models';
import type { Page } from '@/lib/list/fetch-all';

/** Cuántos paquetes, los más recientes, se piden para las cifras de Inicio: una sola petición, sin recorrer todas las páginas. */
export const FIGURES_SAMPLE_SIZE = 100;

export interface PackageFigures {
  /** Paquetes sobre los que se calcula (los más recientes que llegaron). */
  readonly sample: number;
  /** Paquetes que hay en total en el gateway. */
  readonly total: number;
  /** `true` si la muestra son todos los paquetes; si no, las cifras son de los más recientes. */
  readonly exact: boolean;
  readonly attended: number;
  readonly pending: number;
  readonly unattended: number;
  /** Porcentaje de atendidos sobre la muestra, de 0 a 100 (0 si no hay paquetes). */
  readonly percent: number;
}

/**
 * Cifras de paquetes a partir de una página del listado. `GET /packages` no filtra ni agrupa por estado, así que se cuentan los de la
 * página recibida (los más recientes primero): son exactas cuando el total cabe en ella y, si no, hablan de los más recientes.
 */
export function packageFigures(page: Pick<Page<Package>, 'content' | 'totalElements'>): PackageFigures {
  const sample = page.content.length;
  const count = (status: string) => page.content.filter((item) => item.status === status).length;
  const attended = count('attended');
  return {
    sample,
    total: Math.max(page.totalElements, sample),
    exact: page.totalElements <= sample,
    attended,
    pending: count('pending'),
    unattended: count('unattended'),
    percent: sample === 0 ? 0 : (attended / sample) * 100,
  };
}

export const LATEST_COUNT = 5;

/** Marca de tiempo de la fecha de creación; `null` si falta o no es una fecha. */
function created(journey: Pick<Journey, 'createdAt'>): number | null {
  const time = journey.createdAt ? Date.parse(journey.createdAt) : NaN;
  return Number.isNaN(time) ? null : time;
}

/** Las `count` jornadas más recientes por `createdAt`, de más nueva a más antigua; orden estable y las sin fecha, al final. */
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

/** `true` si la página viene de más antigua a más nueva (hacen falta dos fechas distintas para saberlo). */
function isAscending(items: readonly Pick<Journey, 'createdAt'>[]): boolean {
  const first = items.length > 1 ? created(items[0]!) : null;
  const last = items.length > 1 ? created(items[items.length - 1]!) : null;
  return first !== null && last !== null && first < last;
}

/**
 * Pide las jornadas más recientes sin depender del orden del gateway (`sort` se ignora). Pide la primera página de `count`; si hay más
 * jornadas y la página viene de más antigua a más nueva, pide las últimas (la última página y, si no basta, la anterior).
 */
export async function fetchLatestJourneys(
  list: (page: number, size: number) => Promise<Page<Journey>>,
  count = LATEST_COUNT
): Promise<Journey[]> {
  const first = await list(0, count);
  const totalPages = Math.ceil(first.totalElements / count);
  const complete = first.totalElements <= first.content.length || totalPages <= 1;
  if (complete || !isAscending(first.content)) return latestJourneys(first.content, count);
  const lastIndex = totalPages - 1;
  const last = await list(lastIndex, count);
  if (last.content.length >= count || lastIndex === 0) return latestJourneys(last.content, count);
  const previous = await list(lastIndex - 1, count);
  return latestJourneys([...previous.content, ...last.content], count);
}
