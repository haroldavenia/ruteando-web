import type { RemixiconComponentType } from '@remixicon/react';
import type { ReactNode } from 'react';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

import { AccessTitle } from './step';

/** Estado de una cuenta (correo enviado, verificando, enlace no válido): icono en un círculo de color, título y contenido. */
export function StatePanel({
  icon,
  tone = 'primary',
  title,
  children,
}: {
  icon: RemixiconComponentType;
  tone?: 'primary' | 'error';
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <span
        aria-hidden="true"
        className={cn(
          'grid size-14 place-items-center rounded-full',
          tone === 'error'
            ? 'bg-error-container text-on-error-container'
            : 'bg-primary-container text-on-primary-container'
        )}
      >
        <Icon icon={icon} size={28} />
      </span>
      <AccessTitle>{title}</AccessTitle>
      {children}
    </div>
  );
}
