'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * La dirección de la página como única fuente de verdad de una vista (filtros, búsqueda, el evento abierto): se lee con `useSearchParams`
 * y se escribe con el historial del navegador (Next lo sincroniza), SIN pedir otra vez la página al servidor: cada letra de una búsqueda
 * no debe ser una petición. `patch` quita los parámetros con valor `null` y deja el resto; `mode` decide si se añade una entrada al
 * historial (`push`, «atrás» vuelve) o se reescribe la actual (`replace`).
 */
export function useUrlParams() {
  const params = useSearchParams();
  const pathname = usePathname();
  const patch = useCallback(
    (change: Record<string, string | null>, mode: 'push' | 'replace' = 'push') => {
      const next = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(change)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      const url = pathname + (query ? `?${query}` : '') + window.location.hash;
      if (url === pathname + window.location.search + window.location.hash) return;
      if (mode === 'push') window.history.pushState(window.history.state, '', url);
      else window.history.replaceState(window.history.state, '', url);
    },
    [pathname]
  );
  return { params, patch };
}
