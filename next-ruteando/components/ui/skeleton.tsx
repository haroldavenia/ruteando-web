'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';

/**
 * Bloque de carga con la forma del contenido (`surface-container-highest`, pulso de 1,4 s, quieto con movimiento reducido). Es solo
 * decorativo: una región `Loading` lo envuelve y avisa UNA vez al lector de pantalla (no un aviso por bloque).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-[pulse_1.4s_ease-in-out_infinite] rounded-lg bg-surface-container-highest motion-reduce:animate-none',
        className
      )}
    />
  );
}

/** Región de carga: anuncia `label` (por defecto «Cargando…») y marca la zona como ocupada. */
export function Loading({ label, className, children }: { label?: string; className?: string; children: ReactNode }) {
  const t = useT();
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label ?? t('Cargando…')}</span>
      {children}
    </div>
  );
}
