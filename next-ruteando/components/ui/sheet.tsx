'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { RiCloseLine } from '@remixicon/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';

import { IconButton } from './icon-button';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

/**
 * Panel lateral modal (el menú de las pantallas estrechas): mismo comportamiento que un diálogo (foco atrapado, Escape y clic fuera
 * cierran) pero pegado al borde. `title` es obligatorio: Radix lo usa como nombre accesible, y aquí además se ve.
 */
export function SheetContent({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-scrim/40" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-low p-3 text-on-surface outline-none',
          className
        )}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <DialogPrimitive.Title className="font-brand text-lg font-bold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <IconButton label={t('Cerrar')} icon={RiCloseLine} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
