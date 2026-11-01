import { MatDialog } from '@angular/material/dialog';
import { EMPTY, Observable, catchError, from, map, mergeMap, of, switchMap, toArray } from 'rxjs';

import { ApiError } from '../../core/api/api-error';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

import { messageFor } from './api-messages';

/** Peticiones a la vez: el gateway no tiene lote para estos recursos, así que cada registro es una petición. */
export const BULK_CONCURRENCY = 4;

export interface BulkTarget {
  id: string;
  /** Cómo se nombra el registro en los avisos («ABC-123»). */
  label: string;
}

export interface BulkFailure {
  label: string;
  /** El motivo, en español. */
  message: string;
}

export interface BulkResult {
  done: number;
  failed: BulkFailure[];
}

export interface BulkOptions {
  /** Texto por estado HTTP (por ejemplo 409: el registro está en uso). */
  byStatus?: Readonly<Record<number, string>>;
  /** Estados que cuentan como hecho (por ejemplo 404 al borrar: ya no existe). */
  doneOnStatus?: readonly number[];
}

/**
 * Hace una operación por cada registro, de a `BULK_CONCURRENCY`. Un fallo no detiene a los demás: se cuenta en `failed` con su motivo.
 */
export function runBulk(targets: readonly BulkTarget[], operation: (id: string) => Observable<unknown>, options: BulkOptions = {}): Observable<BulkResult> {
  return from(targets).pipe(
    mergeMap(
      (target) =>
        operation(target.id).pipe(
          map((): BulkFailure | null => null),
          catchError((err: unknown) => {
            const done = err instanceof ApiError && (options.doneOnStatus ?? []).includes(err.status);
            return of<BulkFailure | null>(done ? null : { label: target.label, message: messageFor(err, options.byStatus) });
          }),
        ),
      BULK_CONCURRENCY,
    ),
    toArray(),
    map((results) => ({ done: results.filter((r) => r === null).length, failed: results.filter((r): r is BulkFailure => r !== null) })),
  );
}

export interface BulkDeleteOptions extends BulkOptions {
  /** «vehículo» / «vehículos». */
  singular: string;
  plural: string;
  targets: readonly BulkTarget[];
  remove: (id: string) => Observable<unknown>;
}

/** Pide una sola confirmación y borra los registros uno a uno. Si se cancela, termina sin llamar al gateway. */
export function deleteMany(dialog: Pick<MatDialog, 'open'>, options: BulkDeleteOptions): Observable<BulkResult> {
  const { targets, singular, plural } = options;
  const one = targets.length === 1;
  return dialog
    .open(ConfirmDialogComponent, {
      data: {
        title: one ? `Eliminar ${singular}` : `Eliminar ${plural}`,
        message: one ? `¿Eliminar ${singular} «${targets[0].label}»? Esta acción no se puede deshacer.` : `¿Eliminar los ${targets.length} ${plural} elegidos? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        destructive: true,
      },
    })
    .afterClosed()
    .pipe(
      switchMap((confirmed) =>
        confirmed === true ? runBulk(targets, options.remove, { byStatus: options.byStatus, doneOnStatus: options.doneOnStatus ?? [404] }) : EMPTY,
      ),
    );
}

/** Los avisos de lo ocurrido: «Se eliminaron 3 de 4 vehículos» y, aparte, cuáles no y por qué. */
export function bulkDeleteMessages(result: BulkResult, singular: string, plural: string): { success: string | null; error: string | null } {
  const total = result.done + result.failed.length;
  const success =
    result.done === 0
      ? null
      : result.failed.length === 0
        ? result.done === 1
          ? `Se eliminó 1 ${singular}`
          : `Se eliminaron ${result.done} ${plural}`
        : `Se eliminaron ${result.done} de ${total} ${plural}`;
  const error =
    result.failed.length === 0
      ? null
      : `No se pudo eliminar ${result.failed.length === 1 ? `1 ${singular}` : `${result.failed.length} ${plural}`}: ${result.failed.map((f) => `«${f.label}» (${f.message})`).join('; ')}`;
  return { success, error };
}
