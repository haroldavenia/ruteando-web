import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cabecera de una pantalla: título `h1` (con subtítulo opcional) y, a la derecha, las acciones (contenido proyectado).
 * El estilo del título es el del sistema de interfaz (`.page h1`), no el de este componente.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <div class="heading">
        <h1>{{ title() }}</h1>
        @if (subtitle(); as text) {
          <p class="subtitle">{{ text }}</p>
        }
      </div>
      <div class="actions"><ng-content /></div>
    </header>
  `,
  styles: `
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px 16px;
    }
    .subtitle {
      margin: 4px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-large);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
