'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Una función estable que siempre llama a la ÚLTIMA versión de `fn`. Sirve para los callbacks que se registran en objetos de fuera de
 * React (interacciones de OpenLayers) y que se crean en un manejador de eventos, donde `useEffectEvent` no se puede llamar.
 */
export function useLatest<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
