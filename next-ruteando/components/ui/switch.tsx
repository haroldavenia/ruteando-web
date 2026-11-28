'use client';

import { RiCheckLine, RiSubtractLine } from '@remixicon/react';
import { useId } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from './icon';

/**
 * Interruptor (el `mat-slide-toggle` de Angular): una casilla nativa con `role="switch"` (teclado, lectores de pantalla y formularios de
 * serie) dibujada como pista con un pulgar de 24px que lleva un «−» (apagado) o un «✓» (encendido). El estado no depende solo del color: el
 * pulgar se desplaza y cambia de glifo. Con `hideLabel` el texto solo lo ven los lectores de pantalla (el nombre del interruptor).
 */
export function Switch({
  checked,
  onChange,
  label,
  hideLabel = false,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn('group/switch inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm', className)}
    >
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-8 w-13 flex-none rounded-full border-2 border-outline bg-surface-container-highest transition-colors duration-120 group-has-checked/switch:border-primary group-has-checked/switch:bg-primary group-has-focus-visible/switch:outline-2 group-has-focus-visible/switch:outline-offset-2 group-has-focus-visible/switch:outline-primary group-has-disabled/switch:opacity-50"
      >
        <span className="absolute top-1/2 left-0.5 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-outline text-surface-container-highest transition-all duration-120 group-has-checked/switch:left-5.5 group-has-checked/switch:bg-on-primary group-has-checked/switch:text-primary">
          <Icon icon={RiSubtractLine} size={16} className="group-has-checked/switch:hidden" />
          <Icon icon={RiCheckLine} size={16} className="hidden group-has-checked/switch:block" />
        </span>
      </span>
      <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
    </label>
  );
}
