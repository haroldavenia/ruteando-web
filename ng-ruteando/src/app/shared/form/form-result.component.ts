import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Resultado de un envío. Los dos contenedores existen siempre en el DOM (una región `aria-live`
 * creada junto con su contenido no siempre se anuncia): `role="alert"` para errores y
 * `role="status"` para confirmaciones, sin mover el foco.
 */
@Component({
  selector: 'app-form-result',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="result error" role="alert">
      @if (error()) {
        <mat-icon aria-hidden="true">error</mat-icon><span>{{ error() }}</span>
      }
    </div>
    <div class="result success" role="status" aria-live="polite">
      @if (success()) {
        <mat-icon aria-hidden="true">check_circle</mat-icon><span>{{ success() }}</span>
      }
    </div>
  `,
  styles: `
    /* Sin caja propia: vacío no deja un hueco extra entre bloques de la pantalla (el marco .page separa cada hijo 24px) */
    :host {
      display: contents;
    }
    .result {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 12px 16px;
      border-radius: 12px;
      font: var(--mat-sys-body-medium);
    }
    .result:empty {
      display: none;
    }
    .result mat-icon {
      flex: none;
    }
    .error {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .success {
      background: var(--app-success-container);
      color: var(--app-on-success-container);
    }
  `,
})
export class FormResultComponent {
  readonly error = input<string | null>(null);
  readonly success = input<string | null>(null);
}
