import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** La acción borra o no se puede deshacer: el botón de confirmar usa los colores de error. */
  destructive?: boolean;
}

/**
 * Diálogo de confirmación reutilizable. Se cierra con `true` al confirmar y con `false` al cancelar;
 * con Escape o al pulsar fuera se cierra sin valor (tratar como cancelar). El foco inicial va a
 * "Cancelar", la opción segura. Con `destructive` el botón de confirmar es rojo (colores de error del tema).
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .destructive {
      --mat-button-filled-container-color: var(--mat-sys-error);
      --mat-button-filled-label-text-color: var(--mat-sys-on-error);
    }
  `,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false" cdkFocusInitial>{{ data.cancelLabel ?? 'Cancelar' }}</button>
      <button mat-flat-button type="button" [mat-dialog-close]="true" [class.destructive]="data.destructive === true">{{ data.confirmLabel }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
