import { Observable, map, of, tap } from 'rxjs';

import { Page, PageParams } from '../../core/api/api-config';

/**
 * Pagina en el navegador un endpoint que devuelve la lista completa (`GET /users/drivers`). La lista
 * se guarda mientras se cambia de página y se vuelve a pedir tras `invalidate()` (por ejemplo al
 * borrar un registro) o si la primera carga falló.
 */
export class ClientPaging<T> {
  private cache: readonly T[] | null = null;

  constructor(private readonly source: () => Observable<T[]>) {}

  invalidate(): void {
    this.cache = null;
  }

  readonly fetch = ({ page = 0, size = 20 }: PageParams): Observable<Page<T>> => {
    const all$ = this.cache ? of(this.cache) : this.source().pipe(tap((all) => (this.cache = all)));
    return all$.pipe(
      map((all) => ({
        content: all.slice(page * size, page * size + size),
        page,
        size,
        totalElements: all.length,
        totalPages: Math.ceil(all.length / size),
      })),
    );
  };
}
