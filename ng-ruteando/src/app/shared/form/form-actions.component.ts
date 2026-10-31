import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Barra de acciones al final de un formulario. Solo es diseño: proyecta los botones que cada formulario ya tiene («Cancelar» y
 * «Guardar»), de modo que no cambia cómo se validan, envían o cancelan. Avisa de los cambios sin guardar (`dirty`) y, en pantallas
 * estrechas, queda fija al pie para que «Guardar» esté siempre a mano. La región de estado existe siempre, vacía, para que el aviso
 * se anuncie al aparecer.
 */
@Component({
  selector: 'app-form-actions',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `form-actions` da el aspecto común (fila, borde superior y separación) desde el sistema de interfaz
  host: { class: 'form-actions' },
  styles: `
    :host {
      align-items: center;
    }
    .status {
      margin-inline-end: auto;
    }
    .status:empty {
      display: none;
    }
    .dirty {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--app-warning-container);
      color: var(--app-on-warning-container);
      font: var(--mat-sys-label-large);
    }
    @media (max-width: 719.98px) {
      :host {
        position: sticky;
        bottom: 0;
        z-index: 2;
        padding-bottom: 12px;
        background: var(--mat-sys-surface-container-low);
        box-shadow: 0 -10px 12px -10px rgb(0 0 0 / 0.25);
      }
    }
  `,
  template: `
    <span class="status" role="status">
      @if (dirty()) {
        <span class="dirty"><mat-icon aria-hidden="true" fontIcon="edit_note" />Cambios sin guardar</span>
      }
    </span>
    <ng-content />
  `,
})
export class FormActionsComponent {
  /** Hay cambios sin guardar (lo que ya calcula `hasUnsavedChanges()` del formulario). */
  readonly dirty = input(false);
}
