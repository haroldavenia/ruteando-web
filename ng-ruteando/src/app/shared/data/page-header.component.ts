import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Cabecera de una pantalla: título `h1` y, a la derecha, la acción principal (contenido proyectado). */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <h1>{{ title() }}</h1>
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
      margin-bottom: 16px;
    }
    h1 {
      margin: 0;
      font: var(--mat-sys-headline-small);
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
}
