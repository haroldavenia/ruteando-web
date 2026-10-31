import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';

import { ThemePreference, ThemeService } from '../../core/theme/theme.service';

interface ThemeOption {
  readonly value: ThemePreference;
  readonly label: string;
  readonly icon: string;
}

const OPTIONS: readonly ThemeOption[] = [
  { value: 'system', label: 'Tema del sistema', icon: 'brightness_auto' },
  { value: 'light', label: 'Tema claro', icon: 'light_mode' },
  { value: 'dark', label: 'Tema oscuro', icon: 'dark_mode' },
];

/**
 * Selector del tema de color: tres botones de icono seguidos de 44px (Sistema, Claro y Oscuro) donde se ve de un vistazo cuál está
 * elegido y se cambia con un clic. Cambia la interfaz al instante y recuerda la elección (`ThemeService`). Es un grupo de
 * opciones excluyentes: cada botón anuncia su nombre y cuál está activo.
 */
@Component({
  selector: 'app-theme-toggle',
  imports: [MatButtonToggleModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-button-toggle-group
      aria-label="Tema de color"
      hideSingleSelectionIndicator
      [value]="theme.preference()"
      (change)="choose($event)"
    >
      @for (option of options; track option.value) {
        <mat-button-toggle [value]="option.value" [aria-label]="option.label" [attr.title]="option.label">
          <mat-icon aria-hidden="true">{{ option.icon }}</mat-icon>
        </mat-button-toggle>
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
      border: 0;
    }
    mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly options = OPTIONS;

  protected choose(change: MatButtonToggleChange): void {
    this.theme.set(change.value as ThemePreference);
  }
}
