import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { map, Observable } from 'rxjs';

import { t } from '../../core/i18n/i18n';
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
          title: t('Eliminar {0}', [entity]),
          message: t('¿Eliminar {0} «{1}»? Esta acción no se puede deshacer.', [entity, name]),
          confirmLabel: t('Eliminar'),
          destructive: true,
        },
      })
      .afterClosed()
      .pipe(map((confirmed) => confirmed === true));
  }
}
