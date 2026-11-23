import { MatDialog } from '@angular/material/dialog';
import { EMPTY, Observable, of, switchMap } from 'rxjs';

import { PackagesApi } from '../../core/api/data/packages.api';
import { Package } from '../../core/api/models';
import { t } from '../../core/i18n/i18n';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
/**
 * Cambia el estado de un paquete. Cancelarlo pide confirmación antes: si se rechaza, el flujo termina
 * sin emitir ni llamar al gateway. Un fallo del gateway sale tal cual (`ApiError`) para que lo muestre quien llama.
 */
export function changePackageStatus(
  api: PackagesApi,
  dialog: MatDialog,
  target: { id: string; label: string },
  status: string
): Observable<Package> {
  const confirmed$ =
    status === 'cancelled'
      ? dialog
          .open(ConfirmDialogComponent, {
            data: {
              title: t('Cancelar paquete'),
              message: t('¿Cancelar el paquete «{0}»?', [target.label]),
              confirmLabel: t('Cancelar paquete'),
              cancelLabel: t('Volver'),
            },
          })
          .afterClosed()
          .pipe(switchMap((ok) => (ok === true ? of(true) : EMPTY)))
      : of(true);
  return confirmed$.pipe(switchMap(() => api.setStatus(target.id, status)));
}
