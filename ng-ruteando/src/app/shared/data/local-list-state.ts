import { EMPTY } from 'rxjs';

import { ListState } from './list-state';

/**
 * Listado cuyas filas ya están en el cliente y no vienen del gateway (por ejemplo, las filas de un archivo que se
 * está revisando). La tabla busca, cuenta por estado y pagina sobre todas, como con un `FullListState`.
 */
export class LocalListState<T> extends ListState<T> {
  override readonly clientSide: boolean = true;

  constructor() {
    super(() => EMPTY);
  }

  /** No hay a quién pedirle nada: las filas se ponen con `set`. */
  override load(): void {
    // Nada que cargar
  }

  /** Sustituye las filas; sin ninguna, el listado queda «vacío». */
  set(rows: readonly T[]): void {
    this.rows.set(rows);
    this.total.set(rows.length);
    this.error.set(null);
    this.status.set(rows.length === 0 ? 'empty' : 'ready');
  }
}
