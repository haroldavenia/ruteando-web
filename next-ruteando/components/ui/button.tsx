import { Slot } from '@radix-ui/react-slot';
import { RiLoader4Line } from '@remixicon/react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from './icon';

/**
 * Botones de la guía de diseño: 44px de alto (48px `lg`, en acceso e Inicio) y 12px de esquina. El principal lleva el hilo de la marca y
 * solo debe haber UNO por pantalla. Se exporta `buttonVariants` para dar aspecto de botón a un enlace (`<Link className={buttonVariants()}>`).
 */
export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-control px-6 text-sm font-medium no-underline transition-colors duration-120 ease-out disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&>svg:first-child:not(:last-child)]:-ml-1 [&>svg:first-child:not(:last-child)]:size-[18px]',
  {
    variants: {
      variant: {
        primary: 'bg-primary bg-brand-gradient text-on-primary hover:brightness-95',
        tonal: 'bg-secondary-container text-on-secondary-container hover:brightness-95',
        outlined: 'border border-outline bg-transparent text-primary hover:bg-primary/8 disabled:text-on-surface',
        text: 'bg-transparent px-3 text-primary hover:bg-primary/8 disabled:text-on-surface',
        danger: 'bg-error-container text-on-error-container hover:brightness-95',
      },
      size: { md: 'min-h-11', lg: 'min-h-12' },
    },
    defaultVariants: { variant: 'tonal', size: 'md' },
  }
);

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /** Pinta el botón sobre su hijo (un enlace, por ejemplo) en vez de crear un `<button>`. */
  asChild?: boolean;
  /** Envío en curso: bloquea el botón, avisa a los lectores de pantalla (`aria-busy`) y muestra un indicador. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }
  return (
    // `type="button"` por defecto: un botón dentro de un formulario no debe enviarlo sin que se pida (`type="submit"` lo pide)
    <button
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Icon icon={RiLoader4Line} size={18} className="animate-spin motion-reduce:animate-none" /> : null}
      {children}
    </button>
  );
}
