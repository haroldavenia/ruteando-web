import type { ReactNode } from 'react';

/** Título de una pantalla de acceso (Manrope, peso 500 como pide la guía de diseño para estas pantallas). */
export function AccessTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-5 font-brand text-[28px]/9 font-medium tracking-[-0.01em] text-on-surface">{children}</h1>;
}

/** Frase de apoyo bajo el título. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="-mt-3 mb-5 text-base text-on-surface-variant">{children}</p>;
}
