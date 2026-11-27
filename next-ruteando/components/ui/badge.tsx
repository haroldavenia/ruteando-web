import {
  type RemixiconComponentType,
  RiAlarmWarningLine,
  RiCheckboxBlankCircleLine,
  RiCheckLine,
  RiCircleLine,
  RiCloseLine,
} from '@remixicon/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from './icon';

export const TONES = ['neutral', 'success', 'info', 'warning', 'danger'] as const;
export type Tone = (typeof TONES)[number];

/**
 * Un tono = colores + glifo (el color nunca es la única señal: el glifo y el texto dicen lo mismo). Material no trae verde, azul ni
 * ámbar: los tres salen de los tokens `success`, `info` y `warning`; el peligro usa `error-container`.
 */
const STYLE: Record<Tone, { classes: string; glyph: RemixiconComponentType }> = {
  neutral: { classes: 'bg-surface-container-highest text-on-surface', glyph: RiCheckboxBlankCircleLine },
  success: { classes: 'bg-success-container text-on-success-container', glyph: RiCheckLine },
  info: { classes: 'bg-info-container text-on-info-container', glyph: RiCircleLine },
  warning: { classes: 'bg-warning-container text-on-warning-container', glyph: RiAlarmWarningLine },
  danger: { classes: 'bg-error-container text-on-error-container', glyph: RiCloseLine },
};

export const toneClasses = (tone: Tone) => STYLE[tone].classes;
export const toneGlyph = (tone: Tone) => STYLE[tone].glyph;

/** Etiqueta de estado: pastilla con el glifo del tono (16px) y el nombre del estado. */
export function StatusBadge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full py-0.5 pr-2.5 pl-1.5 text-sm font-medium',
        STYLE[tone].classes,
        className
      )}
    >
      <Icon icon={STYLE[tone].glyph} size={16} />
      {children}
    </span>
  );
}
