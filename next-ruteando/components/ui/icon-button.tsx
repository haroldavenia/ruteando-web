import type { RemixiconComponentType } from '@remixicon/react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from './icon';

const iconButtonVariants = cva(
  'inline-grid size-11 cursor-pointer place-items-center rounded-full transition-colors duration-120 ease-out disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        standard: 'bg-transparent text-on-surface-variant hover:bg-on-surface/8',
        tonal: 'bg-secondary-container text-on-secondary-container hover:brightness-95',
      },
    },
    defaultVariants: { variant: 'standard' },
  }
);

interface IconButtonProps
  extends Omit<ComponentProps<'button'>, 'title' | 'aria-label' | 'children'>, VariantProps<typeof iconButtonVariants> {
  /** Obligatorio: nombre accesible del botón. Se pinta como `title` (tooltip) y `aria-label` (regla del proyecto: todo botón de solo icono lleva `title`). */
  label: string;
  icon: RemixiconComponentType;
}

export function IconButton({ label, icon, variant, className, type, ...props }: IconButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      title={label}
      aria-label={label}
      className={cn(iconButtonVariants({ variant }), className)}
      {...props}
    >
      <Icon icon={icon} />
    </button>
  );
}
