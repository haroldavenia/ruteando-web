import { signal } from '@angular/core';
import { EMPTY, Observable, expand, reduce } from 'rxjs';

import { Page, PageParams } from '../../core/api/api-config';
import { ApiError } from '../../core/api/api-error';

import { ListState } from './list-state';

/** Registros por petición al traer todo el listado. */
export const FULL_LIST_PAGE_SIZE = 100;
/** Tope de registros que se traen: pasado este número se avisa y se trabaja con los primeros. */
export const FULL_LIST_LIMIT = 1000;

/**
 * Listado con todos los registros en el cliente. El gateway no filtra por estado ni ordena, así que los recuentos, la búsqueda y
 * el orden solo son ciertos si se tienen todos: se piden las páginas de 100 en 100 hasta traerlos o llegar al tope. `rows` es todo
 * lo traído; `total` es lo que informa el gateway y `truncated` dice si hay más de lo traído. La tabla filtra y pagina ella misma.
 */
export class FullListState<T> extends ListState<T> {
  override readonly clientSide: boolean = true;

  /** Verdadero si el gateway informa más registros de los que se trajeron (tope de `FULL_LIST_LIMIT`). */
  readonly truncated = signal(false);

  override load(): void {
    this.current?.unsubscribe();
    this.status.set('loading');
    this.error.set(null);
    this.current = this.fetchAll().subscribe({
      next: ({ rows, total }) => {
        this.rows.set(rows);
        this.total.set(total);
        this.truncated.set(total > rows.length);
        this.status.set(total === 0 && rows.length === 0 ? 'empty' : 'ready');
      },
      error: (err: unknown) => {
        this.error.set(err instanceof ApiError ? err.message : 'No se pudo completar la solicitud');
        this.status.set('error');
      },
    });
  }

  private fetchAll(): Observable<{ rows: T[]; total: number }> {
    const pageAt = (page: number): Observable<Page<T>> => this.fetch({ page, size: FULL_LIST_PAGE_SIZE } satisfies PageParams);
    return pageAt(0).pipe(
      expand((result, index) => ((index + 1) * FULL_LIST_PAGE_SIZE < Math.min(result.totalElements, FULL_LIST_LIMIT) ? pageAt(index + 1) : EMPTY)),
      reduce(
        (acc, result) => ({ rows: [...acc.rows, ...result.content].slice(0, FULL_LIST_LIMIT), total: acc.total || result.totalElements }),
        { rows: [] as T[], total: 0 },
      ),
    );
  }
}
