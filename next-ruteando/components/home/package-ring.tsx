import type { PackageFigures } from '@/lib/home/figures';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Anillo de «Paquetes atendidos»: el reparto de la muestra en atendidos (verde), pendientes (azul) y sin atender (ámbar), con el
 * porcentaje de atendidos al centro. Los colores son los tokens de estado y cada parte también se dice en texto (`label` y la leyenda),
 * así que el color nunca es el único canal. Los tramos arrancan arriba y siguen el sentido del reloj.
 */
export function PackageRing({ figures, label }: { figures: PackageFigures; label: string }) {
  const parts = [
    { value: figures.attended, className: 'stroke-on-success-container' },
    { value: figures.pending, className: 'stroke-on-info-container' },
    { value: figures.unattended, className: 'stroke-on-warning-container' },
  ];
  let offset = 0;
  const arcs = parts.map((part) => {
    const length = figures.sample === 0 ? 0 : (part.value / figures.sample) * CIRCUMFERENCE;
    const arc = { ...part, length, offset };
    offset += length;
    return arc;
  });
  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <svg viewBox="0 0 128 128" role="img" aria-label={label} className="size-40">
        <circle cx="64" cy="64" r={RADIUS} fill="none" strokeWidth="14" className="stroke-surface-container-highest" />
        {arcs
          .filter((arc) => arc.length > 0)
          .map((arc) => (
            <circle
              key={arc.className}
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              strokeWidth="14"
              strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
              strokeDashoffset={-arc.offset}
              transform="rotate(-90 64 64)"
              className={arc.className}
            />
          ))}
        <text x="64" y="70" textAnchor="middle" className="fill-on-surface font-brand text-2xl font-bold">
          {Math.round(figures.percent)} %
        </text>
      </svg>
    </figure>
  );
}
