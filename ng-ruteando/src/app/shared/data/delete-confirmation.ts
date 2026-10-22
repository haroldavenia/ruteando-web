import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';

import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/**
 * Confirmación de borrado con la acción nombrada con el verbo y el registro. Emite `true` solo al
 * confirmar; cancelar o cerrar con Escape emiten `false`, y el foco vuelve al botón de origen.
 */
@Injectable({ providedIn: 'root' })
export class DeleteConfirmation {
  private readonly dialog = inject(MatDialog);

  /** `entity` en singular y minúscula ("vehículo"); `name` identifica el registro ("ABC123"). */
  ask(entity: string, name: string): Observable<boolean> {
    return this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: `Eliminar ${entity}`,
          message: `¿Eliminar ${entity} «${name}»? Esta acción no se puede deshacer.`,
          confirmLabel: 'Eliminar',
        },
      })
      .afterClosed()
      .pipe(map((confirmed) => confirmed === true));
  }
}
