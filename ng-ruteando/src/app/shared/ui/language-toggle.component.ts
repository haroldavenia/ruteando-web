import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

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
 * Selector de idioma, en dos formas con el mismo lenguaje visual:
 * - `segmented` (por defecto, pantallas de acceso): globo y tres opciones (EN, ES, PT) con un indicador de degradado que se
 *   desliza hasta la elegida. Es un grupo de opciones excluyentes (`radiogroup`) y se maneja con las flechas.
 * - `menu` (barra de la aplicación): una píldora con el globo y el idioma actual que abre la lista; cada fila lleva el código del
 *   idioma en una etiqueta de color, su nombre y una marca en el elegido.
 * Elegir otro lo guarda y recarga la página tras una breve animación (`LanguageService`).
 */
@Component({
  selector: 'app-language-toggle',
  imports: [MatIconModule, MatMenuModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (variant() === 'menu') {
      <button class="pill" type="button" [matMenuTriggerFor]="menu" [attr.aria-label]="'Idioma' | t" [attr.title]="'Idioma' | t">
        <mat-icon aria-hidden="true">language</mat-icon>
        <span>{{ options[index()].code }}</span>
        <mat-icon class="caret" aria-hidden="true">expand_more</mat-icon>
      </button>
      <mat-menu #menu="matMenu">
        @for (option of options; track option.value) {
          <button mat-menu-item type="button" role="menuitemradio" [attr.aria-checked]="option.value === language.current" (click)="choose(option.value)">
            <span class="row">
              <span class="code">{{ option.code }}</span>
              <span class="name">{{ option.name }}</span>
              <mat-icon class="check" aria-hidden="true" [class.off]="option.value !== language.current">check</mat-icon>
            </span>
          </button>
        }
      </mat-menu>
    } @else {
      <div class="seg" role="radiogroup" [attr.aria-label]="'Idioma' | t" (keydown)="onKey($event)">
        <mat-icon class="globe" aria-hidden="true">language</mat-icon>
        <div class="opts" [style.--i]="index()">
          <span class="thumb" aria-hidden="true"></span>
          @for (option of options; track option.value; let i = $index) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="i === index()"
              [attr.tabindex]="i === index() ? 0 : -1"
              [attr.aria-label]="option.name"
              [attr.title]="option.name"
              (click)="choose(option.value)"
            >{{ option.code }}</button>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .seg,
    .pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: var(--mat-sys-surface-container);
      outline: 1px solid var(--mat-sys-outline-variant);
      outline-offset: -1px;
    }
    .seg {
      padding: 4px;
    }
    mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
    .globe {
      margin: 0 6px 0 10px;
      color: var(--mat-sys-on-surface-variant);
    }
    .opts {
      position: relative;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 48px;
    }
    .thumb {
      position: absolute;
      inset: 0 auto 0 0;
      width: 48px;
      border-radius: 999px;
      background: var(--app-brand-gradient);
      box-shadow: 0 2px 8px color-mix(in srgb, var(--mat-sys-primary) 35%, transparent);
      transform: translateX(calc(var(--i, 0) * 48px));
      transition: transform 0.34s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .opts button,
    .pill,
    .code {
      font: 600 13px/1 var(--mat-sys-label-large-font, inherit);
      letter-spacing: 0.06em;
    }
    .opts button,
    .pill {
      border: 0;
      cursor: pointer;
    }
    .opts button {
      position: relative;
      height: 40px;
      border-radius: 999px;
      background: none;
      color: var(--mat-sys-on-surface-variant);
      transition: color 0.2s;
    }
    .opts button[aria-checked='true'] {
      color: var(--mat-sys-on-primary);
    }
    .opts button[aria-checked='false']:hover {
      color: var(--mat-sys-on-surface);
    }
    .pill {
      gap: 6px;
      height: 44px;
      padding: 0 8px 0 12px;
      color: var(--mat-sys-primary);
    }
    .caret {
      color: var(--mat-sys-on-surface-variant);
    }
    button:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 188px;
    }
    .code {
      min-width: 32px;
      padding: 4px 0;
      border-radius: 8px;
      background: var(--mat-sys-primary-container);
      font-size: 12px;
      text-align: center;
      color: var(--mat-sys-on-primary-container);
    }
    [aria-checked='true'] .code {
      background: var(--app-brand-gradient);
      color: var(--mat-sys-on-primary);
    }
    .name {
      flex: 1;
      color: var(--mat-sys-on-surface);
    }
    .check {
      margin: 0;
      color: var(--mat-sys-primary);
    }
    .off {
      visibility: hidden;
    }
    @media (prefers-reduced-motion: reduce) {
      .thumb,
      .opts button {
        transition: none;
      }
    }
  `,
})
export class LanguageToggleComponent {
  protected readonly language = inject(LanguageService);
  protected readonly options = OPTIONS;

  readonly variant = input<'segmented' | 'menu'>('segmented');

  /** Posición del idioma elegido: se adelanta al cambio de página para que el indicador ya se deslice. */
  protected readonly index = signal(OPTIONS.findIndex((option) => option.value === this.language.current));

  protected choose(lang: Language): void {
    this.index.set(OPTIONS.findIndex((option) => option.value === lang));
    this.language.set(lang);
  }

  /** Flechas: pasan al idioma siguiente o anterior (patrón de los grupos de opciones). */
  protected onKey(event: KeyboardEvent): void {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const next = OPTIONS[(this.index() + step + OPTIONS.length) % OPTIONS.length];
    this.choose(next.value);
    (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="radio"]')[this.index()]?.focus();
  }
}
