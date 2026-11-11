import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Los códigos de recuperación, que se muestran una sola vez: copiar, descargar y confirmar que se guardaron. */
@Component({
  selector: 'app-recovery-codes',
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="warn" role="note">
      <mat-icon aria-hidden="true">warning</mat-icon>
      <span>{{
        'Guarda estos códigos en un lugar seguro. Cada uno sirve una sola vez si pierdes tu teléfono, y no volverán a mostrarse.'
          | t
      }}</span>
    </p>
    <ol class="codes" [attr.aria-label]="'Códigos de recuperación' | t">
      @for (code of codes(); track code) {
        <li>{{ code }}</li>
      }
    </ol>
    <div class="actions">
      <button mat-stroked-button type="button" (click)="copy()">
        <mat-icon aria-hidden="true">content_copy</mat-icon>{{ 'Copiar' | t }}
      </button>
      <button mat-stroked-button type="button" (click)="download()">
        <mat-icon aria-hidden="true">download</mat-icon>{{ 'Descargar' | t }}
      </button>
    </div>
    <p class="status" role="status" aria-live="polite">{{ status() }}</p>
    <button mat-flat-button type="button" class="primary-action" (click)="saved.emit()">
      {{ 'Ya los guardé' | t }}
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .warn {
      display: flex;
      gap: 10px;
      margin: 0;
      padding: 12px 16px;
      border-radius: 12px;
      background: var(--app-warning-container);
      color: var(--app-on-warning-container);
      font: var(--mat-sys-body-medium);
    }
    .codes {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 16px;
      margin: 0;
      padding: 16px 16px 16px 40px;
      border-radius: 12px;
      background: var(--mat-sys-surface-container-high);
      font:
        500 16px/1.4 ui-monospace,
        'JetBrains Mono',
        monospace;
      letter-spacing: 0.04em;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .status {
      margin: 0;
      min-height: 1.4em;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class RecoveryCodesComponent {
  readonly codes = input.required<string[]>();
  /** La persona confirmó que guardó los códigos. */
  readonly saved = output<void>();
  protected readonly status = signal('');

  protected copy(): void {
    navigator.clipboard.writeText(this.codes().join('\n')).then(
      () => this.status.set(t('Códigos copiados')),
      () => this.status.set(t('No se pudo copiar: selecciónalos y cópialos a mano'))
    );
  }

  protected download(): void {
    const file = new Blob([this.codes().join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'codigos-de-recuperacion.txt';
    link.click();
    URL.revokeObjectURL(url);
    this.status.set(t('Descarga iniciada'));
  }
}
