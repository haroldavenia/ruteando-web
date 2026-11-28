import type { FullList } from './use-full-list';

/** Una lista que ya está en memoria (las filas de una revisión) con la forma que espera `DataTable`. */
export function localList<T>(rows: readonly T[]): FullList<T> {
  return { status: rows.length > 0 ? 'ready' : 'empty', rows, total: rows.length, error: null, reload: () => {} };
}
