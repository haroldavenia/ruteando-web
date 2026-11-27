import { cn } from '@/lib/cn';

/**
 * Emblema: un cronómetro con tres flechas de ruta. Usa `currentColor` (el color de marca es `primary`); la cara va al 14 % de tinte y
 * el trazo es de 3. Las tres flechas se dibujan repetidas y no con `<use>`: un `id` repetido en la página (un emblema en el riel y otro en
 * la barra) haría que los enlaces apuntaran al primero.
 */
export function Emblem({ size = 44, className }: { size?: number; className?: string }) {
  const arrow = (
    <>
      <path d="M24 11 A13 13 0 0 1 35.26 17.5" />
      <path d="M37 20.5 L32.66 19 L37.86 16 Z" fill="currentColor" strokeLinejoin="round" strokeWidth={1.5} />
    </>
  );
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      className={className}
    >
      <rect x="20" y="1.5" width="8" height="4" rx="1.5" fill="currentColor" />
      <rect x="36" y="6" width="6" height="3.2" rx="1.2" transform="rotate(40 39 7.6)" fill="currentColor" />
      <circle cx="24" cy="26" r="19" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="3" />
      <g transform="translate(0 2)" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <g>{arrow}</g>
        <g transform="rotate(120 24 24)">{arrow}</g>
        <g transform="rotate(240 24 24)">{arrow}</g>
      </g>
    </svg>
  );
}

/**
 * La marca: emblema y nombre. `default` mide 44px; `compact` 32px (barra de pantallas estrechas); `mark` es solo el emblema (riel de
 * iconos). Bajo 480px de ancho el nombre se oculta pero sigue ahí para los lectores de pantalla («Ruteando» es texto real; el emblema
 * es decorativo).
 */
export function Brand({ size = 'default', className }: { size?: 'default' | 'compact' | 'mark'; className?: string }) {
  const px = size === 'default' ? 44 : size === 'compact' ? 32 : 44;
  return (
    <span className={cn('inline-flex items-center gap-3 text-primary', className)}>
      <Emblem size={px} />
      <span
        className={cn(
          'font-brand font-extrabold tracking-[0.14em] text-on-surface uppercase',
          size === 'compact' ? 'text-base' : 'text-xl',
          size === 'mark' ? 'sr-only' : 'sr-only xs:not-sr-only'
        )}
      >
        Ruteando
      </span>
    </span>
  );
}
