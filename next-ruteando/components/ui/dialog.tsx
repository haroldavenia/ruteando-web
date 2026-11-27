'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { RiCloseLine } from '@remixicon/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';

import { IconButton } from './icon-button';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps {
  /** Obligatorio: Radix lo usa como nombre accesible del diálogo. */
  title: string;
  description?: string;
  className?: string;
  /** Al cerrarse, Radix devuelve el foco a quien abrió el diálogo; en un diálogo controlado (sin disparador) se indica aquí dónde ponerlo. */
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
}

/**
 * Diálogo modal (Radix: foco atrapado y devuelto al cerrar, Escape y clic fuera cierran, el resto de la página queda inerte). Esquina
 * de 24px de la guía de diseño; el botón de cerrar es un `IconButton`, así que lleva `title` y `aria-label`.
 */
export function DialogContent({ title, description, className, onCloseAutoFocus, children }: DialogContentProps) {
  const t = useT();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-scrim/40" />
      <DialogPrimitive.Content
        onCloseAutoFocus={onCloseAutoFocus}
        // Sin descripción se declara explícitamente (si no, Radix avisa en consola); con ella, Radix enlaza la suya
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-1/2 overflow-y-auto rounded-dialog border border-outline-variant bg-surface-container-high p-6 text-on-surface shadow-card outline-none',
          className
        )}
      >
        <DialogPrimitive.Title className="pr-12 font-brand text-[22px]/7 font-bold">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-2 text-sm text-on-surface-variant">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        <div className="mt-4">{children}</div>
        <DialogPrimitive.Close asChild>
          <IconButton label={t('Cerrar')} icon={RiCloseLine} className="absolute top-3 right-3" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
