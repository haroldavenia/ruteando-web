import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

let nextId = 0;

/** Circunferencia del anillo (radio 42 del dibujo de 100x100). */
const CIRCUMFERENCE = 2 * Math.PI * 42;

/**
 * Anillo de progreso con el hilo de la marca: un porcentaje de 0 a 100 en el centro. El dibujo es decorativo y el porcentaje es
 * texto real, así que un lector de pantalla lo anuncia como cualquier cifra; quien lo use debe acompañarlo del significado
 * («98 de 137 paquetes atendidos»).
 */
@Component({
  selector: 'app-progress-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="1" y2="1">
          <stop class="from" offset="0" />
          <stop class="to" offset="1" />
        </linearGradient>
      </defs>
      <circle class="track" cx="50" cy="50" r="42" />
      <circle class="progress" cx="50" cy="50" r="42" [attr.stroke]="'url(#' + gradientId + ')'" [attr.stroke-dasharray]="dash()" />
    </svg>
    <span class="value">{{ rounded() }}%</span>
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
      width: 140px;
      height: 140px;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    circle {
      fill: none;
      stroke-width: 11;
    }
    .track {
      stroke: var(--mat-sys-surface-container-highest);
    }
    .progress {
      stroke-linecap: round;
    }
    .from {
      stop-color: var(--mat-sys-primary);
    }
    .to {
      stop-color: var(--mat-sys-tertiary);
    }
    .value {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font: var(--mat-sys-headline-medium);
      font-weight: 500;
    }
  `,
})
export class ProgressRingComponent {
  /** Porcentaje de 0 a 100; fuera de ese rango se recorta. */
  readonly value = input.required<number>();

  protected readonly gradientId = `progress-ring-${nextId++}`;
  protected readonly rounded = computed(() => Math.round(Math.min(100, Math.max(0, this.value()))));
  protected readonly dash = computed(() => `${((CIRCUMFERENCE * this.rounded()) / 100).toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`);
}
