import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { StatusTone, TONE_ICONS } from './status-tone';

/**
 * Etiqueta de un estado: icono y nombre en español, con un tono del tema. El icono es decorativo (los lectores de
 * pantalla anuncian solo el nombre) y el tono nunca es la única señal. El tono lo decide `statusTone`.
 */
@Component({
  selector: 'app-status-badge',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone()' },
  template: `<mat-icon aria-hidden="true" [fontIcon]="iconName()"></mat-icon><span>{{ label() }}</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px 2px 6px;
      border-radius: 999px;
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-label-large);
      white-space: nowrap;
    }
    mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    :host([data-tone='success']) {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    :host([data-tone='info']) {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    :host([data-tone='warning']) {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    :host([data-tone='danger']) {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
  `,
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');
  /** Icono distinto del que corresponde al tono, si hace falta. */
  readonly icon = input<string | null>(null);

  protected readonly iconName = computed(() => this.icon() ?? TONE_ICONS[this.tone()]);
}
