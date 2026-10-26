import { MatDialog } from '@angular/material/dialog';
import { EMPTY, Observable, of, switchMap } from 'rxjs';

import { PackagesApi } from '../../core/api/data/packages.api';
import { Package } from '../../core/api/models';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

/**
 * Cambia el estado de un paquete. Cancelarlo pide confirmación antes: si se rechaza, el flujo termina
 * sin emitir ni llamar al gateway. Un fallo del gateway sale tal cual (`ApiError`) para que lo muestre quien llama.
 */
export function changePackageStatus(
  api: PackagesApi,
  dialog: MatDialog,
  target: { id: string; label: string },
  status: string,
): Observable<Package> {
  const confirmed$ =
    status === 'cancelled'
      ? dialog
          .open(ConfirmDialogComponent, {
            data: {
              title: 'Cancelar paquete',
              message: `¿Cancelar el paquete «${target.label}»?`,
              confirmLabel: 'Cancelar paquete',
              cancelLabel: 'Volver',
            },
          })
          .afterClosed()
          .pipe(switchMap((ok) => (ok === true ? of(true) : EMPTY)))
      : of(true);
  return confirmed$.pipe(switchMap(() => api.setStatus(target.id, status)));
}
