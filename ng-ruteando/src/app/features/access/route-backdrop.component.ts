import { ChangeDetectionStrategy, Component } from '@angular/core';

import { routeColor } from '../../shared/map/route-colors';

interface BackdropRoute {
  color: string;
  /** Puntos del recorrido, de depósito a depósito. */
  points: string;
  /** Paradas numeradas: `[x, y]` en el sistema de coordenadas del dibujo. */
  stops: readonly (readonly [number, number])[];
}

const DEPOT = [240, 430] as const;

const ROUTES: readonly BackdropRoute[] = [
  {
    color: routeColor(0),
    points: '240,430 330,290 480,220 620,280 590,410 400,470 240,430',
    stops: [[330, 290], [480, 220], [620, 280], [590, 410], [400, 470]],
  },
  {
    color: routeColor(1),
    points: '240,430 300,560 450,640 640,620 700,520 540,480 240,430',
    stops: [[300, 560], [450, 640], [640, 620], [700, 520], [540, 480]],
  },
  {
    color: routeColor(2),
    points: '240,430 360,380 560,340 760,260 960,240 1020,360 880,400 700,430 240,430',
    stops: [[560, 340], [760, 260], [960, 240], [1020, 360], [880, 400]],
  },
];

/**
 * Fondo decorativo de las pantallas de acceso: un depósito («D»), tres rutas con sus paradas numeradas como en el mapa
 * de rutas (`ruta·orden`) y una zona. Es solo ilustración: está oculto a lectores de pantalla, no recibe foco ni clics y
 * toma sus colores del tema. Las rutas se dibujan una vez al entrar, salvo que se pida movimiento reducido.
 */
@Component({
  selector: 'app-route-backdrop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" focusable="false">
      <polygon class="zone" points="780,130 1080,190 1130,430 940,560 740,420" />
      @for (route of routes; track route.color; let r = $index) {
        <g [style.--c]="route.color">
          <polyline class="route" pathLength="1" [attr.points]="route.points" />
          @for (stop of route.stops; track $index; let n = $index) {
            <g class="stop" [attr.transform]="'translate(' + stop[0] + ' ' + stop[1] + ')'">
              <circle r="16" />
              <text>{{ r + 1 }}·{{ n + 1 }}</text>
            </g>
          }
        </g>
      }
      <g class="depot" [attr.transform]="'translate(' + depot[0] + ' ' + depot[1] + ')'">
        <circle r="26" />
        <text>D</text>
      </g>
    </svg>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      background:
        radial-gradient(60% 55% at 85% 10%, color-mix(in srgb, var(--mat-sys-primary) 16%, transparent), transparent),
        radial-gradient(50% 50% at 5% 95%, color-mix(in srgb, var(--mat-sys-tertiary) 12%, transparent), transparent),
        var(--mat-sys-surface-container-low);
    }
    svg {
      width: 100%;
      height: 100%;
      opacity: 0.55;
    }
    .zone {
      fill: color-mix(in srgb, var(--mat-sys-primary) 9%, transparent);
      stroke: color-mix(in srgb, var(--mat-sys-primary) 40%, transparent);
      stroke-width: 2;
      stroke-dasharray: 8 8;
    }
    .route {
      fill: none;
      stroke: var(--c);
      stroke-width: 5;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 1;
    }
    .stop circle {
      fill: var(--c);
      stroke: var(--mat-sys-surface);
      stroke-width: 3;
    }
    .depot circle {
      fill: var(--mat-sys-surface);
      stroke: var(--mat-sys-primary);
      stroke-width: 5;
    }
    text {
      font: 700 11px Roboto, sans-serif;
      text-anchor: middle;
      dominant-baseline: central;
      fill: #fff;
    }
    .depot text {
      font-size: 24px;
      fill: var(--mat-sys-primary);
    }
    @media (prefers-reduced-motion: no-preference) {
      .route {
        animation: draw 1.4s ease-out both;
      }
      .stop,
      .depot {
        animation: appear 0.6s ease-out 0.9s both;
      }
      @keyframes draw {
        from {
          stroke-dashoffset: 1;
        }
        to {
          stroke-dashoffset: 0;
        }
      }
      @keyframes appear {
        from {
          opacity: 0;
        }
      }
    }
  `,
})
export class RouteBackdropComponent {
  protected readonly routes = ROUTES;
  protected readonly depot = DEPOT;
}
