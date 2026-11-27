'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * La presentación que acompaña a la ilustración: la de los tres pasos en el registro y la del producto en el resto. El layout es de
 * servidor y no conoce la ruta, así que recibe las dos ya pintadas y este componente elige.
 */
export function AccessArt({ pitch, steps }: { pitch: ReactNode; steps: ReactNode }) {
  return usePathname() === '/access/register' ? steps : pitch;
}
