import { inject, signal } from '@angular/core';
import { Observable, filter, switchMap } from 'rxjs';

import { ApiError } from '../../core/api/api-error';

import { messageFor } from './api-messages';
import { DeleteConfirmation } from './delete-confirmation';

export interface DeleteOptions {
  /** Tipo de registro en singular y minúscula ("vehículo"). */
  entity: string;
  /** Identifica el registro en el diálogo y en el aviso ("ABC123"). */
  name: string;
  /** Petición de borrado; solo se lanza tras confirmar. */
  request: () => Observable<unknown>;
  /** Texto de la pantalla por estado HTTP (por ejemplo 409 y 400: el registro está en uso). */
  byStatus?: Readonly<Record<number, string>>;
  /** Recarga del listado tras borrar, o tras un 404 (el registro ya no existe). */
  reload: () => void;
}

/** Texto cuando el registro ya no existe (404 al borrar). */
export const ALREADY_GONE = 'El registro ya no existe';

/**
 * Flujo de borrado de un listado: confirmar, borrar, avisar y recargar. El resultado queda en
 * `success` y `error` para mostrarlo con `app-form-result`; un 404 se trata como borrado hecho.
 */
export class DeleteFlow {
  private readonly confirmation = inject(DeleteConfirmation);

  readonly success = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  run(options: DeleteOptions): void {
    this.success.set(null);
    this.error.set(null);
    this.confirmation
      .ask(options.entity, options.name)
      .pipe(
        filter((confirmed) => confirmed),
        switchMap(() => options.request()),
      )
      .subscribe({
        next: () => {
          this.success.set(`Se eliminó ${options.entity} «${options.name}»`);
          options.reload();
        },
        error: (err: unknown) => {
          if (err instanceof ApiError && err.status === 404) {
            this.success.set(`${ALREADY_GONE}: ${options.entity} «${options.name}»`);
            options.reload();
            return;
          }
          this.error.set(messageFor(err, options.byStatus));
        },
      });
  }
}
