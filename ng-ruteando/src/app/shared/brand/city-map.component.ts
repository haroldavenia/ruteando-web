import { ChangeDetectionStrategy, Component } from '@angular/core';

import { routeColorThemed } from '../map/route-colors';

interface MapRoute {
  color: string;
  /** Puntos del recorrido, de depósito a depósito. */
  points: string;
  /** Paradas numeradas: `[x, y]` en el sistema de coordenadas del dibujo (600x400). */
  stops: readonly (readonly [number, number])[];
}

const DEPOT = [110, 250] as const;

const ROUTES: readonly MapRoute[] = [
  {
    color: routeColorThemed(0),
    points: '110,250 170,170 260,120 350,150 400,230 300,280 110,250',
    stops: [[170, 170], [260, 120], [350, 150], [400, 230], [300, 280]],
  },
  {
    color: routeColorThemed(1),
    points: '110,250 140,335 250,365 365,350 470,320 330,305 110,250',
    stops: [[140, 335], [250, 365], [365, 350], [470, 320], [330, 305]],
  },
  {
    color: routeColorThemed(2),
    points: '110,250 120,150 150,70 280,45 430,60 520,110 555,195 470,205',
    stops: [[120, 150], [150, 70], [280, 45], [430, 60], [520, 110], [555, 195], [470, 205]],
  },
];

/**
 * Ilustración decorativa de una ciudad vista desde arriba: calles, avenidas, un río y parques con tres rutas numeradas
 * (`ruta·orden`) que salen de un depósito («D»). Es solo adorno: está oculta a lectores de pantalla, no recibe foco ni clics y
 * toma sus colores del tema (claro y oscuro). Llena a su contenedor, que debe tener posición, y las rutas se dibujan una vez al
 * entrar, salvo que se pida movimiento reducido.
 */
@Component({
  selector: 'app-city-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" focusable="false">
      <rect class="land" width="600" height="400" />
      <rect class="park" x="215" y="150" width="70" height="46" rx="12" />
      <rect class="park" x="425" y="105" width="70" height="44" rx="12" />
      <rect class="park" x="40" y="60" width="52" height="40" rx="12" />
      <path class="water" d="M-10 318 C 100 296 170 340 300 330 S 520 300 620 322" />
      <path
        class="street"
        d="M0 60H600M0 120H600M0 180H600M0 240H600M0 300H600M0 360H600M60 0V400M130 0V400M200 0V400M270 0V400M340 0V400M410 0V400M480 0V400M550 0V400"
      />
      <path class="avenue" d="M0 205L600 195M300 0L310 400M0 40L600 110" />
      @for (route of routes; track route.color; let r = $index) {
        <g [style.--c]="route.color">
          <polyline class="casing" [attr.points]="route.points" />
          <polyline class="route" pathLength="1" [attr.points]="route.points" />
          @for (stop of route.stops; track $index; let n = $index) {
            <g class="stop" [attr.transform]="'translate(' + stop[0] + ' ' + stop[1] + ')'">
              <circle r="11" />
              <text>{{ r + 1 }}·{{ n + 1 }}</text>
            </g>
          }
        </g>
      }
      <g class="depot" [attr.transform]="'translate(' + depot[0] + ' ' + depot[1] + ')'">
        <circle r="15" />
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
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    /* Colores del mapa: claro y oscuro, como los de las rutas */
    .land {
      fill: light-dark(#eeeae3, #1b1826);
    }
    .park {
      fill: light-dark(#ddebd2, #1c2a25);
    }
    .water {
      fill: none;
      stroke: light-dark(#cce3f1, #142a3d);
      stroke-width: 24;
      stroke-linecap: round;
    }
    .street {
      fill: none;
      stroke: light-dark(#ffffff, #26223a);
      stroke-width: 3;
    }
    .avenue {
      fill: none;
      stroke: light-dark(#fbf8f3, #2e2945);
      stroke-width: 8;
      stroke-linecap: round;
    }
    .casing,
    .route {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .casing {
      stroke: light-dark(#ffffff, #0f0d14);
      stroke-width: 8;
      opacity: 0.9;
    }
    .route {
      stroke: var(--c);
      stroke-width: 4;
      stroke-dasharray: 1;
    }
    .stop circle {
      fill: var(--c);
      stroke: light-dark(#ffffff, #0f0d14);
      stroke-width: 2;
    }
    .depot circle {
      fill: var(--mat-sys-surface);
      stroke: var(--mat-sys-primary);
      stroke-width: 4;
    }
    text {
      font: 800 8.5px Manrope, Roboto, sans-serif;
      text-anchor: middle;
      dominant-baseline: central;
      fill: light-dark(#ffffff, #1d1b1e);
      paint-order: stroke;
      stroke: light-dark(rgb(0 0 0 / 0.5), transparent);
      stroke-width: 2.2px;
      stroke-linejoin: round;
    }
    .depot text {
      font-size: 15px;
      fill: var(--mat-sys-primary);
      stroke: none;
    }
    @media (prefers-reduced-motion: no-preference) {
      .route {
        animation: draw 1.6s ease-out 0.1s both;
      }
      .stop,
      .depot {
        animation: appear 0.5s ease-out 0.9s both;
        transform-box: fill-box;
        transform-origin: center;
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
          transform: scale(0.6);
        }
      }
    }
  `,
})
export class CityMapComponent {
  protected readonly routes = ROUTES;
  protected readonly depot = DEPOT;
}
