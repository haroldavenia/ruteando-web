/** Página de un listado del gateway (solo lo que usa la interfaz). */
export interface Page<T> {
  content: T[];
  totalElements: number;
}

/** Registros por petición al traer todo el listado. */
export const FULL_LIST_PAGE_SIZE = 100;
/** Tope de registros que se traen: pasado este número se avisa y se trabaja con los primeros. */
export const FULL_LIST_LIMIT = 1000;

/**
 * Trae TODOS los registros de un listado, página a página. El gateway no filtra por estado ni ordena, así que los recuentos, la búsqueda
 * y el orden solo son ciertos si se tienen todos: se piden las páginas de 100 en 100 hasta traerlos o llegar al tope. `total` es lo que
 * informa el gateway (puede ser mayor que `rows.length`).
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, size: number) => Promise<Page<T>>
): Promise<{ rows: T[]; total: number }> {
  const first = await fetchPage(0, FULL_LIST_PAGE_SIZE);
  const rows = [...first.content];
  const total = first.totalElements;
  const wanted = Math.min(total, FULL_LIST_LIMIT);
  for (let page = 1; page * FULL_LIST_PAGE_SIZE < wanted; page++) {
    rows.push(...(await fetchPage(page, FULL_LIST_PAGE_SIZE)).content);
  }
  return { rows: rows.slice(0, FULL_LIST_LIMIT), total };
}
