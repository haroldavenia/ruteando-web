import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LEGAL_DOCS, legalTitle } from './legal-docs';

/**
 * Pie con los enlaces a los documentos legales y el derecho de autor. Va al final de las pantallas de acceso y de cada documento
 * (donde marca el que se está leyendo).
 */
@Component({
  selector: 'app-legal-links',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="legal-links" [attr.aria-label]="'Información legal' | t">
      @for (doc of docs; track doc) {
        <a
          [routerLink]="['/legal', doc]"
          [replaceUrl]="replace()"
          routerLinkActive="current"
          ariaCurrentWhenActive="page"
          >{{ title(doc) }}</a
        >
      }
      <span class="copy">© {{ year }} Ruteando</span>
    </nav>
  `,
  styles: `
    :host {
      display: block;
    }
    .legal-links {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0 16px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    a {
      padding: 10px 0;
      color: inherit;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    a:hover {
      color: var(--mat-sys-primary);
    }
    a:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
      border-radius: 4px;
    }
    a.current {
      color: var(--mat-sys-on-surface);
      font-weight: 500;
      text-decoration: none;
    }
    .copy {
      margin-inline-start: auto;
    }
  `,
})
export class LegalLinksComponent {
  /** Dentro de un documento, pasar de uno a otro reemplaza la entrada del historial: «Volver» sigue llevando a donde se estaba. */
  readonly replace = input(false, { transform: booleanAttribute });
  protected readonly docs = LEGAL_DOCS;
  protected readonly year = new Date().getFullYear();
  protected title = legalTitle;
}
