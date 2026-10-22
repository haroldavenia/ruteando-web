import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CanDeactivateFn } from '@angular/router';
import { Observable, map, of } from 'rxjs';

import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/** Pantalla con un formulario que puede tener cambios sin guardar. */
export interface HasUnsavedChanges {
  /** `true` si el formulario está modificado y todavía no se ha guardado. */
  hasUnsavedChanges(): boolean;
}

/** Pregunta antes de abandonar un formulario sucio; con el formulario limpio o ya guardado deja pasar. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component): Observable<boolean> => {
  if (!component.hasUnsavedChanges()) {
    return of(true);
  }
  return inject(MatDialog)
    .open(ConfirmDialogComponent, {
      data: {
        title: '¿Descartar los cambios?',
        message: 'Tienes cambios sin guardar. Si sales ahora se perderán.',
        confirmLabel: 'Descartar',
        cancelLabel: 'Seguir editando',
      },
    })
    .afterClosed()
    .pipe(map((confirmed) => confirmed === true));
};
