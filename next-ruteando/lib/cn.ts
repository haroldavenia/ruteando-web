import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge necesita conocer los valores propios de @theme (app/globals.css): sin ellos `rounded-control` y `rounded-lg` no se
// reconocerían como el mismo grupo y no se pisarían entre sí.
const merge = extendTailwindMerge({
  extend: { theme: { radius: ['control', 'card', 'dialog'], shadow: ['card'], font: ['brand'] } },
});

/** Une clases condicionales y resuelve los conflictos de Tailwind: gana la última (`cn('px-4', cond && 'px-6')`). */
export const cn = (...inputs: ClassValue[]) => merge(clsx(inputs));
