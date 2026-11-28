'use client';

import { useSyncExternalStore } from 'react';

import type { ColorScheme } from './map/map-palette';

const QUERY = '(prefers-color-scheme: dark)';

/** Esquema que se ve: el que eligió la persona (`data-theme` en <html>) o, sin elección, el del sistema. */
export function currentScheme(): ColorScheme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === 'dark' || chosen === 'light') return chosen;
  return window.matchMedia(QUERY).matches ? 'dark' : 'light';
}

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', callback);
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => {
    media.removeEventListener('change', callback);
    observer.disconnect();
  };
}

/**
 * Esquema de color efectivo, que sigue en vivo tanto a la elección manual como al sistema. Lo necesitan los mapas, que dibujan en un
 * canvas y no entienden `light-dark()`: repintan sus marcas al cambiar. En el servidor vale «claro».
 */
export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, currentScheme, () => 'light');
}
