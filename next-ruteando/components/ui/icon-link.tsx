import type { RemixiconComponentType } from '@remixicon/react';
import Link from 'next/link';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from './icon';

/** Enlace con aspecto de botón de solo icono. Como todo botón de icono, exige `label` (se pinta como `title` y `aria-label`). */
export function IconLink({
  label,
  icon,
  className,
  ...props
}: Omit<ComponentProps<typeof Link>, 'title' | 'aria-label' | 'children'> & {
  label: string;
  icon: RemixiconComponentType;
}) {
  return (
    <Link
      title={label}
      aria-label={label}
      className={cn(
        'inline-grid size-11 place-items-center rounded-full text-on-surface-variant transition-colors duration-120 ease-out hover:bg-on-surface/8',
        className
      )}
      {...props}
    >
      <Icon icon={icon} />
    </Link>
  );
}
