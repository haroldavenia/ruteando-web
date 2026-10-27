import { signal } from '@angular/core';
import { Observable } from 'rxjs';

import { messageFor } from './api-messages';

/**
 * Estado del envío de un formulario: mientras dura la petición el botón queda desactivado (un
 * segundo envío se ignora) y un fallo deja el mensaje en `error` sin tocar los datos escritos.
 */
export class SubmitState {
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Lanza `source`; `byStatus` da el texto de la pantalla para un estado HTTP concreto y `format`, si
   * devuelve un texto, manda sobre los demás (para mensajes que dependen del cuerpo del error).
   */
  submit<T>(
    source: Observable<T>,
    onSuccess: (value: T) => void,
    byStatus: Readonly<Record<number, string>> = {},
    format?: (error: unknown) => string | undefined,
  ): void {
    if (this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    source.subscribe({
      next: (value) => {
        this.submitting.set(false);
        onSuccess(value);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(format?.(err) ?? messageFor(err, byStatus));
      },
    });
  }
}
