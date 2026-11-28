'use client';

import { useCallback, useSyncExternalStore } from 'react';

const EVENT = 'ruteando-pref';

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : fallback;
  } catch {
    return fallback; // almacenamiento bloqueado (modo privado, políticas del navegador)
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}

/**
 * Preferencia de la persona guardada en `localStorage` (densidad, vista de la lista). En el servidor y durante la hidratación vale el valor
 * por defecto, y después el guardado: sin avisos de hidratación y sin tocar `window` en el render. Un valor guardado que no esté en
 * `allowed` se ignora.
 */
export function useStoredPref<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, allowed, fallback),
    () => fallback
  );
  const set = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // sin almacenamiento: la preferencia vale hasta recargar
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key]
  );
  return [value, set] as const;
}
