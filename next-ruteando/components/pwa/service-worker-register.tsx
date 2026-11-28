'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker (`/sw.js`) solo en producción y solo en un contexto seguro (https o localhost): en `next dev` un worker que
 * guarda recursos estorba más que ayuda. No pinta nada.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => undefined);
  }, []);
  return null;
}
