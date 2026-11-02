import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';

import { Language } from '../../core/i18n/i18n';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

interface LanguageOption {
  readonly value: Language;
  /** Código corto que se ve en el botón. */
  readonly code: string;
  /** Nombre del idioma en su propio idioma: no se traduce. */
  readonly name: string;
}

const OPTIONS: readonly LanguageOption[] = [
  { value: 'en', code: 'EN', name: 'English' },
  { value: 'es', code: 'ES', name: 'Español' },
  { value: 'pt', code: 'PT', name: 'Português' },
];

/**
 * Selector de idioma: tres botones (EN, ES y PT) donde se ve cuál está activo. Elegir otro lo guarda y recarga la página
 * (`LanguageService`). Es un grupo de opciones excluyentes: cada botón anuncia el nombre del idioma en su propio idioma.
 */
@Component({
  selector: 'app-language-toggle',
  imports: [MatButtonToggleModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-button-toggle-group
      [attr.aria-label]="'Idioma' | t"
      hideSingleSelectionIndicator
      [value]="language.current"
      (change)="choose($event)"
    >
      @for (option of options; track option.value) {
        <mat-button-toggle [value]="option.value" [aria-label]="option.name" [attr.title]="option.name">{{ option.code }}</mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    mat-button-toggle-group {
      overflow: hidden;
      border-radius: 999px;
      outline: 1px solid var(--mat-sys-outline-variant);
      outline-offset: -1px;
      background: var(--mat-sys-surface-container);
    }
    mat-button-toggle {
      --mat-button-toggle-height: 44px;
      --mat-button-toggle-shape: 999px;
      --mat-button-toggle-text-color: var(--mat-sys-on-surface-variant);
      --mat-button-toggle-background-color: transparent;
      --mat-button-toggle-selected-state-background-color: var(--mat-sys-primary-container);
      --mat-button-toggle-selected-state-text-color: var(--mat-sys-on-primary-container);
      --mat-button-toggle-divider-color: transparent;
      --mat-button-toggle-label-text-weight: 500;
      border: 0;
    }
  `,
})
export class LanguageToggleComponent {
  protected readonly language = inject(LanguageService);
  protected readonly options = OPTIONS;

  protected choose(change: MatButtonToggleChange): void {
    this.language.set(change.value as Language);
  }
}
