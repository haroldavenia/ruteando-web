import { routeColorThemed } from '@/lib/map/route-colors';

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
    stops: [
      [170, 170],
      [260, 120],
      [350, 150],
      [400, 230],
      [300, 280],
    ],
  },
  {
    color: routeColorThemed(1),
    points: '110,250 140,335 250,365 365,350 470,320 330,305 110,250',
    stops: [
      [140, 335],
      [250, 365],
      [365, 350],
      [470, 320],
      [330, 305],
    ],
  },
  {
    color: routeColorThemed(2),
    points: '110,250 120,150 150,70 280,45 430,60 520,110 555,195 470,205',
    stops: [
      [120, 150],
      [150, 70],
      [280, 45],
      [430, 60],
      [520, 110],
      [555, 195],
      [470, 205],
    ],
  },
];

/**
 * Ilustración decorativa de una ciudad vista desde arriba: calles, avenidas, un río y parques con tres rutas numeradas (`ruta·orden`)
 * que salen de un depósito («D»). Es solo adorno: está oculta a lectores de pantalla, no recibe foco ni clics y toma sus colores del
 * tema (claro y oscuro; los estilos son `[data-city-map]` en `globals.css`). Llena a su contenedor, que debe tener posición, y las rutas
 * se dibujan una vez al entrar, salvo que se pida movimiento reducido.
 */
export function CityMap() {
  return (
    <div aria-hidden data-city-map className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" focusable="false" className="block size-full">
        <rect data-cm="land" width="600" height="400" />
        <rect data-cm="park" x="215" y="150" width="70" height="46" rx="12" />
        <rect data-cm="park" x="425" y="105" width="70" height="44" rx="12" />
        <rect data-cm="park" x="40" y="60" width="52" height="40" rx="12" />
        <path data-cm="water" d="M-10 318 C 100 296 170 340 300 330 S 520 300 620 322" />
        <path
          data-cm="street"
          d="M0 60H600M0 120H600M0 180H600M0 240H600M0 300H600M0 360H600M60 0V400M130 0V400M200 0V400M270 0V400M340 0V400M410 0V400M480 0V400M550 0V400"
        />
        <path data-cm="avenue" d="M0 205L600 195M300 0L310 400M0 40L600 110" />
        {ROUTES.map((route, r) => (
          <g key={route.color} style={{ '--c': route.color } as React.CSSProperties}>
            <polyline data-cm="casing" points={route.points} />
            <polyline data-cm="route" pathLength="1" points={route.points} />
            {route.stops.map(([x, y], n) => (
              <g key={`${x}-${y}`} data-cm="stop" transform={`translate(${x} ${y})`}>
                <circle r="11" />
                <text>
                  {r + 1}·{n + 1}
                </text>
              </g>
            ))}
          </g>
        ))}
        <g data-cm="depot" transform={`translate(${DEPOT[0]} ${DEPOT[1]})`}>
          <circle r="15" />
          <text>D</text>
        </g>
      </svg>
    </div>
  );
}
