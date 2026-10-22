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
    .result {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .result:empty {
      display: none;
    }
    .error {
      color: var(--mat-sys-error);
    }
    .success {
      color: var(--mat-sys-primary);
    }
  `,
})
export class FormResultComponent {
  readonly error = input<string | null>(null);
  readonly success = input<string | null>(null);
}
