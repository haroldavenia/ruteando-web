import {
  type RemixiconComponentType,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
} from '@remixicon/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from './icon';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

// `danger` y `warning` interrumpen (`role="alert"`); `info` y `success` solo informan (`role="status"`, educado con el lector de pantalla)
const STYLE: Record<AlertTone, { classes: string; glyph: RemixiconComponentType; role: 'alert' | 'status' }> = {
  info: { classes: 'bg-info-container text-on-info-container', glyph: RiInformationLine, role: 'status' },
  success: { classes: 'bg-success-container text-on-success-container', glyph: RiCheckboxCircleLine, role: 'status' },
  warning: { classes: 'bg-warning-container text-on-warning-container', glyph: RiAlertLine, role: 'alert' },
  danger: { classes: 'bg-error-container text-on-error-container', glyph: RiErrorWarningLine, role: 'alert' },
};

/** Aviso en línea (12px de esquina, como los campos): icono del tono y mensaje. */
export function Alert({
  tone = 'info',
  title,
  className,
  children,
}: {
  tone?: AlertTone;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const { classes, glyph, role } = STYLE[tone];
  return (
    <div role={role} className={cn('flex gap-3 rounded-control px-4 py-3 text-sm', classes, className)}>
      <Icon icon={glyph} size={20} className="mt-0.5" />
      <div>
        {title ? <p className="font-medium">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
