import type { Page } from '@/lib/list/fetch-all';

/**
 * Adapta un recurso que responde con TODOS los registros en un arreglo (conductores, zonas) al listado entero del cliente: la página 0
 * lo trae todo y las siguientes vienen vacías (`fetchAllPages` no pide más si el total cabe en una página; si no, las vacías no quitan
 * nada de lo ya traído).
 */
export function arrayPage<T>(load: () => Promise<T[]>): (page: number) => Promise<Page<T>> {
  return async (page) => {
    if (page > 0) return { content: [], totalElements: 0 };
    const rows = await load();
    return { content: rows, totalElements: rows.length };
  };
}
