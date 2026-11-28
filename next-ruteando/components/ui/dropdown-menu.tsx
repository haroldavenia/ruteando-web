'use client';

import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

/** Menú desplegable (Radix: teclado con flechas, tipo de letra para saltar, Escape y foco devuelto). */
export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-52 rounded-control border border-outline-variant bg-surface-container-high p-1 text-on-surface shadow-card',
          className
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

/** Entradas de 44px (objetivo táctil) con el resaltado de la guía de diseño. */
export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-primary-container data-highlighted:text-on-primary-container',
        className
      )}
      {...props}
    />
  );
}

/** Grupo de opciones excluyentes (`menuitemradio`): el elegido lleva `data-state="checked"`. */
export const DropdownMenuRadioGroup = DropdownPrimitive.RadioGroup;

export function DropdownMenuRadioItem({ className, ...props }: ComponentProps<typeof DropdownPrimitive.RadioItem>) {
  return (
    <DropdownPrimitive.RadioItem
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm outline-none select-none data-highlighted:bg-primary-container data-highlighted:text-on-primary-container',
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Label>) {
  return (
    <DropdownPrimitive.Label
      className={cn('px-3 py-2 text-xs font-medium text-on-surface-variant', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Separator>) {
  return <DropdownPrimitive.Separator className={cn('my-1 h-px bg-outline-variant', className)} {...props} />;
}
