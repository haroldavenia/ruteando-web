import { routeColorThemed } from '@/lib/map/route-colors';

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
    color: routeColorThemed(0),
    points: '240,430 330,290 480,220 620,280 590,410 400,470 240,430',
    stops: [
      [330, 290],
      [480, 220],
      [620, 280],
      [590, 410],
      [400, 470],
    ],
  },
  {
    color: routeColorThemed(1),
    points: '240,430 300,560 450,640 640,620 700,520 540,480 240,430',
    stops: [
      [300, 560],
      [450, 640],
      [640, 620],
      [700, 520],
      [540, 480],
    ],
  },
  {
    color: routeColorThemed(2),
    points: '240,430 360,380 560,340 760,260 960,240 1020,360 880,400 700,430 240,430',
    stops: [
      [560, 340],
      [760, 260],
      [960, 240],
      [1020, 360],
      [880, 400],
    ],
  },
];

/**
 * Ilustración decorativa de las pantallas de acceso (y de la cabecera de Inicio): un depósito («D»), tres rutas con sus paradas numeradas
 * como en el mapa de rutas (`ruta·orden`) y una zona. Es solo ilustración: está oculta a lectores de pantalla, no recibe foco ni clics y
 * toma sus colores del tema. Las rutas se dibujan una vez al entrar, salvo que se pida movimiento reducido (`.route-backdrop` en
 * `globals.css`). `align="start"` ancla el dibujo a la izquierda, con el depósito siempre a la vista; `center` lo centra.
 */
export function RouteBackdrop({ align = 'center' }: { align?: 'start' | 'center' }) {
  return (
    <div aria-hidden data-route-backdrop className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio={align === 'start' ? 'xMinYMid slice' : 'xMidYMid slice'}
        focusable="false"
        className="size-full opacity-80"
      >
        <polygon data-rb="zone" points="780,130 1080,190 1130,430 940,560 740,420" />
        {ROUTES.map((route, r) => (
          <g key={route.color} style={{ '--c': route.color } as React.CSSProperties}>
            <polyline data-rb="route" pathLength="1" points={route.points} />
            {route.stops.map(([x, y], n) => (
              <g key={`${x}-${y}`} data-rb="stop" transform={`translate(${x} ${y})`}>
                <circle r="16" />
                <text>
                  {r + 1}·{n + 1}
                </text>
              </g>
            ))}
          </g>
        ))}
        <g data-rb="depot" transform={`translate(${DEPOT[0]} ${DEPOT[1]})`}>
          <circle r="26" />
          <text>D</text>
        </g>
      </svg>
    </div>
  );
}
