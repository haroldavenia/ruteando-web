import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';

import { t } from '../../core/i18n/i18n';

/**
 * Código QR como SVG (sin imagen ni `innerHTML`, por la CSP). La biblioteca `qrcode` se carga solo cuando hace falta (al activar la
 * aplicación autenticadora), no en el arranque. Siempre oscuro sobre claro: así lo leen las aplicaciones, también con el tema oscuro.
 */
@Component({
  selector: 'app-qr-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shape(); as qr) {
      <svg
        role="img"
        [attr.aria-label]="label()"
        [attr.viewBox]="'0 0 ' + qr.size + ' ' + qr.size"
        shape-rendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100%" height="100%" fill="#fff" />
        <path [attr.d]="qr.path" fill="#000" />
      </svg>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 176px;
      max-width: 100%;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--mat-sys-outline-variant);
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
    }
  `,
})
export class QrCodeComponent {
  readonly text = input.required<string>();
  readonly label = input(t('Código QR para la aplicación autenticadora'));
  protected readonly shape = signal<{ size: number; path: string } | null>(null);

  constructor() {
    effect(() => {
      const text = this.text();
      void import('qrcode').then((mod) => {
        const { create } = mod.default ?? mod;
        const { modules } = create(text, { errorCorrectionLevel: 'M' });
        const quiet = 4; // margen claro alrededor, como pide el estándar
        let path = '';
        for (let row = 0; row < modules.size; row++) {
          for (let col = 0; col < modules.size; col++) {
            if (modules.get(row, col)) {
              path += `M${col + quiet} ${row + quiet}h1v1h-1z`;
            }
          }
        }
        this.shape.set({ size: modules.size + quiet * 2, path });
      });
    });
  }
}
