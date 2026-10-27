import { DestroyRef, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiError } from '../../core/api/api-error';

export type RecordStatus = 'new' | 'loading' | 'ready' | 'missing' | 'error';

export const RECORD_GONE = 'El registro ya no existe';

/**
 * Carga el registro de una pantalla de edición. Sin `id` es un alta (`new`); un 404 es `missing`
 * ("El registro ya no existe") y cualquier otro fallo es `error` con el mensaje de la API.
 */
export class RecordLoader<T> {
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<RecordStatus>('new');
  readonly record = signal<T | null>(null);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly id: string | null,
    private readonly fetch: (id: string) => Observable<T>,
  ) {}

  /** `onLoaded` recibe el registro para rellenar el formulario. */
  load(onLoaded: (record: T) => void): void {
    if (this.id === null) {
      this.status.set('new');
      return;
    }
    this.status.set('loading');
    const subscription = this.fetch(this.id).subscribe({
      next: (record) => {
        this.record.set(record);
        this.status.set('ready');
        onLoaded(record);
      },
      error: (err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          this.error.set(RECORD_GONE);
          this.status.set('missing');
          return;
        }
        this.error.set(err instanceof ApiError ? err.message : 'No se pudo completar la solicitud');
        this.status.set('error');
      },
    });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}
