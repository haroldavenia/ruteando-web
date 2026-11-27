'use client';

import { useId } from 'react';

import { cn } from '@/lib/cn';

/**
 * Interruptor: una casilla nativa con `role="switch"` (teclado, lectores de pantalla y formularios de serie) dibujada como pista con un
 * pulgar. El estado no depende solo del color: el pulgar se desplaza.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn('inline-flex min-h-11 cursor-pointer items-center gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-8 w-13 rounded-full border-2 border-outline bg-surface-container-highest transition-colors duration-120 peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-disabled:opacity-50 after:absolute after:top-1/2 after:left-1 after:size-5 after:-translate-y-1/2 after:rounded-full after:bg-outline after:transition-all after:duration-120 peer-checked:after:left-6 peer-checked:after:bg-on-primary"
      />
      <span>{label}</span>
    </label>
  );
}
