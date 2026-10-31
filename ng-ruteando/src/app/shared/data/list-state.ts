import { DestroyRef, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { Page, PageParams } from '../../core/api/api-config';
import { ApiError } from '../../core/api/api-error';
import { formatCount } from '../format';

export type ListStatus = 'loading' | 'ready' | 'empty' | 'error';

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Estado de un listado paginado desde el servidor. Una carga nueva cancela la anterior; si tras
 * borrar queda vacía una página que no es la primera, retrocede a la anterior.
 */
export class ListState<T> {
  private readonly destroyRef = inject(DestroyRef);
  protected current: Subscription | null = null;

  /** Verdadero si la lista tiene todos los registros en el cliente (`FullListState`): la tabla filtra, cuenta y pagina ella misma. */
  readonly clientSide: boolean = false;

  readonly status = signal<ListStatus>('loading');
  readonly rows = signal<readonly T[]>([]);
  readonly page = signal(0);
  readonly size = signal(DEFAULT_PAGE_SIZE);
  readonly total = signal(0);
  readonly error = signal<string | null>(null);

  constructor(protected readonly fetch: (params: PageParams) => Observable<Page<T>>) {
    this.destroyRef.onDestroy(() => this.current?.unsubscribe());
  }

  load(page = this.page(), size = this.size()): void {
    this.current?.unsubscribe();
    this.status.set('loading');
    this.error.set(null);
    // La página pedida se recuerda ya: si falla, "Reintentar" vuelve a pedir esa misma página
    this.page.set(page);
    this.size.set(size);
    this.current = this.fetch({ page, size }).subscribe({
      next: (result) => {
        if (result.content.length === 0 && page > 0 && result.totalElements > 0) {
          this.load(Math.max(0, Math.ceil(result.totalElements / size) - 1), size);
          return;
        }
        this.rows.set(result.content);
        this.total.set(result.totalElements);
        this.status.set(result.totalElements === 0 && result.content.length === 0 ? 'empty' : 'ready');
      },
      error: (err: unknown) => {
        this.error.set(err instanceof ApiError ? err.message : 'No se pudo completar la solicitud');
        this.status.set('error');
      },
    });
  }

  /** «137 paquetes» o «1 paquete»: el total que informa el gateway; `null` mientras carga, si no hay registros o si falló. */
  countText(singular: string, plural: string): string | null {
    if (this.status() !== 'ready') {
      return null;
    }
    const total = this.total();
    return `${formatCount(total)} ${total === 1 ? singular : plural}`;
  }

  /** Vuelve a pedir la página actual (reintento tras un error o recarga tras borrar). */
  reload(): void {
    this.load();
  }

  goTo(page: number, size = this.size()): void {
    this.load(page, size);
  }
}
