import { MatDialog } from '@angular/material/dialog';
import { catchError, EMPTY, from, map, mergeMap, Observable, of, switchMap, toArray } from 'rxjs';

import { PackagesApi } from '../../core/api/data/packages.api';
import { t } from '../../core/i18n/i18n';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { messageFor } from '../../shared/data/api-messages';
/** Peticiones de cambio de estado a la vez: el gateway no tiene lote, así que cada paquete es una petición. */
export const BULK_STATUS_CONCURRENCY = 4;

export interface BulkStatusResult {
  changed: number;
  /** Los que el gateway rechazó, con su nombre y el motivo en español. */
  failed: { label: string; message: string }[];
}

/**
 * Cambia el estado de varios paquetes, una petición por paquete (de a `BULK_STATUS_CONCURRENCY`). Un fallo no detiene a los demás: se
 * cuenta en `failed`. Cancelar pide una sola confirmación para todos; si se rechaza, el flujo termina sin llamar al gateway.
 */
export function changeStatusOfMany(
  api: Pick<PackagesApi, 'setStatus'>,
  dialog: Pick<MatDialog, 'open'>,
  targets: readonly { id: string; label: string }[],
  status: string
): Observable<BulkStatusResult> {
  const confirmed$ =
    status === 'cancelled'
      ? dialog
          .open(ConfirmDialogComponent, {
            data: {
              title: t('Cancelar paquetes'),
              message:
                targets.length === 1
                  ? t('¿Cancelar el paquete «{0}»?', [targets[0].label])
                  : t('¿Cancelar los {0} paquetes elegidos?', [targets.length]),
              confirmLabel: targets.length === 1 ? t('Cancelar paquete') : t('Cancelar paquetes'),
              cancelLabel: t('Volver'),
            },
          })
          .afterClosed()
          .pipe(switchMap((ok) => (ok === true ? of(true) : EMPTY)))
      : of(true);

  return confirmed$.pipe(
    switchMap(() =>
      from(targets).pipe(
        mergeMap(
          (target) =>
            api.setStatus(target.id, status).pipe(
              map(() => null),
              catchError((err: unknown) => of({ label: target.label, message: messageFor(err) }))
            ),
          BULK_STATUS_CONCURRENCY
        ),
        toArray(),
        map((results) => {
          const failed = results.filter((r): r is { label: string; message: string } => r !== null);
          return { changed: results.length - failed.length, failed };
        })
      )
    )
  );
}
