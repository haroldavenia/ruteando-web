import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { t } from '../../core/i18n/i18n';
export type SkeletonVariant = 'stats' | 'form' | 'list' | 'ring';

/** Cuántas piezas dibuja cada variante si no se pide otra cifra. */
const DEFAULT_COUNT: Record<SkeletonVariant, number> = { stats: 6, form: 4, list: 3, ring: 1 };

/**
 * Esqueleto de carga con la forma de lo que va a llegar: `stats` (datos en rejilla), `form` (campos), `list` (filas) y `ring`
 * (anillo con su frase). El dibujo es decorativo (`aria-hidden`); `label` es lo que anuncia el lector de pantalla («Cargando la
 * jornada…»), así que la pantalla no necesita otro aviso. Sin animación si se pide movimiento reducido. Las tablas usan las
 * filas de `DataTableComponent`, no este componente.
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  template: `
    <span class="visually-hidden">{{ label() }}</span>
    <div class="shape" [class]="variant()" aria-hidden="true">
      @switch (variant()) {
        @case ('stats') {
          @for (i of items(); track i) {
            <div class="stat"><span class="bar short"></span><span class="bar"></span></div>
          }
        }
        @case ('form') {
          @for (i of items(); track i) {
            <span class="bar field"></span>
          }
        }
        @case ('list') {
          @for (i of items(); track i) {
            <span class="bar row"></span>
          }
        }
        @case ('ring') {
          <span class="bar disc"></span>
          <div class="lines"><span class="bar"></span><span class="bar short"></span></div>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .bar {
      display: block;
      height: 14px;
      border-radius: 7px;
      background: var(--mat-sys-surface-container-highest);
    }
    @media (prefers-reduced-motion: no-preference) {
      .bar {
        animation: skeleton-pulse 1.4s ease-in-out infinite;
      }
    }
    @keyframes skeleton-pulse {
      50% {
        opacity: 0.45;
      }
    }
    .short {
      width: 55%;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 20px 16px;
    }
    .stat {
      display: grid;
      gap: 10px;
    }
    .stat .short {
      height: 10px;
    }
    .stat .bar:last-child {
      width: 80%;
      height: 18px;
    }
    .form,
    .list {
      display: grid;
      gap: 16px;
    }
    .field {
      height: 56px;
      border-radius: 12px;
    }
    .row {
      height: 52px;
      border-radius: 12px;
    }
    .ring {
      display: grid;
      justify-items: center;
      gap: 20px;
    }
    .disc {
      width: 140px;
      height: 140px;
      border-radius: 50%;
    }
    .lines {
      display: grid;
      gap: 12px;
      width: 100%;
      justify-items: center;
    }
    .lines .bar {
      width: 80%;
    }
    .lines .short {
      width: 55%;
    }
  `,
})
export class SkeletonComponent {
  readonly variant = input<SkeletonVariant>('stats');
  readonly label = input(t('Cargando…'));
  /** Piezas a dibujar; por defecto las de la variante. */
  readonly count = input<number | undefined>(undefined);

  protected readonly items = computed(() =>
    Array.from({ length: this.count() ?? DEFAULT_COUNT[this.variant()] }, (_, i) => i)
  );
}
