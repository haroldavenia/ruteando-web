import { useId } from 'react';

/** Circunferencia del anillo (radio 42 del dibujo de 100x100). */
const CIRCUMFERENCE = 2 * Math.PI * 42;

/**
 * Anillo de progreso con el hilo de la marca: un porcentaje de 0 a 100 en el centro. El dibujo es decorativo y el porcentaje es texto
 * real, así que un lector de pantalla lo anuncia como cualquier cifra; quien lo use debe acompañarlo del significado («2 de 8 paquetes»).
 * Mide lo que mida su contenedor (por defecto, 140px): se le da el tamaño con `className`.
 */
export function ProgressRing({ value, className }: { value: number; className?: string }) {
  const gradient = `progress-ring-${useId().replace(/:/g, '')}`;
  const rounded = Math.round(Math.min(100, Math.max(0, value)));
  const dash = `${((CIRCUMFERENCE * rounded) / 100).toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`;
  return (
    <span className={`relative inline-block size-35 ${className ?? ''}`}>
      <svg viewBox="0 0 100 100" aria-hidden focusable="false" className="block size-full -rotate-90">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="[stop-color:var(--color-primary)]" />
            <stop offset="1" className="[stop-color:var(--color-tertiary)]" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="11" className="stroke-surface-container-highest" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          stroke={`url(#${gradient})`}
          strokeDasharray={dash}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-brand text-[28px]/9 font-medium">{rounded}%</span>
    </span>
  );
}
