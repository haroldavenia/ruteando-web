import type { RemixiconComponentType } from '@remixicon/react';

import { cn } from '@/lib/cn';

interface IconProps {
  /** El icono de Remix, importado por su nombre: `import { RiRouteLine } from '@remixicon/react'` (ver lib/icons/material-to-remix.ts). */
  icon: RemixiconComponentType;
  /** Lado en píxeles: 24 por defecto, como en la guía de diseño. */
  size?: number;
  className?: string;
}

/**
 * Icono decorativo: siempre `aria-hidden`, porque el significado lo da el texto de al lado. Un botón de solo icono NO usa esto solo:
 * usa `IconButton`, que exige `label` (se pinta como `title` y `aria-label`).
 */
export function Icon({ icon: Glyph, size = 24, className }: IconProps) {
  return <Glyph size={size} aria-hidden focusable="false" className={cn('shrink-0', className)} />;
}
