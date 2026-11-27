import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

/** Botón con aspecto de enlace (subrayado, color primario) para acciones dentro de un texto: «Reenviar código», «Volver». */
export function LinkButton({ className, type, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type={type ?? 'button'}
      className={cn(
        'cursor-pointer rounded-sm text-primary underline underline-offset-3 disabled:cursor-default disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}
